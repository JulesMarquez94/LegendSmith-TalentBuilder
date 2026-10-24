import { int } from '../format.ts'
import { matches, tickAmount, type Kit, type ResolvedProc } from '../resolve.ts'
import { RUN_SPEED } from '../stats.ts'
import type {
  Action,
  BuffSpec,
  CharStats,
  Condition,
  EventKind,
  Match,
  ModMechanic,
  ResolvedAbility,
  ResolvedEffect,
  Tag,
  TargetRule,
} from '../types.ts'
import { ARENA, type AllyRole, type Scenario, type ScenarioEvent, type Vec } from './scenarios.ts'

// A small top-down fight for testing a kit: the same resolved numbers the tooltips show, run in
// real time. Positions are in yards. Nothing here knows about named abilities; everything goes
// through effects, events and procs, so new trees work without touching this file.

/** Smart-targeting range for heals that come from talents rather than an ability with its own range. */
const HEAL_RANGE = 40
/** How close to a dash's path an ally must be for path heals. */
const PATH_WIDTH = 3
/** Reservoir never stores more mana than this. */
const RESERVOIR_CAP = 100
/** A shield never grows past this share of its target's health. */
const SHIELD_CAP = 0.5
/** Presses are remembered this long, so a key hit just before a cast ends still goes off (like WoW's spell queue). */
const QUEUE_WINDOW = 0.35
const DASH_TIME = 0.15

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
  tick: number
  /** 1 once it has jumped (Wandering Seed), so it never jumps again. */
  generation: number
  depth: number
}

export interface Shield {
  key: string
  name: string
  amount: number
  endsAt: number
}

export interface Zone {
  id: number
  name: string
  effect: ResolvedEffect
  pos: Vec
  anchor: Ally | null
  radius: number
  amount: number
  interval: number
  duration: number
  nextTick: number
  endsAt: number
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

export interface ActiveBuff {
  id: string
  name: string
  duration: number
  endsAt: number
  stats: Partial<CharStats>
  mods: readonly ModMechanic[]
  consumeOn?: Match
}

export interface Casting {
  slot: number
  ability: ResolvedAbility
  cost: number
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
  /** Multiplies every hit the boss and pools deal. */
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
  origin: Vec
  path: [Vec, Vec] | null
  /** Who the latest effect landed on, for 'same'. */
  primary: Ally[]
  eventTarget?: Ally
  /** 0 for a cast; each proc adds one. Procs stop at 2 so they can't feed each other forever. */
  depth: number
  range: number
}

interface GameEvent {
  kind: EventKind
  tags: ReadonlySet<Tag>
  ctx: CastContext
  target?: Ally
  amount?: number
  overheal?: number
  crit?: boolean
  /** Target health fraction before the heal. */
  before?: number
  hot?: Hot
  zone?: Zone
}

interface HealOptions {
  label: string
  /** An amount taken from another event (a share of a heal or overheal): no crit, no conditional bonuses. */
  fixed?: boolean
  quiet?: boolean
}

export type UseResult = 'ok' | 'busy' | string

export class Arena {
  time = 0
  kit: Kit
  readonly scenario: Scenario
  readonly options: ArenaOptions
  readonly allies: Ally[] = []
  readonly player: Ally
  readonly boss: { name: string; pos: Vec; radius: number; maxHp: number; hp: number }
  mana: number
  zones: Zone[] = []
  hazards: Hazard[] = []
  buffs: ActiveBuff[] = []
  cast: Casting | null = null
  gcdStart = 0
  gcdUntil = 0
  readonly cooldowns = new Map<string, Cooldown>()
  /** Overhealing stored by Reservoir, as mana. */
  reservoir = 0
  facing: Vec = { x: 0, y: -1 }
  dashing: { from: Vec; to: Vec; start: number } | null = null
  stackUntil = 0
  ended: 'victory' | 'wipe' | null = null
  notice: { text: string; t: number } | null = null
  readonly meter = {
    rows: new Map<string, MeterRow>(),
    damage: 0,
    damageTaken: 0,
    manaSpent: new Map<string, number>(),
    manaGained: new Map<string, number>(),
    casts: new Map<string, number>(),
  }
  log: LogLine[] = []
  fx: Fx[] = []

  private readonly rng: () => number
  private nextId = 1
  private castCounter = 0
  private readonly requests = new Map<number, { until: number; fresh: boolean }>()
  private readonly procCounts = new Map<string, number>()
  private readonly refunded = new Set<number>()
  private readonly schedule: { event: ScenarioEvent; next: number }[]

  constructor(kit: Kit, scenario: Scenario, options: Partial<ArenaOptions> = {}) {
    this.kit = kit
    this.scenario = scenario
    this.options = { damageScale: 1, noDeaths: scenario.noDeaths, seed: 1, ...options }
    this.rng = mulberry32(this.options.seed)
    const health = kit.character.stats.health
    this.player = this.makeAlly('You', 'healer', health, scenario.playerHome, 0, true)
    for (const t of scenario.party) this.makeAlly(t.name, t.role, t.maxHp, t.home, t.dps, false)
    for (const a of this.allies) a.hp = a.maxHp * scenario.startHealth
    this.boss = { name: scenario.boss.name, pos: { ...ARENA.boss }, radius: ARENA.bossRadius, maxHp: scenario.boss.maxHp, hp: scenario.boss.maxHp }
    this.mana = this.stats().maxMana
    this.schedule = scenario.events.map((event) => ({
      event,
      next: 'first' in event && event.first !== undefined ? event.first : 'every' in event ? event.every : 0,
    }))
    this.syncCooldowns()
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
    this.mana = Math.min(this.mana, this.stats().maxMana)
    if (this.cast && !kit.slots.some((a) => a?.treeId === this.cast!.ability.treeId)) this.cast = null
    this.syncCooldowns()
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

  /** Character stats with active buffs (Sprint's speed, Evasion's damage reduction…). */
  stats(): CharStats {
    if (this.buffs.length === 0) return this.kit.character.stats
    const s = { ...this.kit.character.stats }
    for (const b of this.buffs) for (const [k, v] of Object.entries(b.stats)) s[k as keyof CharStats] += v ?? 0
    return s
  }

  get maxMana() {
    return this.stats().maxMana
  }

  private buffMods(): ModMechanic[] {
    return this.buffs.flatMap((b) => b.mods)
  }

  /** A slot's ability as it would be cast right now, buffs included. */
  current(slot: number): ResolvedAbility | null {
    const base = this.kit.slots[slot]
    if (!base || this.buffs.length === 0) return base ?? null
    return this.kit.resolve(base.treeId, this.buffMods(), this.stats())
  }

  manaRegen(): number {
    const s = this.stats()
    const low = this.mana < this.maxMana * 0.3 ? 1 + s.lowManaRegen / 100 : 1
    return s.manaRegen * low + (this.inZone(this.player) ? s.zoneManaRegen : 0)
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
    this.movePlayer(dt, input)
    this.moveBots(dt)
    if (this.player.alive) this.gainMana(this.manaRegen() * dt, 'Regeneration', true)
    if (this.cast && this.time >= this.cast.end) {
      const c = this.cast
      this.cast = null
      this.finish(c.ability, c.castId, c.cost, input)
    }
    this.useRequested(input)
    this.updateHots()
    this.updateZones()
    this.updateTimers()
    this.runScenario(dt)
    this.updateHazards()
    this.updateBoss(dt)
    this.fx = this.fx.filter((f) => this.time - f.born < f.life).slice(-80)
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
    if (!this.player.alive) return 'You are dead'
    const offGcd = base.gcd === 0
    if (!offGcd && (this.cast || this.time < this.gcdUntil)) return 'busy'
    const cd = this.cooldowns.get(base.treeId)
    if (cd && cd.charges < 1) return `${base.name} isn't ready yet`
    const a = this.current(slot)!
    if (this.mana + 1e-6 < a.cost) return 'Not enough mana'
    if (a.tags.has('main-attack') && dist(this.player.pos, this.boss.pos) - this.boss.radius > a.range) {
      return 'Out of range'
    }
    if (a.effects.some((e) => e.type === 'bloom') && !this.alliesInRange(a.range).some((t) => this.affected(t))) {
      return 'Nobody has your HoTs or stands in your zones'
    }

    // Buffs that change this cast are used up by it (Surge of Light, Momentum…).
    this.buffs = this.buffs.filter((b) => !(b.consumeOn && matches(b.consumeOn, a.tags)))
    this.spend(a.cost, a.name)
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
      this.cast = { slot, ability: a, cost: a.cost, start: this.time, end: this.time + a.castTime, castId }
    } else this.finish(a, castId, a.cost, input)
    return 'ok'
  }

  private finish(a: ResolvedAbility, castId: number, cost: number, input?: ArenaInput) {
    const ctx = this.newContext(a, castId, cost)
    this.meter.casts.set(a.name, (this.meter.casts.get(a.name) ?? 0) + 1)
    if (!a.tags.has('main-attack')) this.addLog(`You cast ${a.name}`, 'cast')
    this.runEffects(a, ctx, input)
    this.emit({ kind: 'cast', tags: a.tags, ctx })
    if (a.echo > 0 && this.rng() * 100 < a.echo) {
      this.addLog(`Echo: ${a.name} goes off again`, 'proc')
      this.runEffects(a, this.newContext(a, castId, cost), input)
    }
  }

  private newContext(a: ResolvedAbility | null, castId: number, cost: number, depth = 0): CastContext {
    return {
      castId,
      ability: a,
      cost,
      origin: { ...this.player.pos },
      path: null,
      primary: [],
      depth,
      range: a?.range || HEAL_RANGE,
    }
  }

  private runEffects(a: ResolvedAbility, ctx: CastContext, input?: ArenaInput, forceTarget?: TargetRule) {
    for (const e of a.effects) {
      this.applyEffect(forceTarget ? { ...e, target: forceTarget } : e, ctx, { label: e.name ?? a.name }, input)
    }
  }

  // ---------- Effects ----------

  private applyEffect(e: ResolvedEffect, ctx: CastContext, opts: HealOptions, input?: ArenaInput) {
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
            if (this.mana + 1e-6 < e.extraCost) break
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
        for (const t of this.pick(e.target, ctx, e, e.targets)) this.addShield(t, e.amount, e.duration, opts.label, e.key)
        break
      case 'damage':
        this.hitBoss(e, ctx)
        break
      case 'mana':
        this.gainMana(e.mana, opts.label)
        if (e.tags.has('main-attack') && this.reservoir > 0) {
          this.gainMana(this.reservoir, 'Reservoir')
          this.reservoir = 0
        }
        break
      case 'move':
        this.moveBy(e, ctx, input)
        break
      case 'buff':
        if (e.buff) {
          const stats = e.buff.stats?.speed !== undefined ? { ...e.buff.stats, speed: e.speed } : (e.buff.stats ?? {})
          this.addBuff({ ...e.buff, stats, duration: e.duration }, false)
        }
        break
    }
  }

  private heal(target: Ally, base: number, e: ResolvedEffect, ctx: CastContext, opts: HealOptions) {
    if (!target.alive) return
    let amount = base
    let crit = false
    if (!opts.fixed) {
      let bonus = 0
      for (const c of e.conditionals) if (this.meets(c.when, target)) bonus += c.pct
      amount *= 1 + bonus / 100
      crit = this.rng() * 100 < e.critChance
      if (crit) amount *= e.critMultiplier
    }
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
    const stored = this.stats().overhealToMana
    if (overheal > 0 && stored > 0) this.reservoir = Math.min(RESERVOIR_CAP, this.reservoir + (overheal * stored) / 100)
    if (!opts.quiet) this.text(target.pos, `+${int(amount)}${crit ? '!' : ''}`, e.color, crit || e.family === 'direct-heal')

    const ev: GameEvent = { kind: 'heal', tags: e.tags, ctx, target, amount: effective, overheal, crit, before }
    this.emit(ev)
    if (crit) this.emit({ ...ev, kind: 'crit' })
  }

  private applyHot(target: Ally, e: ResolvedEffect, ctx: CastContext, name: string, generation = 0) {
    if (!target.alive || e.duration <= 0 || e.interval <= 0) return
    let hot = target.hots.find((h) => h.key === e.key)
    if (hot) {
      Object.assign(hot, { effect: e, amount: e.amount, interval: e.interval, duration: e.duration, tick: 0 })
      hot.endsAt = this.time + e.duration
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
        tick: 0,
        generation,
        depth: ctx.depth,
      }
      target.hots.push(hot)
    }
    for (let i = 0; i < e.instantTicks; i++) this.heal(target, hot.amount, e, this.hotContext(hot), { label: name })
  }

  private hotContext(h: Hot): CastContext {
    return { ...this.newContext(null, -1, 0, h.depth), primary: [h.target], eventTarget: h.target }
  }

  private spawnZone(e: ResolvedEffect, ctx: CastContext, name: string) {
    let anchor: Ally | null = null
    let pos: Vec | undefined
    if (e.target === 'origin') pos = ctx.origin
    else if (e.target === 'self') anchor = this.player
    else if (e.target === 'event') anchor = ctx.eventTarget ?? null
    else anchor = this.pick('lowest', ctx, e, 1)[0] ?? null
    pos = pos ?? anchor?.pos
    if (!pos || e.duration <= 0 || e.interval <= 0) return
    this.zones.push({
      id: this.nextId++,
      name,
      effect: e,
      pos: { ...pos },
      anchor: e.follow ? anchor : null,
      radius: e.radius,
      amount: e.amount,
      interval: e.interval,
      duration: e.duration,
      nextTick: this.time + e.interval,
      endsAt: this.time + e.duration,
      tick: 0,
      damageReduction: e.damageReduction,
      depth: ctx.depth,
    })
  }

  private addShield(target: Ally, amount: number, duration: number, name: string, key: string) {
    if (!target.alive || amount <= 0) return
    const cap = target.maxHp * SHIELD_CAP
    const existing = target.shields.find((s) => s.key === key)
    if (existing) {
      existing.amount = Math.min(cap, existing.amount + amount)
      existing.endsAt = this.time + duration
    } else target.shields.push({ key, name, amount: Math.min(cap, amount), endsAt: this.time + duration })
  }

  /** Talent buffs get Potency here; buff effects (Sprint) already have it, so they pass `potency: false`. */
  private addBuff(spec: BuffSpec, potency = true) {
    const duration = potency ? spec.duration * (1 + this.stats().potency / 100) : spec.duration
    this.buffs = this.buffs.filter((b) => b.id !== spec.id)
    this.buffs.push({
      id: spec.id,
      name: spec.name,
      duration,
      endsAt: this.time + duration,
      stats: spec.stats ?? {},
      mods: spec.mods ?? [],
      consumeOn: spec.consumeOn,
    })
  }

  private hitBoss(e: ResolvedEffect, ctx: CastContext) {
    const crit = this.rng() * 100 < e.critChance
    const amount = e.amount * (crit ? e.critMultiplier : 1)
    if (Number.isFinite(this.boss.hp)) this.boss.hp -= amount
    this.meter.damage += amount
    this.beam(this.player.pos, this.boss.pos, '#ffe9a0')
    this.text(this.boss.pos, `${int(amount)}${crit ? '!' : ''}`, '#ffd23f', crit)
    const ev: GameEvent = { kind: 'hit', tags: e.tags, ctx, amount, crit }
    this.emit(ev)
    if (crit) this.emit({ ...ev, kind: 'crit' })
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
    } else this.dashing = { from, to, start: this.time }
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
      if (p.chance !== undefined && this.rng() * 100 >= p.chance) return
      for (const action of p.actions) this.act(action, rp, ev)
    })
  }

  private childContext(ev: GameEvent, ability: ResolvedAbility | null): CastContext {
    return {
      ...ev.ctx,
      ability: ability ?? ev.ctx.ability,
      primary: ev.target ? [ev.target] : [],
      eventTarget: ev.target,
      depth: ev.ctx.depth + 1,
      range: ability?.range || HEAL_RANGE,
    }
  }

  private act(action: Action, rp: ResolvedProc, ev: GameEvent) {
    const name = rp.source.talentName
    const ctx = this.childContext(ev, null)
    switch (action.do) {
      case 'mana':
        this.gainMana(action.amount, name)
        break
      case 'refund':
        if (ev.ctx.cost > 0 && !this.refunded.has(ev.ctx.castId)) {
          this.refunded.add(ev.ctx.castId)
          this.gainMana((ev.ctx.cost * action.pct) / 100, name)
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
        const targets =
          action.scope === 'event'
            ? ev.target
              ? [ev.target]
              : []
            : action.scope === 'near'
              ? this.allies.filter((a) => dist(a.pos, this.player.pos) <= (action.radius ?? 10))
              : this.allies
        for (const t of targets) for (const h of t.hots) if (matches(action.match, h.effect.tags)) h.endsAt += action.seconds
        if (action.scope === 'all') for (const z of this.zones) if (matches(action.match, z.effect.tags)) z.endsAt += action.seconds
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
        if (!ev.target || ev.kind === 'cast') {
          for (const z of [...this.zones]) if (matches(action.match, z.effect.tags)) this.zoneBurst(z, action.seconds, name)
        }
        break
      case 'burst':
        if (ev.hot) {
          const h = ev.hot
          this.heal(h.target, this.tickOf(h) * (action.seconds / h.interval), h.effect, this.hotContext(h), { label: name })
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
      case 'fire': {
        const a = this.kit.resolve(action.ability, this.buffMods(), this.stats())
        if (a) this.runEffects(a, { ...ctx, ability: a, range: a.range || HEAL_RANGE }, undefined, action.at === 'event' ? 'event' : undefined)
        break
      }
    }
    if (action.do !== 'mana' && action.do !== 'refund') this.addLog(`${name} triggers`, 'proc')
  }

  /** One tick of a HoT or zone, after its growth or decay so far. */
  private tickOf(x: Hot | Zone) {
    return tickAmount({ amount: x.amount, growth: x.effect.growth }, x.tick)
  }

  private zoneBurst(z: Zone, seconds: number, label: string) {
    const amount = this.tickOf(z) * (seconds / z.interval)
    this.ring(z.pos, z.radius, z.effect.color)
    for (const a of this.allies) {
      if (a.alive && dist(a.pos, z.pos) <= z.radius) this.heal(a, amount, z.effect, this.zoneContext(z), { label })
    }
  }

  private zoneContext(z: Zone): CastContext {
    return this.newContext(null, -1, 0, z.depth)
  }

  // ---------- Conditions and targeting ----------

  /** For conditional bonuses, checked on the target as the heal lands. */
  private meets(when: Condition, target: Ally): boolean {
    if (when.targetBelow !== undefined && (target.hp / target.maxHp) * 100 >= when.targetBelow) return false
    if (when.targetHas !== undefined && !target.hots.some((h) => matches(when.targetHas!, h.effect.tags))) return false
    if (when.inZone && !this.inZone(target)) return false
    if (when.targetSelf && !target.isPlayer) return false
    return true
  }

  /** For procs: the same checks against the event, with health from before the heal. */
  private eventMeets(when: Condition, ev: GameEvent): boolean {
    if (when.overheal && !((ev.overheal ?? 0) > 0)) return false
    const target = ev.target
    const needsTarget = when.targetBelow !== undefined || when.targetHas !== undefined || when.inZone || when.targetSelf
    if (!needsTarget) return true
    if (!target) return false
    if (when.targetBelow !== undefined && (ev.before ?? target.hp / target.maxHp) * 100 >= when.targetBelow) return false
    return this.meets({ ...when, targetBelow: undefined }, target)
  }

  inZone(a: Ally): boolean {
    return this.zones.some((z) => dist(z.pos, a.pos) <= z.radius)
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
        return []
    }
  }

  // ---------- Mana ----------

  private gainMana(n: number, source: string, quiet = false) {
    const before = this.mana
    this.mana = Math.min(this.maxMana, this.mana + n)
    const gained = this.mana - before
    if (gained <= 0) return
    this.meter.manaGained.set(source, (this.meter.manaGained.get(source) ?? 0) + gained)
    if (!quiet && gained >= 1) this.text(this.player.pos, `+${int(gained)} mana`, '#5aa9ff', false)
  }

  private spend(n: number, source: string) {
    if (n <= 0) return
    this.mana = Math.max(0, this.mana - n)
    this.meter.manaSpent.set(source, (this.meter.manaSpent.get(source) ?? 0) + n)
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

  private updateZones() {
    for (const z of [...this.zones]) {
      if (z.anchor?.alive) z.pos = { ...z.anchor.pos }
      while (z.nextTick <= z.endsAt + 1e-6 && z.nextTick <= this.time) {
        const amount = this.tickOf(z)
        for (const a of this.allies) {
          if (a.alive && dist(a.pos, z.pos) <= z.radius) this.heal(a, amount, z.effect, this.zoneContext(z), { label: z.name })
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
      return
    }
    const len = Math.hypot(input.move.x, input.move.y)
    if (len === 0) return
    const dir = { x: input.move.x / len, y: input.move.y / len }
    const speed = RUN_SPEED * (1 + this.stats().speed / 100)
    this.facing = dir
    p.pos = inArena({ x: p.pos.x + dir.x * speed * dt, y: p.pos.y + dir.y * speed * dt })
  }

  private moveBots(dt: number) {
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
        const stepLen = RUN_SPEED * dt
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

  // ---------- The boss ----------

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

  private bossEvent(ev: ScenarioEvent, scale: number) {
    const alive = this.allies.filter((a) => a.alive)
    if (alive.length === 0) return
    switch (ev.kind) {
      case 'melee': {
        const tanks = alive.filter((a) => a.role === 'tank')
        const order = this.allies.filter((a) => a.role === 'tank')
        const turn = ev.swap ? Math.floor(this.time / ev.swap) % Math.max(1, order.length) : 0
        const tank = order[turn]?.alive ? order[turn] : (tanks[0] ?? alive[0])
        this.damage(tank, ev.amount * (0.85 + this.rng() * 0.3) * scale, 'Melee')
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
          const h: Hazard = {
            id: this.nextId++,
            name: ev.name,
            pos,
            radius: ev.radius,
            armAt: this.time + ev.warn,
            endsAt: this.time + ev.warn + ev.duration,
            dps: ev.dps,
            nextTick: this.time + ev.warn,
          }
          this.hazards.push(h)
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
        target.hp = Math.min(target.maxHp, target.hp + ev.amount)
        this.text(target.pos, `+${int(ev.amount)}`, '#9aa79d', false)
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

  private updateBoss(dt: number) {
    if (Number.isFinite(this.boss.hp)) {
      for (const a of this.allies) if (a.alive) this.boss.hp -= a.dps * dt
      if (this.boss.hp <= 0) {
        this.boss.hp = 0
        this.ended = 'victory'
        this.addLog(`${this.boss.name} is defeated`, 'info')
      }
    }
    if (!this.allies.some((a) => a.alive)) {
      this.ended = 'wipe'
      this.addLog('Everyone is dead', 'death')
    }
  }

  private damage(a: Ally, amount: number, source: string, quiet = false) {
    if (!a.alive || amount <= 0) return
    const zoneDr = Math.max(0, ...this.zones.filter((z) => dist(z.pos, a.pos) <= z.radius).map((z) => z.damageReduction))
    const dr = Math.min(90, zoneDr + (a.isPlayer ? this.stats().damageReduction : 0))
    let left = amount * (1 - dr / 100)
    for (const s of a.shields) {
      const absorbed = Math.min(s.amount, left)
      s.amount -= absorbed
      left -= absorbed
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
