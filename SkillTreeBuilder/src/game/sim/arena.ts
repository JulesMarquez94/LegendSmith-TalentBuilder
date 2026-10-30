import { int } from '../format.ts'
import { comboStrength, matches, spendStrength, tickAmount, type Kit, type ResolvedProc } from '../resolve.ts'
import { RUN_SPEED } from '../stats.ts'
import type {
  Action,
  BuffSpec,
  CharStats,
  Condition,
  Conditional,
  EventKind,
  Match,
  ModMechanic,
  ResolvedAbility,
  ResolvedEffect,
  Tag,
  TargetRule,
} from '../types.ts'
import { Decks } from './deck.ts'
import { ARENA, type AllyRole, type Scenario, type ScenarioEvent, type Vec } from './scenarios.ts'

// A small top-down fight for testing a kit: the same resolved numbers the tooltips show, run in
// real time. Positions are in yards. Nothing here knows about named abilities; everything goes
// through effects, events and procs, so new trees work without touching this file.

/** Smart-targeting range for heals that come from talents rather than an ability with its own range. */
const HEAL_RANGE = 40
/** How far minions reach, and procs that hit enemies without a range of their own. */
const ENEMY_RANGE = 40
/** How close to a dash's path an ally must be for path heals. */
const PATH_WIDTH = 3
/** Reservoir never stores more resource than this. */
const RESERVOIR_CAP = 80
/** A shield never grows past this share of its target's health. */
const SHIELD_CAP = 0.5
/** Presses are remembered this long, so a key hit just before a cast ends still goes off (like WoW's spell queue). */
const QUEUE_WINDOW = 0.35
const DASH_TIME = 0.15
/** The buff that shows a teleport's return window. */
const RECALL = 'recall'
/** The buff that counts your fallen minions toward an Overlord's meteor. */
const DOOM = 'impending-doom'
const METEOR_RADIUS = 5
/** How far a bursting DoT's splash reaches (Rot Bomb). */
const BURST_RADIUS = 8
/** How far a falling summon's explosion reaches (Corpse Explosion). */
const EXPLODE_RADIUS = 6
/** Most attacks Mounting Fury counts. */
const FURY_STACKS = 10
/** Adds swing at the tank this often. */
const ADD_SWING = 2

// ---------- Geometry ----------

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y)
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const inArena = (p: Vec): Vec => ({ x: clamp(p.x, 1, ARENA.width - 1), y: clamp(p.y, 1, ARENA.height - 1) })

function distToSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = dx * dx + dy * dy
  const t = len === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len, 0, 1)
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy })
}

/** A seeded random generator, so a test run can be replayed. */
function mulberry32(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------- State ----------

export interface Hot {
  key: string
  name: string
  effect: ResolvedEffect
  target: Ally
  amount: number
  interval: number
  /** Full length, for the frame's timer. */
  duration: number
  nextTick: number
  endsAt: number
  /** When it would end with no extensions, for talents that cap how far they extend it. */
  baseEnd: number
  tick: number
  /** 1 once it has jumped (Wandering Seed), so it never jumps again. */
  generation: number
  depth: number
}

/** Your damage over time on an enemy. */
export interface Dot {
  key: string
  name: string
  effect: ResolvedEffect
  target: Enemy
  amount: number
  interval: number
  duration: number
  nextTick: number
  endsAt: number
  baseEnd: number
  tick: number
  depth: number
  /** For rolling DoTs, each stack's own end time; ticks hit once per live stack. Empty otherwise. */
  stacks: number[]
  /** Stacks of a stacking DoT (Festering Wound); 1 for an ordinary one. */
  count: number
}

export interface Shield {
  key: string
  name: string
  /** Its ability's tint, for the meter. */
  color: string
  amount: number
  endsAt: number
}

export interface Zone {
  id: number
  /** The same for every zone one ability places, so a second one goes to someone else. */
  key: string
  name: string
  effect: ResolvedEffect
  /** Hurts enemies inside instead of healing allies. */
  hostile: boolean
  pos: Vec
  anchor: Ally | null
  anchorEnemy: Enemy | null
  radius: number
  amount: number
  interval: number
  duration: number
  nextTick: number
  endsAt: number
  /** When it would end with no extensions, for talents that cap how far they extend it. */
  baseEnd: number
  tick: number
  damageReduction: number
  depth: number
}

export interface Hazard {
  id: number
  name: string
  pos: Vec
  radius: number
  armAt: number
  endsAt: number
  dps: number
  nextTick: number
}

export interface Ally {
  id: number
  name: string
  role: AllyRole
  isPlayer: boolean
  maxHp: number
  hp: number
  alive: boolean
  pos: Vec
  home: Vec
  dest: Vec | null
  /** When a bot will notice it's standing in a pool and walk out. */
  reactAt: number | null
  hots: Hot[]
  shields: Shield[]
  dps: number
}

export interface Enemy {
  id: number
  name: string
  pos: Vec
  radius: number
  maxHp: number
  hp: number
  alive: boolean
  isBoss: boolean
  dots: Dot[]
  /** Your curses on it, each with stacks your minions take. */
  curses: Curse[]
  /** Adds hit the tank for this every couple of seconds. */
  hits: number
  swingAt: number
  /** Until then it attacks only you (taunts). */
  tauntedUntil: number
}

/** A curse on an enemy: each hit from your minions takes a stack and deals the curse's damage. */
export interface Curse {
  key: string
  name: string
  effect: ResolvedEffect
  stacks: number
  endsAt: number
  depth: number
}

/** One of your minions. Each point of a minion resource is one of these. */
export interface Imp {
  id: number
  angle: number
  nextAttack: number
  /** When it leaves. Spells sacrifice the imp with the least time left first. */
  endsAt: number
}

/** A minion an ability raised (a ghoul): it fights on its own until its time runs out. */
export interface Summon {
  id: number
  /** Attacks made so far, up to 10: each one adds its Mounting Fury. */
  attacks: number
  /** Minion attack-speed buffs (`tickRate`) and your ultimate's haste when it was raised, already in its pace. */
  tick0: number
  ultHaste0: number
  /** The same for every one of a kind, so `max` counts them. */
  key: string
  name: string
  effect: ResolvedEffect
  endsAt: number
  nextAttack: number
  angle: number
  depth: number
}

export interface ActiveBuff {
  id: string
  name: string
  duration: number
  endsAt: number
  stats: Partial<CharStats>
  mods: readonly ModMechanic[]
  consumeOn?: Match
  /** Lost when you use an ability that doesn't match this. */
  lostUnless?: Match
  /** Its stats and mods count once per stack. */
  stacks: number
  /** Your whole group gets its stats. */
  group: boolean
  /** It came from your ultimate (Dark Patron gives its haste to the Overlord). */
  ultimate?: boolean
}

/** The tags a `gain` event carries, so talents can aim at it with 'resource'. */
const GAIN_TAGS: ReadonlySet<Tag> = new Set<Tag>(['resource'])
/** The tags a `parry` event carries. */
const PARRY_TAGS: ReadonlySet<Tag> = new Set<Tag>(['parry'])
/** The tags a `second` event carries. */
const SECOND_TAGS: ReadonlySet<Tag> = new Set<Tag>(['second'])
/** The tags a `sacrifice` event carries. */
const SACRIFICE_TAGS: ReadonlySet<Tag> = new Set<Tag>(['sacrifice'])
/** The tags a `moving` event carries. */
const MOVING_TAGS: ReadonlySet<Tag> = new Set<Tag>(['moving'])

/** Resource given back a second at a time (Barbed Arrows), from the `trickle` action. */
interface Trickle {
  name: string
  /** It stops if this enemy dies. */
  enemy?: Enemy
  /** Points still to give, shared evenly over the ticks left. */
  left: number
  ticksLeft: number
  nextAt: number
}

export interface Casting {
  slot: number
  ability: ResolvedAbility
  cost: number
  /** Steps of its cost it paid for (combo weapons); 1 otherwise. */
  steps: number
  start: number
  end: number
  castId: number
}

export interface Cooldown {
  charges: number
  max: number
  duration: number
  /** When the next charge comes back; null when full. */
  rechargeAt: number | null
}

export interface MeterRow {
  name: string
  color: string
  healing: number
  overheal: number
  hits: number
  crits: number
}

export interface DamageRow {
  name: string
  color: string
  damage: number
  hits: number
  crits: number
}

export type Fx =
  | { kind: 'text'; pos: Vec; text: string; color: string; big: boolean; born: number; life: number; dx: number }
  | { kind: 'beam'; from: Vec; to: Vec; color: string; born: number; life: number }
  | { kind: 'ring'; pos: Vec; radius: number; color: string; born: number; life: number }

export interface LogLine {
  t: number
  text: string
  kind: 'cast' | 'proc' | 'boss' | 'death' | 'info'
}

export interface ArenaInput {
  /** Movement direction from WASD; doesn't need to be normalised. */
  move: Vec
  /** The crosshair, in arena yards. */
  aim: Vec | null
  /** Slots whose key is held: they go off again as soon as they can. */
  held: ReadonlySet<number>
}

export interface ArenaOptions {
  /** Multiplies every hit the boss, adds and pools deal. */
  damageScale: number
  /** Allies (and you) stop at 1 health. */
  noDeaths: boolean
  seed: number
}

/** Who did what, passed down from a cast to its effects and on to procs. */
interface CastContext {
  castId: number
  ability: ResolvedAbility | null
  cost: number
  /** Steps of its cost the cast paid for (combo weapons); 1 otherwise. */
  steps: number
  origin: Vec
  path: [Vec, Vec] | null
  /** Who the latest effect landed on, for 'same'. */
  primary: Ally[]
  eventTarget?: Ally
  eventEnemy?: Enemy
  /** 0 for a cast; each proc adds one. Procs stop at 2 so they can't feed each other forever. */
  depth: number
  range: number
  /** The HoT, DoT or zone whose tick this is, for talents that extend it. */
  sourceHot?: Hot
  sourceDot?: Dot
  sourceZone?: Zone
  /** How many enemies the hit's cast struck (Lone Reaper's "only one enemy"). */
  victims?: number
}

interface GameEvent {
  kind: EventKind
  tags: ReadonlySet<Tag>
  ctx: CastContext
  target?: Ally
  enemy?: Enemy
  amount?: number
  overheal?: number
  crit?: boolean
  /** Target health fraction before the heal or hit. */
  before?: number
  hot?: Hot
  dot?: Dot
  zone?: Zone
  /** The effect that hit (for talents that hit again with a share of it). */
  effect?: ResolvedEffect
}

interface HitOptions {
  label: string
  /** An amount taken from another event (a share of a heal or overheal): no crit, no conditional bonuses. */
  fixed?: boolean
  quiet?: boolean
  /** A splash or curse hit: it doesn't splash or set off curses again. */
  secondary?: boolean
}

/** How far a ranged single-target hit splashes (Volley). */
const SPLASH_RADIUS = 8

export type UseResult = 'ok' | 'busy' | string

export class Arena {
  time = 0
  kit: Kit
  readonly scenario: Scenario
  readonly options: ArenaOptions
  readonly allies: Ally[] = []
  readonly player: Ally
  /** The boss first, then dummies and adds. */
  enemies: Enemy[] = []
  /** The artifact's resource: mana, imps, combo points. */
  resource: number
  imps: Imp[] = []
  summons: Summon[] = []
  zones: Zone[] = []
  hazards: Hazard[] = []
  buffs: ActiveBuff[] = []
  cast: Casting | null = null
  gcdStart = 0
  gcdUntil = 0
  readonly cooldowns = new Map<string, Cooldown>()
  /** Overhealing stored by Reservoir, as resource. */
  reservoir = 0
  /** Regeneration since the last `gain` event: one fires per 10% of your maximum. */
  private regenPool = 0
  /** True while a `gain` event runs, so a talent that gives resource on a gain can't loop. */
  private gaining = false
  /** When the next `second` event fires. */
  private nextSecond = 1
  private trickles: Trickle[] = []
  /** Time spent moving since the last `moving` event. */
  private movedFor = 0
  /** When each proc with a cooldown can go off again. */
  private readonly procReady = new Map<string, number>()
  /** Fractions of a point each trickle source has built up, given once they make a whole one. */
  private readonly trickleCarry = new Map<string, number>()
  facing: Vec = { x: 0, y: -1 }
  aim: Vec | null = null
  dashing: { from: Vec; to: Vec; start: number } | null = null
  /** Where a teleport with a return window takes you back to, and until when (Recall). */
  recall: { treeId: string; pos: Vec; until: number } | null = null
  /**
   * Fights are written for level 60. At a lower level the boss, its adds, the bots and every hit you
   * take shrink with your Health and power (`levelShare`), so a fight is as hard at any level.
   */
  private readonly share: number
  stackUntil = 0
  ended: 'victory' | 'wipe' | null = null
  notice: { text: string; t: number } | null = null
  readonly meter = {
    rows: new Map<string, MeterRow>(),
    damageRows: new Map<string, DamageRow>(),
    damage: 0,
    damageTaken: 0,
    resourceSpent: new Map<string, number>(),
    resourceGained: new Map<string, number>(),
    casts: new Map<string, number>(),
  }
  log: LogLine[] = []
  fx: Fx[] = []

  private readonly rng: () => number
  /** Every chance (crits, procs, echo, dodge) is dealt from a deck, not rolled: see `Decks`. */
  private readonly decks: Decks
  /** When each ability that goes off on its own (Endless Harvest) goes off next. */
  private readonly autocastAt = new Map<string, number>()
  private nextId = 1
  private castCounter = 0
  private resourceName: string
  private readonly requests = new Map<number, { until: number; fresh: boolean }>()
  private readonly procCounts = new Map<string, number>()
  private readonly refunded = new Set<number>()
  private readonly cycles = new Map<string, number>()
  private readonly schedule: { event: ScenarioEvent; next: number }[]
  /** Group stats the bots had last, so a new build rescales their health. */
  private botHealthPct = 0

  constructor(kit: Kit, scenario: Scenario, options: Partial<ArenaOptions> = {}) {
    this.kit = kit
    this.share = kit.levelShare
    this.scenario = scenario
    this.options = { damageScale: 1, noDeaths: scenario.noDeaths, seed: 1, ...options }
    this.rng = mulberry32(this.options.seed)
    this.decks = new Decks(this.rng)
    this.resourceName = kit.resource
    const youHeal = kit.role === 'healer'
    const party = scenario.party.map((t) => ({ ...t }))
    // A tank takes the first tank's place: you start where it stood, and the boss and its adds hit
    // you. The bot healer, in fights that have one, takes your usual spot so the group keeps its size.
    let home = scenario.playerHome
    const tankSeat = kit.role === 'tank' ? party.findIndex((t) => t.role === 'tank') : -1
    if (tankSeat >= 0) {
      home = party[tankSeat].home
      const maxHp = party.find((t) => t.role !== 'tank')?.maxHp ?? party[tankSeat].maxHp
      if (scenario.botHealer) party[tankSeat] = { name: 'Bot healer', role: 'healer', maxHp, home: scenario.playerHome, dps: 1000 }
      else party.splice(tankSeat, 1)
    }
    this.player = this.makeAlly('You', youHeal ? 'healer' : kit.role, kit.character.stats.health, home, 0, true)
    // A damage dealer brings no healing, so a bot takes the healer's seat.
    if (!youHeal && scenario.botHealer && !party.some((t) => t.role === 'healer')) {
      const seat = [...party].reverse().find((t) => t.role === 'damage')
      if (seat) Object.assign(seat, { name: 'Bot healer', role: 'healer', dps: 1000 })
    }
    for (const t of party) this.makeAlly(t.name, t.role, t.maxHp * this.share, t.home, t.dps * this.share, false)
    this.applyBotHealth()
    for (const a of this.allies) a.hp = a.maxHp * scenario.startHealth
    this.enemies.push(this.makeEnemy(scenario.boss.name, { ...ARENA.boss }, scenario.boss.maxHp, ARENA.bossRadius, true))
    for (const t of scenario.extraEnemies ?? []) {
      this.enemies.push(this.makeEnemy(t.name, t.pos, t.maxHp, t.radius ?? ARENA.addRadius, false))
    }
    this.resource = kit.resourceStart
    const events: ScenarioEvent[] = [...scenario.events]
    if (!youHeal && scenario.botHealer) events.push({ kind: 'healer', ...scenario.botHealer })
    this.schedule = events.map((event) => ({
      event,
      next: 'first' in event && event.first !== undefined ? event.first : 'every' in event ? event.every : 0,
    }))
    this.syncCooldowns()
  }

  /** The boss, first of the enemies. */
  get boss(): Enemy {
    return this.enemies[0]
  }

  private makeAlly(name: string, role: AllyRole, maxHp: number, home: Vec, dps: number, isPlayer: boolean): Ally {
    const ally: Ally = {
      id: this.nextId++,
      name,
      role,
      isPlayer,
      maxHp,
      hp: maxHp,
      alive: true,
      pos: { ...home },
      home: { ...home },
      dest: null,
      reactAt: null,
      hots: [],
      shields: [],
      dps,
    }
    this.allies.push(ally)
    return ally
  }

  private makeEnemy(name: string, pos: Vec, maxHp: number, radius: number, isBoss: boolean, hits = 0): Enemy {
    return {
      id: this.nextId++,
      name,
      pos: { ...pos },
      radius,
      maxHp: maxHp * this.share,
      hp: maxHp * this.share,
      alive: true,
      isBoss,
      dots: [],
      curses: [],
      hits,
      swingAt: this.time + ADD_SWING,
      tauntedUntil: -Infinity,
    }
  }

  // ---------- Build changes ----------

  /** Changes the damage slider or "nobody dies" mid-fight. */
  setOptions(options: Partial<Omit<ArenaOptions, 'seed'>>) {
    Object.assign(this.options, options)
  }

  /** Swaps in a rebuilt kit (gear or talents changed) without restarting the fight. */
  setKit(kit: Kit) {
    const oldMax = this.player.maxHp
    this.kit = kit
    this.player.maxHp = kit.character.stats.health
    this.player.hp = (this.player.hp / oldMax) * this.player.maxHp
    // A different weapon means a different resource: start it afresh.
    if (kit.resource !== this.resourceName) {
      this.resourceName = kit.resource
      this.resource = kit.resourceStart
    }
    this.resource = Math.min(this.resource, this.stats().maxResource)
    this.applyBotHealth()
    if (this.cast && !kit.slots.some((a) => a?.treeId === this.cast!.ability.treeId)) this.cast = null
    this.syncCooldowns()
  }

  /** Bots' maximum health follows the group buff, keeping their health as a share. */
  private applyBotHealth() {
    const pct = this.groupStats().healthPct ?? 0
    if (pct === this.botHealthPct) return
    for (const a of this.allies) {
      if (a.isPlayer) continue
      const frac = a.hp / a.maxHp
      a.maxHp = (a.maxHp / (1 + this.botHealthPct / 100)) * (1 + pct / 100)
      a.hp = a.maxHp * frac
    }
    this.botHealthPct = pct
  }

  private syncCooldowns() {
    for (const a of this.kit.slots) {
      if (!a) continue
      const cd = this.cooldowns.get(a.treeId)
      if (!cd) {
        this.cooldowns.set(a.treeId, { charges: a.charges, max: a.charges, duration: a.cooldown, rechargeAt: null })
        continue
      }
      cd.max = a.charges
      cd.duration = a.cooldown
      cd.charges = Math.min(cd.charges, cd.max)
      if (cd.charges < cd.max && cd.rechargeAt === null) cd.rechargeAt = this.time + cd.duration
    }
  }

  // ---------- Live stats ----------

  /** Character stats with active buffs (Sprint's speed, Fervor's haste…). */
  stats(): CharStats {
    if (this.buffs.length === 0) return this.kit.character.stats
    const s = { ...this.kit.character.stats }
    for (const b of this.buffs) {
      for (const [k, v] of Object.entries(b.stats)) s[k as keyof CharStats] += (v ?? 0) * b.stacks
    }
    return s
  }

  /** What the bots in your group get: your group buff, plus group buffs you have up (Fervor). */
  groupStats(): Partial<CharStats> {
    const s: Partial<CharStats> = { ...this.kit.groupStats }
    for (const b of this.buffs) {
      if (!b.group) continue
      for (const [k, v] of Object.entries(b.stats)) {
        const key = k as keyof CharStats
        s[key] = (s[key] ?? 0) + (v ?? 0) * b.stacks
      }
    }
    return s
  }

  get maxResource() {
    return this.stats().maxResource
  }

  private buffMods(): ModMechanic[] {
    return this.buffs.flatMap((b) =>
      b.stacks === 1
        ? b.mods
        : b.mods.map((m) => ({ ...m, add: m.add && m.add * b.stacks, pct: m.pct && m.pct * b.stacks })),
    )
  }

  /** A slot's ability as it would be cast right now, buffs included. */
  current(slot: number): ResolvedAbility | null {
    const base = this.kit.slots[slot]
    if (!base || this.buffs.length === 0) return base ?? null
    return this.kit.resolve(base.treeId, this.buffMods(), this.stats())
  }

  /** What each minion does right now, buffs (haste) included. */
  private minionNow(): ResolvedEffect | null {
    if (!this.kit.minion) return null
    if (this.buffs.length === 0) return this.kit.minion
    const artifact = this.kit.slots[0]
    return (artifact && this.kit.resolve(artifact.treeId, this.buffMods(), this.stats())?.minion) ?? this.kit.minion
  }

  resourceRegen(): number {
    const s = this.stats()
    const low = this.resource < this.maxResource * 0.3 ? 1 + s.lowResourceRegen / 100 : 1
    const share = s.resourceRegenPct + (this.inZone(this.player) ? s.zoneResourceRegen : 0)
    return s.resourceRegen * low + (share * this.maxResource) / 100
  }

  // ---------- Input ----------

  /** A key press for a slot. It goes off on the next step, or as soon as it can within the queue window. */
  press(slot: number) {
    this.requests.set(slot, { until: this.time + QUEUE_WINDOW, fresh: true })
  }

  // ---------- The loop ----------

  step(dt: number, input: ArenaInput = { move: { x: 0, y: 0 }, aim: null, held: new Set() }) {
    if (this.ended) return
    this.time += dt
    this.aim = input.aim
    this.movePlayer(dt, input)
    this.moveBots(dt)
    if (this.player.alive) this.gainResource(this.resourceRegen() * dt, 'Regeneration', true)
    for (; this.time >= this.nextSecond; this.nextSecond += 1) {
      if (this.player.alive) this.emit({ kind: 'second', tags: SECOND_TAGS, ctx: this.newContext(null, -1, 0) })
    }
    if (this.cast && this.time >= this.cast.end) {
      const c = this.cast
      this.cast = null
      this.finish(c.ability, c.castId, c.cost, input, c.steps)
    }
    this.useRequested(input)
    this.syncImps()
    this.updateImps()
    this.updateSummons()
    this.updateHots()
    this.updateDots()
    this.updateTrickles()
    this.updateAutocasts()
    this.updateZones()
    this.updateTimers()
    this.runScenario(dt)
    this.updateHazards()
    this.updateEnemies(dt)
    this.fx = this.fx.filter((f) => this.time - f.born < f.life).slice(-90)
  }

  private useRequested(input: ArenaInput) {
    for (const [slot, r] of this.requests) if (this.time > r.until) this.requests.delete(slot)
    // Off-GCD abilities first, so a dash mid-cast doesn't wait behind a queued heal. Then the newest
    // press, and held keys (a held main attack) last, so a heal you just pressed beats the attack.
    const pressed = [...this.requests.entries()].sort((a, b) => b[1].until - a[1].until).map(([slot]) => slot)
    const held = [...input.held].filter((slot) => !this.requests.has(slot))
    const gcdOf = (slot: number) => (this.kit.slots[slot]?.gcd === 0 ? 0 : 1)
    const order = [...pressed, ...held].sort((a, b) => gcdOf(a) - gcdOf(b))
    for (const slot of order) {
      const result = this.use(slot, input)
      const request = this.requests.get(slot)
      if (result === 'ok') this.requests.delete(slot)
      else if (request?.fresh) {
        request.fresh = false
        if (result !== 'busy') this.notice = { text: result, t: this.time }
      }
    }
  }

  /** Tries to use a slot's ability now. */
  use(slot: number, input?: ArenaInput): UseResult {
    const base = this.kit.slots[slot]
    if (!base) return 'Nothing playable in that slot'
    if (base.passive) return `${base.name} is passive`
    if (base.autocast > 0) return `${base.name} goes off on its own`
    if (base.effects.every((e) => e.type === 'aura')) return `${base.name} is a group buff: always on`
    if (!this.player.alive) return 'You are dead'
    const offGcd = base.gcd === 0
    if (!offGcd && (this.cast || this.time < this.gcdUntil)) return 'busy'
    if (this.cast && base.notWhileCasting) return `You can't use ${base.name} while casting`
    // Used again inside its return window, a teleport takes you back where you came from, for free.
    if (this.recall?.treeId === base.treeId && this.time < this.recall.until) {
      this.goBack(this.recall.pos)
      return 'ok'
    }
    const cd = this.cooldowns.get(base.treeId)
    if (cd && cd.charges < 1) return `${base.name} isn't ready yet`
    let a = this.current(slot)!
    // You can't cast and move: a cast can't start while you walk, and walking waits for it to end.
    if (a.castTime > 0 && input && Math.hypot(input.move.x, input.move.y) > 0) return "You can't cast while moving"
    const resource = this.kit.resource.toLowerCase()
    if (this.resource + 1e-6 < a.cost) return `Not enough ${resource}`
    if (a.effects.some((e) => e.type === 'restore' && e.tags.has('main-attack')) && this.kit.minion) {
      if (this.resource + 1 > this.maxResource + 1e-6) return `You command as many ${resource} as you can`
    }
    const needsTarget = a.effects.some((e) => this.hitsEnemy(e) && e.target === 'target')
    if (needsTarget && !this.mainTarget(a.range)) return a.range <= 8 ? 'Get closer to an enemy' : 'No enemy in range'
    if (a.effects.some((e) => this.hitsEnemy(e) && e.target === 'afflicted') && !this.afflicted(a.range).length) {
      return 'No enemy has your damage over time'
    }
    if (a.effects.some((e) => e.type === 'bloom') && !this.alliesInRange(a.range).some((t) => this.affected(t))) {
      return 'Nobody has your HoTs or stands in your zones'
    }

    // Buffs that change this cast are used up by it (Surge of Light, Momentum, Latent Charge…), and
    // buffs kept only by one kind of ability (Rapid Fire) are lost to any other.
    this.buffs = this.buffs.filter(
      (b) => !(b.consumeOn && matches(b.consumeOn, a.tags)) && !(b.lostUnless && !matches(b.lostUnless, a.tags)),
    )
    let cost = a.cost
    let steps = 1
    if (a.spendsAll) {
      // It spends everything you have, at least its cost, and grows with every bit past the cost.
      cost = this.resource
      steps = Math.max(1, Math.floor((cost + 1e-6) / a.cost))
      a = this.grow(a, spendStrength(cost, a.cost, a.spendsAll.surplus))
    } else if (a.combo) {
      // A combo weapon pays the cost as many times over as you can afford, and the ability grows with each.
      steps = Math.max(1, Math.floor((this.resource + 1e-6) / a.cost))
      cost = a.cost * steps
      a = this.grow(a, comboStrength(steps, a.combo.perStep))
    }
    this.spend(cost, a.name)
    // Abilities without a cooldown never use up a charge.
    if (cd && cd.duration > 0) {
      cd.charges -= 1
      if (cd.rechargeAt === null) cd.rechargeAt = this.time + cd.duration
    }
    if (!offGcd) {
      this.gcdStart = this.time
      this.gcdUntil = this.time + a.gcd
    }
    const castId = ++this.castCounter
    if (a.castTime > 0) {
      this.cast = { slot, ability: a, cost, steps, start: this.time, end: this.time + a.castTime, castId }
    } else this.finish(a, castId, cost, input, steps)
    return 'ok'
  }

  /** An ability that spent more than its cost: each effect's amount, or its duration, is `k` times as much. */
  private grow(a: ResolvedAbility, k: number): ResolvedAbility {
    if (k <= 1) return a
    const effects = a.effects.map((e) => {
      if (e.grows === 'duration') {
        const duration = e.duration * k
        return { ...e, duration, ticks: e.interval > 0 ? Math.floor(duration / e.interval + 1e-6) : 0 }
      }
      // A buff (Frenzy, Volley) grows in its stats.
      const buff = e.buff?.stats && {
        ...e.buff,
        stats: Object.fromEntries(Object.entries(e.buff.stats).map(([stat, v]) => [stat, v * k])),
      }
      return {
        ...e,
        amount: e.amount * k,
        speed: e.speed * k,
        buff: buff ?? e.buff,
        inflicts: e.inflicts && { ...e.inflicts, amount: e.inflicts.amount * k },
      }
    })
    return { ...a, effects }
  }

  private finish(a: ResolvedAbility, castId: number, cost: number, input?: ArenaInput, steps = 1) {
    const ctx = this.newContext(a, castId, cost, 0, steps)
    if (steps > 1) this.text(this.player.pos, `${a.name} ×${steps}`, a.color, false)
    this.meter.casts.set(a.name, (this.meter.casts.get(a.name) ?? 0) + 1)
    if (!a.tags.has('main-attack')) this.addLog(`You cast ${a.name}${steps > 1 ? ` (${steps} steps)` : ''}`, 'cast')
    const effects = this.effectsForCast(a)
    this.runEffects(a, ctx, input, undefined, effects)
    this.emit({ kind: 'cast', tags: a.tags, ctx })
    if (this.decks.draw(`echo:${a.treeId}`, a.echo)) {
      this.addLog(`Echo: ${a.name} goes off again`, 'proc')
      this.runEffects(a, this.newContext(a, castId, cost, 0, steps), input, undefined, effects)
    }
  }

  /** A cycling ability (Plague) uses the next of its own effects each cast, plus anything talents add. */
  private effectsForCast(a: ResolvedAbility): ResolvedEffect[] {
    // Effects for when it goes off on its own (Emanation) never come with a cast.
    if (a.effects.some((e) => e.auto)) a = { ...a, effects: a.effects.filter((e) => !e.auto) }
    if (!a.cycle) return a.effects
    const own = a.effects.filter((e) => e.granted === undefined)
    const i = this.cycles.get(a.treeId) ?? 0
    this.cycles.set(a.treeId, i + 1)
    return [own[i % own.length], ...a.effects.filter((e) => e.granted !== undefined)]
  }

  private newContext(a: ResolvedAbility | null, castId: number, cost: number, depth = 0, steps = 1): CastContext {
    return {
      castId,
      ability: a,
      cost,
      steps,
      origin: { ...this.player.pos },
      path: null,
      primary: [],
      depth,
      range: a?.range || HEAL_RANGE,
    }
  }

  private runEffects(
    a: ResolvedAbility,
    ctx: CastContext,
    input?: ArenaInput,
    forceTarget?: TargetRule,
    effects: readonly ResolvedEffect[] = a.effects,
  ) {
    for (const e of effects) {
      this.applyEffect(forceTarget ? { ...e, target: forceTarget } : e, ctx, { label: e.name ?? a.name }, input)
    }
  }

  // ---------- Effects ----------

  private hitsEnemy(e: ResolvedEffect) {
    return e.type === 'damage' || e.type === 'dot' || e.type === 'curse' || (e.type === 'zone' && !!e.hostile)
  }

  private applyEffect(e: ResolvedEffect, ctx: CastContext, opts: HitOptions, input?: ArenaInput) {
    switch (e.type) {
      case 'heal': {
        const targets = this.pick(e.target, ctx, e, e.targets)
        for (const t of targets) this.heal(t, e.amount, e, ctx, opts)
        if (targets.length) ctx.primary = targets
        if (e.target === 'all') this.ring(this.player.pos, ctx.range, e.color)
        break
      }
      case 'chain': {
        const starts = this.pick(e.target, ctx, e, e.targets)
        for (const start of starts) {
          const hit = new Set<Ally>([start])
          this.beam(this.player.pos, start.pos, e.color)
          this.heal(start, e.amount, e, ctx, opts)
          let from = start
          for (let jump = 1; jump <= e.bounces; jump++) {
            const next = this.byHealth(
              this.allies.filter((x) => x.alive && !hit.has(x) && dist(from.pos, x.pos) <= e.radius),
            )[0]
            if (!next) break
            hit.add(next)
            this.beam(from.pos, next.pos, e.color)
            this.heal(next, e.amount * (1 - e.falloff / 100) ** jump, e, ctx, opts)
            from = next
          }
        }
        if (starts.length) ctx.primary = starts
        break
      }
      case 'bloom': {
        const healed: Ally[] = []
        for (const t of this.byHealth(this.alliesInRange(ctx.range).filter((x) => this.affected(x)))) {
          if (e.extraCost > 0) {
            if (this.resource + 1e-6 < e.extraCost) break
            this.spend(e.extraCost, opts.label)
          }
          this.ring(t.pos, 2.5, e.color)
          this.heal(t, e.amount, e, ctx, opts)
          healed.push(t)
        }
        ctx.primary = healed
        break
      }
      case 'hot': {
        const targets = this.pick(e.target, ctx, e, e.targets)
        for (const t of targets) this.applyHot(t, e, ctx, opts.label)
        if (targets.length && e.target !== 'same') ctx.primary = targets
        break
      }
      case 'zone':
        this.spawnZone(e, ctx, opts.label)
        break
      case 'shield':
        for (const t of this.pick(e.target, ctx, e, e.targets)) this.addShield(t, e, opts.label)
        break
      case 'damage':
        this.dealDamage(e, ctx, opts)
        break
      case 'dot':
        for (const enemy of this.pickEnemies(e.target, ctx, e)) this.applyDot(enemy, e, ctx, opts.label)
        break
      case 'restore':
        this.gainResource(e.restore, opts.label)
        if (e.tags.has('main-attack') && this.reservoir > 0) {
          this.gainResource(this.reservoir, 'Reservoir')
          this.reservoir = 0
        }
        break
      case 'move':
        this.moveBy(e, ctx, input)
        break
      case 'buff':
        if (e.buff) {
          const stats = e.buff.stats?.speed !== undefined ? { ...e.buff.stats, speed: e.speed } : (e.buff.stats ?? {})
          this.addBuff({ ...e.buff, stats, duration: e.duration }, false, ctx.ability?.kind === 'cooldown')
        }
        break
      case 'summon':
        this.summon(e, ctx, opts.label)
        break
      case 'curse':
        for (const enemy of this.pickEnemies(e.target, ctx, e)) this.applyCurse(enemy, e, ctx, opts.label)
        break
      case 'minion':
      case 'aura':
        break
    }
  }

  /** Direct damage: to the target (and everyone within its radius), around you, or to every afflicted enemy. */
  private dealDamage(e: ResolvedEffect, ctx: CastContext, opts: HitOptions) {
    const victims = this.pickEnemies(e.target, ctx, e)
    if (e.radius > 0 && e.target !== 'afflicted') {
      const center = e.target === 'self' ? this.player.pos : victims[0]?.pos
      if (center) this.ring(center, e.radius, e.color)
    }
    // Splash (Volley): a ranged hit on one target also hits everyone close to it, for a share.
    const volley = e.radius === 0 && e.target === 'target' && ctx.range > 8 && !opts.secondary ? this.stats().splash : 0
    // An effect's own splash (Harvest's talents), more when the cast hits only one enemy.
    const own = opts.secondary ? 0 : e.splash * (victims.length === 1 ? 1 + e.soloSplash / 100 : 1)
    const hitCtx = { ...ctx, victims: victims.length }
    for (const enemy of victims) {
      if (e.target !== 'self') this.beam(this.player.pos, enemy.pos, e.color)
      if (e.taunt > 0 && enemy.alive) this.taunt(enemy, e.taunt)
      const per = e.perEffect ? this.countEffects(enemy, e.perEffect) : 1
      const dealt = per > 0 ? this.hitEnemy(enemy, e.amount * per, e, hitCtx, opts) : 0
      if (volley > 0 && dealt > 0) this.splashAround(enemy, (dealt * volley) / 100, e, ctx, 'Volley')
      if (own > 0 && dealt > 0) this.splashAround(enemy, (dealt * own) / 100, e, ctx, `${opts.label} splash`)
    }
  }

  /** The enemy attacks only you for a while: its swings land on you, not on its tank. */
  private taunt(enemy: Enemy, seconds: number) {
    if (enemy.tauntedUntil <= this.time) this.text(enemy.pos, 'Taunted', '#ffb347', false)
    enemy.tauntedUntil = Math.max(enemy.tauntedUntil, this.time + seconds)
  }

  /** Who an enemy swings at: you while it's taunted, otherwise its tank. */
  private swingTarget(enemy: Enemy, tank: Ally | undefined): Ally | undefined {
    return enemy.tauntedUntil > this.time && this.player.alive ? this.player : tank
  }

  /** Volley's extra hits, tagged 'splash' and 'aoe' so talents can aim at them. */
  private splashAround(center: Enemy, amount: number, e: ResolvedEffect, ctx: CastContext, label: string) {
    const near = this.enemies.filter((x) => x.alive && x !== center && dist(x.pos, center.pos) <= SPLASH_RADIUS + x.radius)
    if (!near.length) return
    this.ring(center.pos, SPLASH_RADIUS, e.color)
    const tags = new Set([...e.tags, 'splash', 'aoe'])
    for (const x of near) this.hitEnemy(x, amount, { ...e, tags }, ctx, { label, fixed: true, quiet: true, secondary: true })
  }

  private heal(target: Ally, base: number, e: ResolvedEffect, ctx: CastContext, opts: HitOptions) {
    if (!target.alive) return
    let amount = base
    let crit = false
    if (!opts.fixed) {
      let bonus = 0
      for (const c of e.conditionals) bonus += this.allyBonus(c, target)
      amount *= 1 + bonus / 100
      crit = this.decks.draw(`crit:${e.key}`, e.critChance)
      if (crit) amount *= e.critMultiplier
    }
    const received = target.isPlayer ? this.stats().healingTaken : (this.groupStats().healingTaken ?? 0)
    amount *= 1 + received / 100
    const before = target.hp / target.maxHp
    const effective = Math.min(amount, target.maxHp - target.hp)
    const overheal = amount - effective
    target.hp += effective

    const row = this.meter.rows.get(opts.label) ?? { name: opts.label, color: e.color, healing: 0, overheal: 0, hits: 0, crits: 0 }
    row.healing += effective
    row.overheal += overheal
    row.hits += 1
    if (crit) row.crits += 1
    this.meter.rows.set(opts.label, row)
    const stored = this.stats().overhealToResource
    if (overheal > 0 && stored > 0) this.reservoir = Math.min(RESERVOIR_CAP, this.reservoir + (overheal * stored) / 100)
    if (!opts.quiet) this.text(target.pos, `+${int(amount)}${crit ? '!' : ''}`, e.color, crit || e.family === 'direct-heal')

    const ev: GameEvent = { kind: 'heal', tags: e.tags, ctx, target, amount: effective, overheal, crit, before }
    this.emit(ev)
    if (crit) this.emit({ ...ev, kind: 'crit' })
  }

  /** Every hit you land on an enemy: direct damage, DoT ticks, minion attacks, damaging zones. */
  private hitEnemy(enemy: Enemy, base: number, e: ResolvedEffect, ctx: CastContext, opts: HitOptions): number {
    if (!enemy.alive) return 0
    let amount = base
    let crit = false
    if (!opts.fixed) {
      let bonus = 0
      for (const c of e.conditionals) bonus += this.enemyBonus(c, enemy, ctx)
      // Minion power: more damage for each minion you command.
      amount *= (1 + bonus / 100) * (1 + (this.stats().minionPower * (this.imps.length + this.summons.length)) / 100)
      // An Overlord's presence: more damage for every other minion.
      if (e.family === 'minion' && e.empower <= 0) amount *= 1 + this.lordSum('empower') / 100
      crit = this.decks.draw(`crit:${e.key}`, e.critChance)
      if (crit) amount *= e.critMultiplier
    }
    const before = enemy.hp / enemy.maxHp
    if (Number.isFinite(enemy.hp)) enemy.hp -= amount
    this.meter.damage += amount
    const row = this.meter.damageRows.get(opts.label) ?? { name: opts.label, color: e.color, damage: 0, hits: 0, crits: 0 }
    row.damage += amount
    row.hits += 1
    if (crit) row.crits += 1
    this.meter.damageRows.set(opts.label, row)
    if (!opts.quiet) {
      const big = crit || e.family === 'direct-damage'
      this.text(enemy.pos, `${int(amount)}${crit ? '!' : ''}`, e.family === 'dot' ? e.color : '#ffd23f', big)
    }
    const ev: GameEvent = { kind: 'hit', tags: e.tags, ctx: { ...ctx, eventEnemy: enemy }, enemy, amount, crit, before, effect: e }
    this.emit(ev)
    if (crit) this.emit({ ...ev, kind: 'crit' })
    if (enemy.hp <= 0) this.killEnemy(enemy)
    if (e.family === 'minion' && !opts.secondary) this.setOffCurse(enemy)
    return amount
  }

  /** A minion's hit takes a stack of your curse on the enemy and deals the curse's damage. */
  private setOffCurse(enemy: Enemy) {
    const c = enemy.curses[0]
    if (!c || !enemy.alive) return
    // Undying Hex: now and then a stack bursts and stays.
    if (!(c.effect.keepChance > 0 && this.decks.draw(`keep:${c.key}`, c.effect.keepChance))) {
      c.stacks -= 1
      if (c.stacks <= 0) this.endCurse(enemy, c)
    }
    const ctx = this.curseContext(c, enemy)
    const dealt = this.hitEnemy(enemy, c.effect.amount, c.effect, ctx, { label: c.name, quiet: true, secondary: true })
    if (c.effect.splash > 0 && dealt > 0) {
      // Without 'debuff', so talents fed by taken stacks don't go off again for every enemy it splashes.
      const tags = new Set([...c.effect.tags].filter((t) => t !== 'debuff'))
      this.splashAround(enemy, (dealt * c.effect.splash) / 100, { ...c.effect, tags }, ctx, `${c.name} splash`)
    }
  }

  private endCurse(enemy: Enemy, c: Curse) {
    enemy.curses = enemy.curses.filter((x) => x !== c)
    if (enemy.alive) this.emit({ kind: 'expire', tags: c.effect.tags, ctx: this.curseContext(c, enemy), enemy })
  }

  private curseContext(c: Curse, enemy: Enemy): CastContext {
    return { ...this.newContext(null, -1, 0, c.depth), eventEnemy: enemy, range: ENEMY_RANGE }
  }

  private applyCurse(enemy: Enemy, e: ResolvedEffect, ctx: CastContext, name: string) {
    if (!enemy.alive || e.duration <= 0) return
    const c = enemy.curses.find((x) => x.key === e.key)
    if (c) Object.assign(c, { effect: e, stacks: e.stacks, endsAt: this.time + e.duration })
    else enemy.curses.push({ key: e.key, name, effect: e, stacks: e.stacks, endsAt: this.time + e.duration, depth: ctx.depth })
  }

  private killEnemy(enemy: Enemy) {
    if (!enemy.alive) return
    enemy.alive = false
    enemy.hp = 0
    enemy.dots = []
    enemy.curses = []
    this.ring(enemy.pos, enemy.radius + 1, '#ff6b6b')
    if (enemy.isBoss) {
      this.ended = 'victory'
      this.addLog(`${enemy.name} is defeated`, 'info')
    }
  }

  private applyHot(target: Ally, e: ResolvedEffect, ctx: CastContext, name: string, generation = 0) {
    if (!target.alive || e.duration <= 0 || e.interval <= 0) return
    let hot = target.hots.find((h) => h.key === e.key)
    if (hot) {
      Object.assign(hot, { effect: e, amount: e.amount, interval: e.interval, duration: e.duration, tick: 0 })
      hot.endsAt = this.time + e.duration
      hot.baseEnd = hot.endsAt
    } else {
      hot = {
        key: e.key,
        name,
        effect: e,
        target,
        amount: e.amount,
        interval: e.interval,
        duration: e.duration,
        nextTick: this.time + e.interval,
        endsAt: this.time + e.duration,
        baseEnd: this.time + e.duration,
        tick: 0,
        generation,
        depth: ctx.depth,
      }
      target.hots.push(hot)
    }
    for (let i = 0; i < e.instantTicks; i++) this.heal(target, hot.amount, e, this.hotContext(hot), { label: name })
  }

  /**
   * Puts a DoT on an enemy. Ordinary DoTs refresh; stacking ones add a stack up to their cap and
   * refresh them all; rolling ones add stacks that each keep their own timer.
   */
  private applyDot(enemy: Enemy, e: ResolvedEffect, ctx: CastContext, name: string) {
    if (!enemy.alive || e.duration <= 0 || e.interval <= 0) return
    let d = enemy.dots.find((x) => x.key === e.key)
    // A DoT that adds its duration (Barbed Arrows) never stacks: it runs longer instead.
    if (d && e.addsDuration) {
      Object.assign(d, { effect: e, amount: e.amount, interval: e.interval })
      d.endsAt = Math.max(d.endsAt, this.time) + e.duration
      d.duration = d.endsAt - this.time
      d.baseEnd = d.endsAt
      return
    }
    if (!d) {
      d = {
        key: e.key,
        name,
        effect: e,
        target: enemy,
        amount: e.amount,
        interval: e.interval,
        duration: e.duration,
        nextTick: this.time + e.interval,
        endsAt: this.time + e.duration,
        baseEnd: this.time + e.duration,
        tick: 0,
        depth: ctx.depth,
        stacks: [],
        count: 0,
      }
      enemy.dots.push(d)
    } else Object.assign(d, { effect: e, amount: e.amount, interval: e.interval, duration: e.duration })
    if (e.rolling) {
      for (let i = 0; i < e.stacks; i++) d.stacks.push(this.time + e.duration)
      d.endsAt = Math.max(...d.stacks)
    } else {
      d.count = e.maxStacks > 0 ? Math.min(e.maxStacks, d.count + e.stacks) : 1
      d.endsAt = this.time + e.duration
      d.tick = 0
    }
    d.baseEnd = d.endsAt
  }

  private hotContext(h: Hot): CastContext {
    return { ...this.newContext(null, -1, 0, h.depth), primary: [h.target], eventTarget: h.target, sourceHot: h }
  }

  private dotContext(d: Dot): CastContext {
    return { ...this.newContext(null, -1, 0, d.depth), eventEnemy: d.target, sourceDot: d, range: ENEMY_RANGE }
  }

  private spawnZone(e: ResolvedEffect, ctx: CastContext, name: string) {
    let anchor: Ally | null = null
    let anchorEnemy: Enemy | null = null
    let pos: Vec | undefined
    if (e.hostile) {
      anchorEnemy = (e.target === 'event' ? ctx.eventEnemy : this.mainTarget(ctx.range)) ?? null
      pos = anchorEnemy?.pos
    } else if (e.target === 'origin') pos = ctx.origin
    else if (e.target === 'self') anchor = this.player
    else if (e.target === 'event') anchor = ctx.eventTarget ?? null
    else if (e.target === 'lowest-missing') {
      // Never two of the same zone on one ally: the next goes to the most injured ally not already in one.
      const pool = this.byHealth(this.alliesInRange(ctx.range))
      anchor = pool.find((a) => !this.zones.some((z) => z.key === e.key && dist(z.pos, a.pos) <= z.radius)) ?? pool[0] ?? null
    } else anchor = this.pick('lowest', ctx, e, 1)[0] ?? null
    pos = pos ?? anchor?.pos
    if (!pos || e.duration <= 0 || e.interval <= 0) return
    this.zones.push({
      id: this.nextId++,
      key: e.key,
      name,
      effect: e,
      hostile: !!e.hostile,
      pos: { ...pos },
      anchor: e.follow ? anchor : null,
      anchorEnemy: e.follow ? anchorEnemy : null,
      radius: e.radius,
      amount: e.amount,
      interval: e.interval,
      duration: e.duration,
      nextTick: this.time + e.interval,
      endsAt: this.time + e.duration,
      baseEnd: this.time + e.duration,
      tick: 0,
      damageReduction: e.damageReduction,
      depth: ctx.depth,
    })
  }

  private addShield(target: Ally, e: ResolvedEffect, name: string) {
    if (!target.alive || e.amount <= 0) return
    const cap = target.maxHp * SHIELD_CAP
    const existing = target.shields.find((s) => s.key === e.key)
    if (existing) {
      existing.amount = Math.min(cap, existing.amount + e.amount)
      existing.endsAt = this.time + e.duration
    } else {
      target.shields.push({ key: e.key, name, color: e.color, amount: Math.min(cap, e.amount), endsAt: this.time + e.duration })
    }
  }

  /** Talent buffs get Potency here; buff effects (Sprint) already have it, so they pass `potency: false`. */
  private addBuff(spec: BuffSpec, potency = true, ultimate = false) {
    const duration = potency ? spec.duration * (1 + this.stats().potency / 100) : spec.duration
    const existing = this.buffs.find((b) => b.id === spec.id)
    const stacks = existing ? Math.min(spec.maxStacks ?? 1, existing.stacks + 1) : 1
    this.buffs = this.buffs.filter((b) => b !== existing)
    this.buffs.push({
      id: spec.id,
      name: spec.name,
      duration,
      endsAt: existing && spec.keepsTimer ? existing.endsAt : this.time + duration,
      stats: spec.stats ?? {},
      mods: spec.mods ?? [],
      consumeOn: spec.consumeOn,
      lostUnless: spec.lostUnless,
      stacks,
      group: !!spec.group,
      ultimate,
    })
  }

  private moveBy(e: ResolvedEffect, ctx: CastContext, input?: ArenaInput) {
    const p = this.player
    let dir = input && Math.hypot(input.move.x, input.move.y) > 0 ? input.move : null
    if (!dir && input?.aim && dist(input.aim, p.pos) > 0.5) dir = { x: input.aim.x - p.pos.x, y: input.aim.y - p.pos.y }
    dir = dir ?? this.facing
    const len = Math.hypot(dir.x, dir.y) || 1
    const from = { ...p.pos }
    const to = inArena({ x: from.x + (dir.x / len) * e.distance, y: from.y + (dir.y / len) * e.distance })
    ctx.origin = from
    ctx.path = [from, to]
    this.facing = { x: dir.x / len, y: dir.y / len }
    if (e.mode === 'teleport') {
      p.pos = to
      this.ring(from, 1.5, '#b79cff')
      this.ring(to, 1.5, '#b79cff')
      if (e.returnWindow > 0 && ctx.ability) {
        this.recall = { treeId: ctx.ability.treeId, pos: from, until: this.time + e.returnWindow }
        // Shown with your buffs, so you can see how long you have to go back.
        this.addBuff({ id: RECALL, name: 'Recall', duration: e.returnWindow }, false)
      }
    } else this.dashing = { from, to, start: this.time }
    this.beam(from, to, '#c6d0ff')
  }

  /** Recall: back to where the last teleport started. */
  private goBack(to: Vec) {
    const p = this.player
    const from = { ...p.pos }
    p.pos = to
    this.dashing = null
    this.recall = null
    this.buffs = this.buffs.filter((b) => b.id !== RECALL)
    this.ring(from, 1.5, '#b79cff')
    this.ring(to, 1.5, '#b79cff')
    this.beam(from, to, '#c6d0ff')
  }

  // ---------- Events and procs ----------

  private emit(ev: GameEvent) {
    if (ev.ctx.depth >= 2) return
    for (const a of this.kit.slots) {
      if (a?.passive && a.passive.on === ev.kind && matches(a.passive.match, ev.tags)) {
        this.runEffects(a, this.childContext(ev, a))
      }
    }
    this.kit.procs.forEach((rp, i) => {
      const p = rp.proc
      if (p.on !== ev.kind || !matches(p.match, ev.tags)) return
      if (p.when && !this.eventMeets(p.when, ev)) return
      if (p.every) {
        const key = `${rp.source.treeId}/${rp.source.talentId}/${i}`
        const n = (this.procCounts.get(key) ?? 0) + 1
        this.procCounts.set(key, n)
        if (n % p.every !== 0) return
      }
      const key = `${rp.source.treeId}/${rp.source.talentId}/${i}`
      if (p.cooldown && this.time < (this.procReady.get(key) ?? -Infinity)) return
      if (p.chance !== undefined && !this.decks.draw(key, p.chance)) return
      if (p.cooldown) this.procReady.set(key, this.time + p.cooldown)
      for (const action of p.actions) this.act(action, rp, ev)
    })
  }

  private childContext(ev: GameEvent, ability: ResolvedAbility | null): CastContext {
    return {
      ...ev.ctx,
      ability: ability ?? ev.ctx.ability,
      primary: ev.target ? [ev.target] : [],
      eventTarget: ev.target,
      eventEnemy: ev.enemy ?? ev.ctx.eventEnemy,
      depth: ev.ctx.depth + 1,
      range: ability?.range || HEAL_RANGE,
    }
  }

  private act(action: Action, rp: ResolvedProc, ev: GameEvent) {
    const name = rp.source.talentName
    const ctx = this.childContext(ev, null)
    switch (action.do) {
      case 'restore':
        this.gainResource((action.amount ?? 0) + ((action.pctMax ?? 0) * this.maxResource) / 100, name)
        break
      case 'refund':
        if (ev.ctx.cost > 0 && !this.refunded.has(ev.ctx.castId)) {
          this.refunded.add(ev.ctx.castId)
          this.gainResource((ev.ctx.cost * action.pct) / 100, name)
        }
        break
      case 'apply': {
        const e = this.kit.resolveEffect(rp.tree, action.effect, this.buffMods(), this.stats())
        const label = action.effect.name ?? name
        if (!action.ofEvent) {
          this.applyEffect(e, ctx, { label })
          break
        }
        const from = action.ofEvent.of === 'amount' ? ev.amount : ev.overheal
        const amount = ((from ?? 0) * action.ofEvent.pct) / 100
        if (amount > 0) this.applyEffect({ ...e, amount }, ctx, { label, fixed: true })
        break
      }
      case 'extend': {
        if (action.scope === 'source') {
          const source = ev.ctx.sourceZone ?? ev.ctx.sourceHot ?? ev.ctx.sourceDot
          if (!source || !matches(action.match, source.effect.tags)) break
          if (ev.ctx.sourceDot) this.extendDot(ev.ctx.sourceDot, action.seconds, action.capPct)
          else source.endsAt = this.capped(source, action.seconds, action.capPct)
          break
        }
        const allies =
          action.scope === 'event'
            ? ev.target
              ? [ev.target]
              : []
            : action.scope === 'near'
              ? this.allies.filter((a) => dist(a.pos, this.player.pos) <= (action.radius ?? 10))
              : this.allies
        for (const t of allies) {
          for (const h of t.hots) if (matches(action.match, h.effect.tags)) h.endsAt = this.capped(h, action.seconds, action.capPct)
        }
        const enemies = action.scope === 'event' ? (ev.enemy ? [ev.enemy] : []) : action.scope === 'all' ? this.enemies : []
        for (const t of enemies) {
          for (const d of t.dots) if (matches(action.match, d.effect.tags)) this.extendDot(d, action.seconds, action.capPct)
        }
        if (action.scope === 'all') for (const z of this.zones) if (matches(action.match, z.effect.tags)) z.endsAt += action.seconds
        break
      }
      case 'absorb': {
        const enemy = ev.enemy ?? ev.ctx.eventEnemy
        if (!enemy?.alive || !ev.effect) break
        const seconds = this.absorbEffects(action.match, enemy)
        const amount = ((ev.amount ?? 0) * action.pct * seconds) / 100
        if (amount > 0) this.hitEnemy(enemy, amount, ev.effect, ctx, { label: name, fixed: true, secondary: true })
        break
      }
      case 'trickle': {
        const total = (this.mainAttackGain() * action.pct) / 100
        if (total <= 0 || action.seconds < 1) break
        const enemy = ev.enemy ?? ev.ctx.eventEnemy
        const running = action.extends ? this.trickles.find((t) => t.name === name && t.enemy === enemy) : undefined
        if (running) {
          running.left += total
          running.ticksLeft += action.seconds
        } else this.trickles.push({ name, enemy, left: total, ticksLeft: action.seconds, nextAt: this.time + 1 })
        break
      }
      case 'extendImps':
        for (const imp of this.imps) imp.endsAt += action.seconds
        break
      case 'extendMinions':
        for (const imp of this.imps) imp.endsAt += action.seconds
        for (const s of this.summons) s.endsAt += action.seconds
        break
      case 'extendSummons':
        for (const s of this.summons) if (matches(action.match, s.effect.tags)) s.endsAt += action.seconds
        break
      case 'curseStack': {
        const c = (ev.enemy ?? ev.ctx.eventEnemy)?.curses.find((x) => matches(action.match, x.effect.tags))
        if (c) c.stacks = Math.min(c.effect.stacks, c.stacks + action.stacks)
        break
      }
      case 'oneOf': {
        const pick = action.actions[Math.floor(this.rng() * action.actions.length)]
        if (pick) this.act(pick, rp, ev)
        break
      }
      case 'extendBuff': {
        const b = this.buffs.find((x) => x.id === action.buff)
        if (b) b.endsAt += action.seconds
        break
      }
      case 'cooldown':
        for (const a of this.kit.slots) {
          if (!a || !matches(action.match, a.tags)) continue
          const cd = this.cooldowns.get(a.treeId)
          if (!cd || cd.rechargeAt === null) continue
          if (action.seconds === Infinity) {
            cd.charges = cd.max
            cd.rechargeAt = null
          } else cd.rechargeAt -= action.seconds
        }
        break
      case 'buff':
        this.addBuff(action.buff)
        break
      case 'pulse':
        if (ev.target) {
          for (const h of [...ev.target.hots]) {
            if (!matches(action.match, h.effect.tags)) continue
            const amount = this.tickOf(h) * (action.seconds / h.interval)
            this.heal(ev.target, amount, h.effect, this.hotContext(h), { label: name })
          }
        }
        if (ev.enemy) {
          for (const d of [...ev.enemy.dots]) {
            if (!matches(action.match, d.effect.tags)) continue
            const amount = this.tickOf(d) * this.liveStacks(d) * (action.seconds / d.interval)
            this.hitEnemy(ev.enemy, amount, d.effect, this.dotContext(d), { label: d.name })
          }
        }
        if ((!ev.target && !ev.enemy) || ev.kind === 'cast') {
          for (const z of [...this.zones]) if (matches(action.match, z.effect.tags)) this.zoneBurst(z, action.seconds, name)
        }
        break
      case 'burst':
        if (ev.hot) {
          const h = ev.hot
          this.heal(h.target, this.tickOf(h) * (action.seconds / h.interval), h.effect, this.hotContext(h), { label: name })
        }
        if (ev.dot) {
          const d = ev.dot
          const amount = this.tickOf(d) * this.liveStacks(d) * (action.seconds / d.interval)
          this.hitEnemy(d.target, amount, d.effect, this.dotContext(d), { label: name })
        }
        if (ev.zone) this.zoneBurst(ev.zone, action.seconds, name)
        break
      case 'recast':
        if (ev.ctx.ability) this.runEffects(ev.ctx.ability, { ...ctx, ability: ev.ctx.ability, primary: [], range: ev.ctx.range })
        break
      case 'jump': {
        const h = ev.hot
        if (!h || h.generation > 0) break
        const next = this.byHealth(
          this.allies.filter(
            (a) => a.alive && a !== h.target && dist(a.pos, h.target.pos) <= action.range && !a.hots.some((x) => x.key === h.key),
          ),
        )[0]
        if (next) {
          this.beam(h.target.pos, next.pos, h.effect.color)
          this.applyHot(next, h.effect, this.hotContext(h), h.name, 1)
        }
        break
      }
      case 'spread': {
        const from = ev.enemy
        if (!from) break
        for (const d of from.dots.filter((x) => matches(action.match, x.effect.tags))) {
          const next = this.enemies
            .filter((x) => x.alive && x !== from && dist(x.pos, from.pos) <= action.range && !x.dots.some((y) => y.key === d.key))
            .sort((a, b) => dist(a.pos, from.pos) - dist(b.pos, from.pos))[0]
          if (!next) continue
          this.beam(from.pos, next.pos, d.effect.color)
          this.applyDot(next, d.effect, this.dotContext(d), d.name)
          break
        }
        break
      }
      case 'fire': {
        const a = this.kit.resolve(action.ability, this.buffMods(), this.stats())
        if (a) this.runEffects(a, { ...ctx, ability: a, range: a.range || HEAL_RANGE }, undefined, action.at === 'event' ? 'event' : undefined)
        break
      }
    }
    if (action.do !== 'restore' && action.do !== 'refund') this.addLog(`${name} triggers`, 'proc')
  }

  /** A new end time `seconds` later (or sooner), never past `capPct`% longer than it started. */
  private capped(x: Hot | Dot | Zone, seconds: number, capPct?: number) {
    const cap = capPct === undefined ? Infinity : x.baseEnd + (x.duration * capPct) / 100
    return seconds < 0 ? x.endsAt + seconds : Math.max(x.endsAt, Math.min(cap, x.endsAt + seconds))
  }

  /** Adds or takes away time; rolling stacks all move together. */
  private extendDot(d: Dot, seconds: number, capPct?: number) {
    const shift = this.capped(d, seconds, capPct) - d.endsAt
    d.endsAt += shift
    if (d.stacks.length) d.stacks = d.stacks.map((t) => t + shift)
  }

  /** One tick of a HoT, DoT or zone, after its growth or decay so far. */
  private tickOf(x: Hot | Dot | Zone) {
    return tickAmount({ amount: x.amount, growth: x.effect.growth }, x.tick)
  }

  /**
   * Ends your effects matching this and returns the seconds they had left, added up: DoTs (each live
   * stack) on the enemy, HoTs on your allies, your zones and your summons (which fall, as if killed).
   */
  private absorbEffects(match: Match, enemy: Enemy): number {
    const left = (end: number) => Math.max(0, end - this.time)
    let seconds = 0
    for (const d of enemy.dots.filter((x) => matches(match, x.effect.tags))) {
      seconds += d.stacks.length ? d.stacks.reduce((n, end) => n + left(end), 0) : left(d.endsAt) * d.count
      enemy.dots = enemy.dots.filter((x) => x !== d)
    }
    for (const ally of this.allies) {
      for (const h of ally.hots.filter((x) => matches(match, x.effect.tags))) {
        seconds += left(h.endsAt)
        ally.hots = ally.hots.filter((x) => x !== h)
      }
    }
    for (const z of this.zones.filter((x) => matches(match, x.effect.tags))) {
      seconds += left(z.endsAt)
      this.zones = this.zones.filter((x) => x !== z)
    }
    for (const s of this.summons.filter((x) => matches(match, x.effect.tags))) {
      seconds += left(s.endsAt)
      this.dismiss(s)
    }
    return seconds
  }

  private liveStacks(d: Dot) {
    return d.stacks.length ? d.stacks.filter((t) => t > this.time).length : d.count
  }

  private zoneBurst(z: Zone, seconds: number, label: string) {
    const amount = this.tickOf(z) * (seconds / z.interval)
    this.ring(z.pos, z.radius, z.effect.color)
    if (z.hostile) {
      for (const enemy of this.enemiesIn(z)) {
        if (amount > 0) this.hitEnemy(enemy, amount, z.effect, this.zoneContext(z), { label })
        if (z.effect.inflicts) this.pulseInflicted(enemy, z, seconds, label)
      }
      return
    }
    for (const a of this.allies) {
      if (a.alive && dist(a.pos, z.pos) <= z.radius) this.heal(a, amount, z.effect, this.zoneContext(z), { label })
    }
  }

  /** A burst of a hostile zone whose damage is all in the DoT it inflicts (Miasma): lands that DoT's worth. */
  private pulseInflicted(enemy: Enemy, z: Zone, seconds: number, label: string) {
    const e = z.effect.inflicts!
    this.hitEnemy(enemy, e.amount * (seconds / e.interval), e, this.zoneContext(z), { label })
  }

  private zoneContext(z: Zone): CastContext {
    return { ...this.newContext(null, -1, 0, z.depth), sourceZone: z, range: ENEMY_RANGE }
  }

  // ---------- Conditions and targeting ----------

  /** A conditional bonus on an ally: its %, times how many matching effects for `each` and `stacksOf`. */
  private allyBonus(c: Conditional, target: Ally): number {
    const when = c.when
    if (when.targetBelow !== undefined && (target.hp / target.maxHp) * 100 >= when.targetBelow) return 0
    if (when.targetHas !== undefined && !target.hots.some((h) => matches(when.targetHas!, h.effect.tags))) return 0
    if (when.inZone && !this.inZone(target)) return 0
    if (when.affected && !this.affected(target)) return 0
    if (when.targetSelf && !target.isPlayer) return 0
    if (when.alone) return 0
    let n = 1
    if (when.each) n = target.hots.filter((h) => matches(when.each!, h.effect.tags)).length
    if (when.stacksOf) n = target.hots.filter((h) => matches(when.stacksOf!, h.effect.tags)).length
    return c.pct * n
  }

  /** The same for an enemy, with your DoTs and hostile zones. */
  private enemyBonus(c: Conditional, enemy: Enemy, ctx?: CastContext): number {
    const when = c.when
    if (when.single && ctx?.victims !== 1) return 0
    if (when.alone && this.enemies.filter((x) => x.alive && x.dots.some((d) => matches(when.alone!, d.effect.tags))).length !== 1) {
      return 0
    }
    if (when.targetBelow !== undefined && (enemy.hp / enemy.maxHp) * 100 >= when.targetBelow) return 0
    const has = (m: Match) => enemy.dots.some((d) => matches(m, d.effect.tags)) || enemy.curses.some((c) => matches(m, c.effect.tags))
    if (when.targetHas !== undefined && !has(when.targetHas)) return 0
    if (when.inZone && !this.enemyInZone(enemy)) return 0
    if (when.affected && !(enemy.dots.length > 0 || this.enemyInZone(enemy))) return 0
    if (when.targetSelf || when.overheal) return 0
    let n = 1
    if (when.each) n = this.countEffects(enemy, when.each)
    if (when.stacksOf) {
      n = enemy.dots.filter((d) => matches(when.stacksOf!, d.effect.tags)).reduce((sum, d) => sum + this.liveStacks(d), 0)
    }
    if (when.perMinion) n = this.imps.length + this.summons.filter((x) => x.effect.empower <= 0).length
    return c.pct * n
  }

  /** How many of your DoTs matching this an enemy has (each counts once, whatever its stacks). */
  private countEffects(enemy: Enemy, match: Match) {
    return enemy.dots.filter((d) => matches(match, d.effect.tags)).length
  }

  /** For procs: the same checks against the event, with health from before the heal or hit. */
  private eventMeets(when: Condition, ev: GameEvent): boolean {
    if (when.overheal && !((ev.overheal ?? 0) > 0)) return false
    if (when.paidAtLeast !== undefined && ev.ctx.steps < when.paidAtLeast) return false
    const { overheal: _overheal, paidAtLeast: _paid, targetBelow, ...rest } = when
    const needsTarget = targetBelow !== undefined || Object.values(rest).some((v) => v !== undefined && v !== false)
    if (!needsTarget) return true
    if (!ev.target && !ev.enemy) return false
    if (targetBelow !== undefined && (ev.before ?? 1) * 100 >= targetBelow) return false
    const probe: Conditional = { pct: 1, when: rest, source: '' }
    return ev.target ? this.allyBonus(probe, ev.target) > 0 : this.enemyBonus(probe, ev.enemy!, ev.ctx) > 0
  }

  inZone(a: Ally): boolean {
    return this.zones.some((z) => !z.hostile && dist(z.pos, a.pos) <= z.radius)
  }

  private enemyInZone(enemy: Enemy): boolean {
    return this.zones.some((z) => z.hostile && dist(z.pos, enemy.pos) <= z.radius + enemy.radius)
  }

  private enemiesIn(z: Zone): Enemy[] {
    return this.enemies.filter((e) => e.alive && dist(z.pos, e.pos) <= z.radius + e.radius)
  }

  /** Has one of your HoTs or stands in one of your zones (Bloom's targets). */
  affected(a: Ally): boolean {
    return a.alive && (a.hots.length > 0 || this.inZone(a))
  }

  private alliesInRange(range: number): Ally[] {
    return this.allies.filter((a) => a.alive && dist(a.pos, this.player.pos) <= range)
  }

  private byHealth(list: Ally[]): Ally[] {
    return [...list].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id - b.id)
  }

  /** The enemy nearest your crosshair (or nearest you without one) within range. */
  mainTarget(range: number): Enemy | null {
    const pool = this.enemies.filter((e) => e.alive && dist(e.pos, this.player.pos) - e.radius <= range)
    const from = this.aim ?? this.player.pos
    pool.sort((a, b) => dist(a.pos, from) - a.radius - (dist(b.pos, from) - b.radius) || Number(b.isBoss) - Number(a.isBoss))
    return pool[0] ?? null
  }

  /** Enemies in range with one of your DoTs or standing in one of your zones. */
  private afflicted(range: number): Enemy[] {
    return this.enemies.filter(
      (e) => e.alive && dist(e.pos, this.player.pos) - e.radius <= range && (e.dots.length > 0 || this.enemyInZone(e)),
    )
  }

  private pickEnemies(rule: TargetRule, ctx: CastContext, e: ResolvedEffect): Enemy[] {
    const around = (center: Vec) => this.enemies.filter((x) => x.alive && dist(x.pos, center) <= e.radius + x.radius)
    switch (rule) {
      case 'self':
        return e.radius > 0 ? around(this.player.pos) : []
      case 'afflicted':
        return this.afflicted(ctx.range)
      case 'event': {
        const enemy = ctx.eventEnemy
        if (!enemy?.alive) return []
        return e.radius > 0 && e.type === 'damage' ? around(enemy.pos) : [enemy]
      }
      default: {
        const main = this.mainTarget(ctx.range)
        if (!main) return []
        if (e.radius > 0 && e.type === 'damage') return [main, ...around(main.pos).filter((x) => x !== main)]
        return [main]
      }
    }
  }

  private pick(rule: TargetRule, ctx: CastContext, e: ResolvedEffect, count: number): Ally[] {
    const pool = this.alliesInRange(ctx.range)
    switch (rule) {
      case 'lowest':
        return this.byHealth(pool).slice(0, count)
      case 'lowest-missing': {
        const missing = pool.filter((a) => !a.hots.some((h) => h.key === e.key))
        return [...this.byHealth(missing), ...this.byHealth(pool.filter((a) => !missing.includes(a)))].slice(0, count)
      }
      case 'next-lowest': {
        const skip = new Set<Ally | undefined>([ctx.eventTarget, ...ctx.primary])
        return this.byHealth(pool.filter((a) => !skip.has(a))).slice(0, count)
      }
      case 'all':
        return pool
      case 'self':
        return this.player.alive ? [this.player] : []
      case 'same':
        return ctx.primary.filter((a) => a.alive)
      case 'event':
        return ctx.eventTarget?.alive ? [ctx.eventTarget] : []
      case 'path': {
        const path = ctx.path
        return path ? this.allies.filter((a) => a.alive && !a.isPlayer && distToSegment(a.pos, path[0], path[1]) <= PATH_WIDTH) : []
      }
      case 'origin':
      case 'target':
      case 'afflicted':
        return []
    }
  }

  // ---------- Resource ----------

  private gainResource(n: number, source: string, quiet = false) {
    const before = this.resource
    this.resource = Math.min(this.maxResource, this.resource + n)
    const gained = this.resource - before
    if (gained <= 0) return
    this.meter.resourceGained.set(source, (this.meter.resourceGained.get(source) ?? 0) + gained)
    if (!quiet && gained >= 1) this.text(this.player.pos, `+${int(gained)} ${this.kit.resource.toLowerCase()}`, '#5aa9ff', false)
    // Talents can listen for gains: once per gain, but regeneration only once per 10% of your maximum.
    if (source === 'Regeneration') {
      this.regenPool += gained
      if (this.regenPool < this.maxResource * 0.1) return
      this.regenPool -= this.maxResource * 0.1
    }
    if (this.gaining) return
    this.gaining = true
    this.emit({ kind: 'gain', tags: GAIN_TAGS, ctx: this.newContext(null, -1, 0), amount: gained })
    this.gaining = false
  }

  /**
   * Abilities that go off on their own (Endless Harvest): every `autocast` sec, for free. They use
   * up the buffs a cast would (Reaping's stacks).
   */
  private updateAutocasts() {
    if (!this.player.alive) return
    this.kit.slots.forEach((base, slot) => {
      if (!base || base.autocast <= 0) {
        if (base) this.autocastAt.delete(base.treeId)
        return
      }
      const at = this.autocastAt.get(base.treeId) ?? this.time + base.autocast
      if (this.time < at) {
        this.autocastAt.set(base.treeId, at)
        return
      }
      this.autocastAt.set(base.treeId, at + base.autocast)
      const a = this.current(slot)!
      this.buffs = this.buffs.filter((b) => !(b.consumeOn && matches(b.consumeOn, a.tags)))
      this.meter.casts.set(a.name, (this.meter.casts.get(a.name) ?? 0) + 1)
      this.addLog(`${a.name} goes off`, 'cast')
      // When it has effects for going off on its own (Emanation), only those fire.
      const auto = a.effects.filter((e) => e.auto)
      this.runEffects(a, this.newContext(a, ++this.castCounter, 0), undefined, undefined, auto.length ? auto : a.effects)
    })
  }

  /** Trickles tick once a second, in whole points; the fraction left over waits for the next tick. */
  private updateTrickles() {
    for (const t of this.trickles) {
      while (t.ticksLeft > 0 && this.time >= t.nextAt) {
        if (t.enemy && !t.enemy.alive) {
          t.ticksLeft = 0
          break
        }
        const share = t.left / t.ticksLeft
        t.left -= share
        t.ticksLeft -= 1
        t.nextAt += 1
        const owed = (this.trickleCarry.get(t.name) ?? 0) + share
        const whole = Math.floor(owed + 1e-9)
        this.trickleCarry.set(t.name, Math.max(0, owed - whole))
        if (whole > 0 && this.player.alive) this.gainResource(whole, t.name, true)
      }
    }
    this.trickles = this.trickles.filter((t) => t.ticksLeft > 0)
  }

  /** What your main attack gives back right now, buffs and talents included (Swift Arrow: 10 focus). */
  private mainAttackGain(): number {
    const a = this.current(0)
    return a ? a.effects.reduce((sum, e) => (e.type === 'restore' ? sum + e.restore : sum), 0) : 0
  }

  private spend(n: number, source: string) {
    if (n <= 0) return
    // When your resource is imps, spending it sacrifices them.
    const spent = this.kit.minion ? this.sacrifice(n) : n
    this.resource = Math.max(0, this.resource - spent)
    this.meter.resourceSpent.set(source, (this.meter.resourceSpent.get(source) ?? 0) + spent)
  }

  // ---------- Minions ----------

  /** One imp per whole point of a minion resource: summoned ones appear, sacrificed ones vanish. */
  private syncImps() {
    const want = this.kit.minion && this.player.alive ? Math.floor(this.resource + 1e-6) : 0
    const lasts = this.minionNow()?.duration ?? 0
    while (this.imps.length < want) {
      this.imps.push({
        id: this.nextId++,
        angle: this.rng() * Math.PI * 2,
        nextAttack: this.time + 0.4 + this.rng() * 0.6,
        endsAt: lasts > 0 ? this.time + lasts : Infinity,
      })
    }
    while (this.imps.length > want) this.removeImp(this.shortestImp()!)
  }

  /** The imp with the least time left: the one a spell sacrifices first. */
  private shortestImp(): Imp | undefined {
    return this.imps.reduce<Imp | undefined>((min, imp) => (!min || imp.endsAt < min.endsAt ? imp : min), undefined)
  }

  private removeImp(imp: Imp) {
    this.imps = this.imps.filter((x) => x !== imp)
    this.ring(this.impPos(imp), 1.2, '#ff8a5c')
    this.minionFell()
  }

  /** Your Overlords: summons whose presence empowers your other minions. */
  private lords(): Summon[] {
    return this.summons.filter((s) => s.effect.empower > 0)
  }

  private lordSum(key: 'empower' | 'hasten'): number {
    return this.lords().reduce((sum, s) => sum + s.effect[key], 0)
  }

  /** Minion attack-speed buffs on right now that match these tags, in %. */
  private buffTick(tags: ReadonlySet<string>): number {
    return this.buffMods().reduce((sum, m) => (m.key === 'tickRate' && matches(m.match, tags) ? sum + (m.pct ?? 0) + (m.add ?? 0) : sum), 0)
  }

  /** The haste your ultimate's buffs give you right now. */
  private ultimateHaste(): number {
    return this.buffs.reduce((sum, b) => (b.ultimate ? sum + (b.stats.haste ?? 0) * b.stacks : sum), 0)
  }

  /**
   * One of your minions (an imp or a summon, Overlords aside) fell: it ran out, was spent or was
   * replaced. Overlords that feed on it last longer, and every 5th one calls their meteor.
   */
  private minionFell() {
    const lords = this.lords()
    for (const s of lords) s.endsAt += s.effect.feed
    const doom = lords.find((s) => s.effect.meteor > 0)
    if (!doom) return
    this.addBuff({ id: DOOM, name: 'Impending Doom', duration: Math.max(0.1, doom.endsAt - this.time), maxStacks: 5 }, false)
    const b = this.buffs.find((x) => x.id === DOOM)!
    if (b.stacks < 5) return
    this.buffs = this.buffs.filter((x) => x !== b)
    const target = this.mainTarget(ENEMY_RANGE)
    if (!target) return
    this.ring(target.pos, METEOR_RADIUS, doom.effect.color)
    for (const enemy of this.enemies.filter((x) => x.alive && dist(x.pos, target.pos) <= METEOR_RADIUS + x.radius)) {
      this.hitEnemy(enemy, doom.effect.meteor, doom.effect, this.summonContext(doom, enemy), { label: 'Meteor' })
    }
  }

  /**
   * Pays for an ability with imps, the ones with the least time left first. Each has the spare
   * chance to survive instead (and isn't spent). Returns how many were spent.
   */
  private sacrifice(n: number): number {
    // Imps you just gained (or were given) may not have appeared yet.
    this.syncImps()
    const spare = this.stats().spareChance
    const order = [...this.imps].sort((a, b) => a.endsAt - b.endsAt)
    let spent = n - Math.floor(n + 1e-6)
    for (const imp of order.slice(0, Math.floor(n + 1e-6))) {
      if (this.decks.draw('spare', spare)) {
        this.text(this.impPos(imp), 'Spared', '#a6e65a', false)
        continue
      }
      this.removeImp(imp)
      spent += 1
      this.emit({ kind: 'sacrifice', tags: SACRIFICE_TAGS, ctx: this.newContext(null, -1, 0) })
    }
    return spent
  }

  /** Where an imp hovers: circling you, on a wider circle the more you have. */
  impPos(imp: Imp): Vec {
    const a = imp.angle + this.time * 0.8
    const r = 2.2 + 0.12 * this.imps.length
    return { x: this.player.pos.x + Math.cos(a) * r, y: this.player.pos.y + Math.sin(a) * r }
  }

  private updateImps() {
    // An imp whose time is up leaves, and takes its point of resource with it.
    for (const imp of this.imps.filter((x) => this.time >= x.endsAt)) {
      this.removeImp(imp)
      this.resource = Math.max(0, this.resource - 1)
    }
    const e = this.imps.length ? this.minionNow() : null
    if (!e) return
    for (const imp of this.imps) {
      if (this.time < imp.nextAttack) continue
      imp.nextAttack = this.time + e.interval / (1 + this.lordSum('hasten') / 100)
      const target = this.mainTarget(ENEMY_RANGE)
      if (!target) continue
      this.beam(this.impPos(imp), target.pos, '#ff8a5c')
      this.hitEnemy(target, e.amount, e, this.newContext(null, -1, 0), { label: e.name ?? 'Minion', quiet: true })
    }
  }

  /** Raises a minion of your own. Past its `max`, the oldest one of its kind falls to make room. */
  private summon(e: ResolvedEffect, ctx: CastContext, name: string) {
    if (!this.player.alive || e.duration <= 0 || e.interval <= 0) return
    const same = this.summons.filter((s) => s.key === e.key)
    if (same.length >= e.max) this.dismiss(same[0])
    const s: Summon = {
      id: this.nextId++,
      attacks: 0,
      tick0: this.buffTick(e.tags),
      ultHaste0: this.ultimateHaste(),
      key: e.key,
      name,
      effect: e,
      endsAt: this.time + e.duration,
      nextAttack: this.time + 0.5,
      angle: this.rng() * Math.PI * 2,
      depth: ctx.depth,
    }
    this.summons.push(s)
    this.ring(this.summonPos(s), 1.4, e.color)
  }

  /** A summon falls: its time ran out, a newer one took its place, or you died. */
  private dismiss(s: Summon) {
    this.summons = this.summons.filter((x) => x !== s)
    const target = this.mainTarget(ENEMY_RANGE)
    this.ring(this.summonPos(s), 1.2, s.effect.color)
    this.emit({ kind: 'expire', tags: s.effect.tags, ctx: this.summonContext(s, target), enemy: target ?? undefined })
    if (target && this.player.alive && (s.effect.explode > 0 || s.effect.explodeLeft > 0)) this.explode(s, target)
    if (s.effect.empower <= 0) this.minionFell()
    else if (!this.lords().length) this.buffs = this.buffs.filter((b) => b.id !== DOOM)
  }

  /** Where a summon stands: in melee around the enemy it's fighting, or beside you with nothing to fight. */
  summonPos(s: Summon): Vec {
    const target = this.mainTarget(ENEMY_RANGE)
    const center = target?.pos ?? this.player.pos
    const r = (target ? target.radius : 0) + 1.6
    return { x: center.x + Math.cos(s.angle) * r, y: center.y + Math.sin(s.angle) * r }
  }

  private summonContext(s: Summon, target: Enemy | null): CastContext {
    return { ...this.newContext(null, -1, 0, s.depth), eventEnemy: target ?? undefined, range: ENEMY_RANGE }
  }

  private updateSummons() {
    for (const s of [...this.summons]) {
      if (this.time >= s.endsAt || !this.player.alive) {
        this.dismiss(s)
        continue
      }
      while (this.time >= s.nextAttack) {
        s.nextAttack += s.effect.interval / this.summonPace(s)
        const target = this.mainTarget(ENEMY_RANGE)
        if (!target) continue
        this.beam(this.summonPos(s), target.pos, s.effect.color)
        // Mounting Fury: more for every attack it has made so far, up to 10.
        const amount = s.effect.amount * (1 + (s.effect.fury * s.attacks) / 100)
        s.attacks = Math.min(FURY_STACKS, s.attacks + 1)
        this.hitEnemy(target, amount, s.effect, this.summonContext(s, target), { label: s.name, quiet: true })
        // A volley (the Overlord's) hits every other enemy that close to its target too.
        if (s.effect.radius > 0) {
          const near = this.enemies.filter((x) => x !== target && x.alive && dist(x.pos, target.pos) <= s.effect.radius + x.radius)
          for (const x of near) this.hitEnemy(x, amount, s.effect, this.summonContext(s, x), { label: s.name, quiet: true })
        }
        if (s.effect.sustain > 0) {
          for (const imp of this.imps) imp.endsAt += s.effect.sustain
          for (const o of this.summons) if (o.effect.empower <= 0) o.endsAt += s.effect.sustain
        }
      }
    }
  }

  /**
   * A falling summon's explosion (Corpse Explosion): its damage on every enemy within 6 yd of its
   * target, plus, for each second it had left, damage shared out among them (Volatile Remains).
   */
  private explode(s: Summon, target: Enemy) {
    const hit = this.enemies.filter((x) => x.alive && dist(x.pos, target.pos) <= EXPLODE_RADIUS + x.radius)
    if (!hit.length) return
    const left = Math.max(0, s.endsAt - this.time)
    const each = s.effect.explode + (s.effect.explodeLeft * left) / hit.length
    this.ring(target.pos, EXPLODE_RADIUS, s.effect.color)
    for (const x of hit) this.hitEnemy(x, each, s.effect, this.summonContext(s, x), { label: 'Corpse Explosion', secondary: true })
  }

  /**
   * How much faster a summon attacks than when it was raised: speed buffs since then, an Overlord's
   * presence (for other minions) and, with Dark Patron, your ultimate's haste (for the Overlord).
   */
  private summonPace(s: Summon): number {
    let pace = (1 + this.buffTick(s.effect.tags) / 100) / (1 + s.tick0 / 100)
    if (s.effect.empower <= 0) pace *= 1 + this.lordSum('hasten') / 100
    else if (s.effect.patron > 0) pace *= (1 + this.ultimateHaste() / 100) / (1 + s.ultHaste0 / 100)
    return pace
  }

  // ---------- Timers ----------

  private updateHots() {
    for (const ally of this.allies) {
      for (const h of [...ally.hots]) {
        while (h.nextTick <= h.endsAt + 1e-6 && h.nextTick <= this.time && ally.alive) {
          this.heal(ally, this.tickOf(h), h.effect, this.hotContext(h), { label: h.name })
          h.tick += 1
          h.nextTick += h.interval
        }
        if (this.time >= h.endsAt || !ally.alive) {
          ally.hots = ally.hots.filter((x) => x !== h)
          if (ally.alive) this.emit({ kind: 'expire', tags: h.effect.tags, ctx: this.hotContext(h), target: ally, hot: h })
        }
      }
    }
  }

  private updateDots() {
    for (const enemy of this.enemies) {
      for (const c of [...enemy.curses]) if (this.time >= c.endsAt || !enemy.alive) this.endCurse(enemy, c)
      for (const d of [...enemy.dots]) {
        if (d.effect.burst > 0 && d.stacks.length) {
          this.updateBurstingDot(enemy, d)
          continue
        }
        while (d.nextTick <= d.endsAt + 1e-6 && d.nextTick <= this.time && enemy.alive) {
          const stacks = d.stacks.length ? d.stacks.filter((t) => t >= d.nextTick - 1e-6).length : d.count
          if (stacks > 0) this.hitEnemy(enemy, this.tickOf(d) * stacks, d.effect, this.dotContext(d), { label: d.name, quiet: true })
          d.tick += 1
          d.nextTick += d.interval
        }
        if (d.stacks.length) d.stacks = d.stacks.filter((t) => t > this.time)
        if (this.time >= d.endsAt || !enemy.alive) {
          enemy.dots = enemy.dots.filter((x) => x !== d)
          if (enemy.alive) this.emit({ kind: 'expire', tags: d.effect.tags, ctx: this.dotContext(d), enemy, dot: d })
        }
      }
    }
  }

  /**
   * A rolling DoT that bursts (Bursting Rot): no ticks; every stack whose time is up deals all the
   * damage it would have ticked for over its duration, at once, and splashes some of it around.
   */
  private updateBurstingDot(enemy: Enemy, d: Dot) {
    const popped = d.stacks.filter((t) => t <= this.time).length
    d.stacks = d.stacks.filter((t) => t > this.time)
    if (popped > 0 && enemy.alive) {
      const amount = d.amount * (d.effect.duration / d.interval) * popped
      const ctx = this.dotContext(d)
      const dealt = this.hitEnemy(enemy, amount, d.effect, ctx, { label: `${d.name} burst` })
      if (d.effect.burstSplash > 0 && dealt > 0) {
        this.ring(enemy.pos, BURST_RADIUS, d.effect.color)
        const near = this.enemies.filter((x) => x !== enemy && x.alive && dist(x.pos, enemy.pos) <= BURST_RADIUS + x.radius)
        for (const x of near) {
          this.hitEnemy(x, (dealt * d.effect.burstSplash) / 100, d.effect, ctx, { label: `${d.name} burst`, fixed: true, secondary: true })
        }
      }
    }
    if (!d.stacks.length || !enemy.alive) {
      enemy.dots = enemy.dots.filter((x) => x !== d)
      if (enemy.alive) this.emit({ kind: 'expire', tags: d.effect.tags, ctx: this.dotContext(d), enemy, dot: d })
    } else d.endsAt = Math.max(...d.stacks)
  }

  private updateZones() {
    for (const z of [...this.zones]) {
      if (z.anchor?.alive) z.pos = { ...z.anchor.pos }
      if (z.anchorEnemy?.alive) z.pos = { ...z.anchorEnemy.pos }
      while (z.nextTick <= z.endsAt + 1e-6 && z.nextTick <= this.time) {
        const amount = this.tickOf(z)
        if (z.hostile) {
          for (const enemy of this.enemiesIn(z)) {
            if (amount > 0) this.hitEnemy(enemy, amount, z.effect, this.zoneContext(z), { label: z.name, quiet: true })
            if (z.effect.inflicts) this.applyDot(enemy, z.effect.inflicts, this.zoneContext(z), z.effect.inflicts.name ?? z.name)
          }
        } else {
          for (const a of this.allies) {
            if (a.alive && dist(a.pos, z.pos) <= z.radius) this.heal(a, amount, z.effect, this.zoneContext(z), { label: z.name })
          }
        }
        z.tick += 1
        z.nextTick += z.interval
        this.emit({ kind: 'tick', tags: z.effect.tags, ctx: this.zoneContext(z), zone: z })
      }
      if (this.time >= z.endsAt) {
        this.zones = this.zones.filter((x) => x !== z)
        this.emit({ kind: 'expire', tags: z.effect.tags, ctx: this.zoneContext(z), zone: z })
      }
    }
  }

  private updateTimers() {
    this.buffs = this.buffs.filter((b) => this.time < b.endsAt)
    for (const a of this.allies) a.shields = a.shields.filter((s) => this.time < s.endsAt && s.amount > 0)
    for (const cd of this.cooldowns.values()) {
      while (cd.rechargeAt !== null && this.time >= cd.rechargeAt) {
        cd.charges = Math.min(cd.max, cd.charges + 1)
        cd.rechargeAt = cd.charges < cd.max ? cd.rechargeAt + cd.duration : null
      }
    }
  }

  // ---------- Movement ----------

  private movePlayer(dt: number, input: ArenaInput) {
    const p = this.player
    if (!p.alive) return
    if (this.dashing) {
      const t = Math.min(1, (this.time - this.dashing.start) / DASH_TIME)
      const { from, to } = this.dashing
      p.pos = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
      if (t >= 1) this.dashing = null
      this.moved(dt)
      return
    }
    const len = Math.hypot(input.move.x, input.move.y)
    // You can't cast and move: walking waits for the cast to end (dashes and teleports still work).
    if (len === 0 || this.cast) return
    const dir = { x: input.move.x / len, y: input.move.y / len }
    const speed = RUN_SPEED * (1 + this.stats().speed / 100)
    this.facing = dir
    p.pos = inArena({ x: p.pos.x + dir.x * speed * dt, y: p.pos.y + dir.y * speed * dt })
    this.moved(dt)
  }

  /** Counts time spent moving: a `moving` event for every whole second (Quick Invocation). */
  private moved(dt: number) {
    for (this.movedFor += dt; this.movedFor >= 1 - 1e-9; this.movedFor -= 1) {
      this.emit({ kind: 'moving', tags: MOVING_TAGS, ctx: this.newContext(null, -1, 0) })
    }
  }

  private moveBots(dt: number) {
    const speed = RUN_SPEED * (1 + (this.groupStats().speed ?? 0) / 100)
    for (const a of this.allies) {
      if (a.isPlayer || !a.alive) continue
      if (a.reactAt !== null && this.time >= a.reactAt) {
        a.reactAt = null
        a.dest = this.escape(a)
      }
      if (a.reactAt === null && !a.dest && this.hazardAt(a.pos, true)) a.reactAt = this.time + 0.3
      if (!a.dest && a.reactAt === null) {
        const spot = this.spotFor(a)
        if (dist(a.pos, spot) > 0.4 && !this.hazardAt(spot, false)) a.dest = spot
      }
      if (a.dest) {
        const d = dist(a.pos, a.dest)
        const stepLen = speed * dt
        if (d <= stepLen) {
          a.pos = { ...a.dest }
          a.dest = null
        } else a.pos = { x: a.pos.x + ((a.dest.x - a.pos.x) / d) * stepLen, y: a.pos.y + ((a.dest.y - a.pos.y) / d) * stepLen }
      }
    }
  }

  /** Where a bot wants to stand: its spot, or the gathering point during a gather. */
  private spotFor(a: Ally): Vec {
    if (this.time >= this.stackUntil || a.role === 'tank') return a.home
    const i = this.allies.indexOf(a)
    const angle = i * 2.4
    return { x: this.scenario.stackPoint.x + Math.cos(angle) * 1.6, y: this.scenario.stackPoint.y + Math.sin(angle) * 1.6 }
  }

  private hazardAt(p: Vec, armedOnly: boolean): Hazard | undefined {
    return this.hazards.find((h) => (!armedOnly || this.time >= h.armAt - 0.6) && dist(p, h.pos) <= h.radius + 0.5)
  }

  private escape(a: Ally): Vec | null {
    const h = this.hazardAt(a.pos, false)
    if (!h) return null
    const away = Math.atan2(a.pos.y - h.pos.y, a.pos.x - h.pos.x) || this.rng() * Math.PI * 2
    for (let i = 0; i < 8; i++) {
      const angle = away + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 4)
      const spot = inArena({ x: h.pos.x + Math.cos(angle) * (h.radius + 2), y: h.pos.y + Math.sin(angle) * (h.radius + 2) })
      if (!this.hazardAt(spot, false)) return spot
    }
    return null
  }

  // ---------- The boss and its adds ----------

  private runScenario(dt: number) {
    const scale = this.options.damageScale
    for (const s of this.schedule) {
      const ev = s.event
      if (ev.kind === 'drain') {
        for (const a of this.allies) this.damage(a, ev.perSec * dt * scale * (a.role === 'tank' ? 1.5 : 1), 'Drain', true)
        continue
      }
      while (this.time >= s.next) {
        this.bossEvent(ev, scale)
        s.next += ev.kind === 'melee' || ev.kind === 'healer' ? ev.every : ev.every * (0.9 + this.rng() * 0.2)
      }
    }
  }

  private currentTank(): Ally | undefined {
    const alive = this.allies.filter((a) => a.alive)
    return alive.find((a) => a.role === 'tank') ?? alive[0]
  }

  private bossEvent(ev: ScenarioEvent, scale: number) {
    const alive = this.allies.filter((a) => a.alive)
    if (alive.length === 0 || !this.boss.alive) return
    switch (ev.kind) {
      case 'melee': {
        const tanks = alive.filter((a) => a.role === 'tank')
        const order = this.allies.filter((a) => a.role === 'tank')
        const turn = ev.swap ? Math.floor(this.time / ev.swap) % Math.max(1, order.length) : 0
        const tank = this.swingTarget(this.boss, order[turn]?.alive ? order[turn] : (tanks[0] ?? alive[0]))!
        this.damage(tank, ev.amount * (0.85 + this.rng() * 0.3) * scale, 'Melee', false, this.boss)
        break
      }
      case 'pulse':
        this.addLog(`${this.boss.name} casts ${ev.name}`, 'boss')
        this.ring(this.boss.pos, 30, '#ff6b6b')
        for (const a of alive) this.damage(a, ev.amount * scale, ev.name)
        break
      case 'spike': {
        const pool = alive.filter((a) => a.role !== 'tank' && !a.isPlayer)
        for (let i = 0; i < ev.count && pool.length; i++) {
          const [target] = pool.splice(Math.floor(this.rng() * pool.length), 1)
          this.beam(this.boss.pos, target.pos, '#ff6b6b')
          this.damage(target, ev.amount * scale, ev.name)
        }
        break
      }
      case 'pool': {
        const pool = [...alive]
        this.addLog(`${this.boss.name} casts ${ev.name}`, 'boss')
        for (let i = 0; i < ev.count && pool.length; i++) {
          const [target] = pool.splice(Math.floor(this.rng() * pool.length), 1)
          const pos = inArena({ x: target.pos.x + (this.rng() - 0.5) * 2, y: target.pos.y + (this.rng() - 0.5) * 2 })
          this.hazards.push({
            id: this.nextId++,
            name: ev.name,
            pos,
            radius: ev.radius,
            armAt: this.time + ev.warn,
            endsAt: this.time + ev.warn + ev.duration,
            dps: ev.dps,
            nextTick: this.time + ev.warn,
          })
          for (const a of this.allies) {
            if (!a.isPlayer && a.alive && dist(a.pos, pos) <= ev.radius + 0.5) a.reactAt = this.time + 0.5 + this.rng() * 0.9
          }
        }
        break
      }
      case 'stack':
        this.stackUntil = this.time + ev.duration
        this.addLog('The party gathers', 'boss')
        break
      case 'healer': {
        const healer = alive.find((a) => a.role === 'healer' && !a.isPlayer)
        const target = this.byHealth(alive)[0]
        if (!healer || !target) break
        const received = target.isPlayer ? this.stats().healingTaken : (this.groupStats().healingTaken ?? 0)
        const amount = ev.amount * this.share * (1 + received / 100)
        target.hp = Math.min(target.maxHp, target.hp + amount)
        this.text(target.pos, `+${int(amount)}`, '#9aa79d', false)
        break
      }
      case 'adds': {
        this.addLog(`${ev.count} ${ev.name}s join the fight`, 'boss')
        for (let i = 0; i < ev.count; i++) {
          const angle = Math.PI * (0.15 + (0.7 * (i + 0.5)) / ev.count)
          const pos = { x: this.boss.pos.x + Math.cos(angle) * 6, y: this.boss.pos.y + Math.sin(angle) * 4.5 }
          this.enemies.push(this.makeEnemy(ev.name, pos, ev.hp, ARENA.addRadius, false, ev.hits))
        }
        break
      }
      case 'drain':
        break
    }
  }

  private updateHazards() {
    for (const h of [...this.hazards]) {
      if (this.time >= h.endsAt) {
        this.hazards = this.hazards.filter((x) => x !== h)
        continue
      }
      while (this.time >= h.armAt && h.nextTick <= this.time && h.nextTick < h.endsAt) {
        for (const a of this.allies) {
          if (a.alive && dist(a.pos, h.pos) <= h.radius) this.damage(a, h.dps * 0.5 * this.options.damageScale, h.name)
        }
        h.nextTick += 0.5
      }
    }
  }

  /** Bots hit adds before the boss; adds swing at the tank. */
  private updateEnemies(dt: number) {
    const group = this.groupStats()
    const botBoost = 1 + ((group.haste ?? 0) + (group.damageDone ?? 0)) / 100 + (group.crit ?? 0) / 200
    const dps = this.allies.reduce((sum, a) => (a.alive && !a.isPlayer ? sum + a.dps : sum), 0) * botBoost
    const adds = this.enemies.filter((e) => e.alive && !e.isBoss && Number.isFinite(e.hp))
    const target = adds[0] ?? (this.boss.alive ? this.boss : null)
    if (target && Number.isFinite(target.hp) && dps > 0) {
      target.hp -= dps * dt
      if (target.hp <= 0) this.killEnemy(target)
    }
    for (const add of adds) {
      if (!add.alive || add.hits <= 0 || this.time < add.swingAt) continue
      add.swingAt = this.time + ADD_SWING
      const tank = this.swingTarget(add, this.currentTank())
      if (tank) this.damage(tank, add.hits * this.options.damageScale, add.name, false, add)
    }
    this.enemies = this.enemies.filter((e) => e.alive || e.isBoss)
    if (!this.allies.some((a) => a.alive)) {
      this.ended = 'wipe'
      this.addLog('Everyone is dead', 'death')
    }
  }

  /**
   * `quiet` is for steady drains: no numbers, and no dodging them. `swing` is the enemy whose melee
   * swing this is: you can parry those.
   */
  private damage(a: Ally, written: number, source: string, quiet = false, swing?: Enemy) {
    if (!a.alive || written <= 0) return
    const amount = written * this.share
    const group = this.groupStats()
    const parry = swing && a.isPlayer ? this.stats().parry : 0
    if (this.decks.draw('parry', parry)) {
      this.text(a.pos, 'Parry', '#d39a5e', false)
      this.gainResource(this.stats().resourceOnParry, 'Parry')
      this.emit({ kind: 'parry', tags: PARRY_TAGS, ctx: { ...this.newContext(null, -1, 0), eventEnemy: swing }, enemy: swing })
      return
    }
    const dodge = a.isPlayer ? this.stats().dodge : (group.dodge ?? 0)
    if (!quiet && this.decks.draw(`dodge:${a.id}`, dodge)) {
      this.text(a.pos, 'Dodge', '#9fe7ff', false)
      return
    }
    // Rage: a hit that lands gives resource, even when a shield soaks it.
    if (!quiet && a.isPlayer) this.gainResource(this.stats().resourceWhenHit, 'Getting hit', true)
    const zoneDr = Math.max(0, ...this.zones.filter((z) => !z.hostile && dist(z.pos, a.pos) <= z.radius).map((z) => z.damageReduction))
    const ownDr = a.isPlayer ? this.stats().damageReduction : (group.damageReduction ?? 0)
    const dr = Math.min(90, zoneDr + ownDr)
    let left = amount * (1 - dr / 100)
    for (const s of a.shields) {
      const absorbed = Math.min(s.amount, left)
      s.amount -= absorbed
      left -= absorbed
      // What a shield soaks counts as its healing on the meter, as absorbs do in WoW's.
      if (absorbed > 0) {
        const row = this.meter.rows.get(s.name) ?? { name: s.name, color: s.color, healing: 0, overheal: 0, hits: 0, crits: 0 }
        row.healing += absorbed
        if (!quiet) row.hits += 1
        this.meter.rows.set(s.name, row)
      }
    }
    a.shields = a.shields.filter((s) => s.amount > 0)
    a.hp -= left
    this.meter.damageTaken += left
    if (!quiet && left >= 1) this.text(a.pos, `-${int(left)}`, '#ff7a6b', false)
    if (a.hp > 0) return
    if (this.options.noDeaths) {
      a.hp = 1
      return
    }
    a.hp = 0
    a.alive = false
    a.hots = []
    a.shields = []
    a.dest = null
    if (a.isPlayer) this.cast = null
    this.addLog(`${a.isPlayer ? 'You die' : `${a.name} dies`} to ${source}`, 'death')
  }

  // ---------- Feedback ----------

  private text(pos: Vec, text: string, color: string, big: boolean) {
    this.fx.push({ kind: 'text', pos: { ...pos }, text, color, big, born: this.time, life: big ? 1.3 : 1, dx: (this.rng() - 0.5) * 2.4 })
  }

  private beam(from: Vec, to: Vec, color: string) {
    this.fx.push({ kind: 'beam', from: { ...from }, to: { ...to }, color, born: this.time, life: 0.35 })
  }

  private ring(pos: Vec, radius: number, color: string) {
    this.fx.push({ kind: 'ring', pos: { ...pos }, radius, color, born: this.time, life: 0.6 })
  }

  private addLog(text: string, kind: LogLine['kind']) {
    this.log.push({ t: this.time, text, kind })
    if (this.log.length > 120) this.log = this.log.slice(-100)
  }
}
