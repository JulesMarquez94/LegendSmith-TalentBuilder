import type { SlotKind } from '../talents/types.ts'

/**
 * Effect families, from the design pillars. Talents and gear aim at families and tags, never at a
 * named ability only, so a talent that boosts heal-over-time effects boosts every HoT in the kit,
 * whichever tree it sits in.
 */
export type Family =
  | 'direct-heal'
  | 'hot'
  | 'zone'
  | 'shield'
  | 'direct-damage'
  | 'dot'
  /** Damage your minions deal (the pillars' Construct). */
  | 'minion'
  | 'resource'
  | 'movement'
  | 'buff'
  /** A group buff: stats for you and your group while it's slotted. */
  | 'aura'

/**
 * What a talent can aim at:
 * - a family ('hot', 'zone', 'direct-heal', 'dot'…);
 * - 'healing' on every heal, HoT and healing zone; 'damage' on every hit, DoT, minion attack and
 *   damaging zone; 'aoe' on damage that hits an area;
 * - a slot kind ('artifact', 'heal', 'damage', 'cooldown', 'mobility', 'buff');
 * - an ability id ('mend', 'plague');
 * - an extra tag an ability or effect declares ('main-attack', 'chain', 'finisher');
 * - 'spell' on abilities (and their effects) that cost resource;
 * - '*' for everything.
 */
export type Tag = string

/** Any one of these tags, or `{ all }` for every one of them. */
export type Match = Tag | readonly Tag[] | { readonly all: readonly Tag[] }

/** Character stats. Gear gives the first group; talents, group buffs and buffs can change any of them. */
export type CharStat =
  | 'health'
  /** % more maximum health (group buffs). */
  | 'healthPct'
  | 'power'
  | 'haste'
  | 'crit'
  | 'critDamage'
  | 'potency'
  | 'echo'
  | 'minionPower'
  | 'damageReduction'
  /** % chance to avoid a hit completely. */
  | 'dodge'
  /** % more healing received. */
  | 'healingTaken'
  | 'speed'
  /**
   * The artifact's resource: mana for the staff, imps for the book, combo points for the daggers.
   * Abilities only say "cost" and "resource", so any weapon of a role can use them.
   */
  | 'maxResource'
  | 'resourceRegen'
  /** Extra regeneration as a % of your maximum resource per second, so it means the same on any weapon. */
  | 'resourceRegenPct'
  /**
   * Combo weapons: each step past the first adds this % on top of its usual 100%, so three steps at
   * +20% land at 1 + 2 × 1.2 = 3.4 times the ability's strength.
   */
  | 'comboBonus'
  /** % of overhealing stored, then given back as resource by the next main attack. */
  | 'overhealToResource'
  /** % stronger resource regeneration while below 30% of the maximum. */
  | 'lowResourceRegen'
  /** Extra regeneration, as a % of your maximum resource per second, while you stand in one of your zones. */
  | 'zoneResourceRegen'

export type CharStats = Record<CharStat, number>

/** Numbers that belong to an ability as a whole. Talents aim these at the ability's tags. */
export type AbilityKey = 'cost' | 'castTime' | 'cooldown' | 'charges' | 'range' | 'gcd' | 'echo'

/** Numbers that belong to one effect of an ability. Talents aim these at the effect's tags. */
export type EffectKey =
  | 'amount'
  | 'critChance'
  | 'critDamage'
  | 'duration'
  | 'tickRate'
  | 'radius'
  | 'bounces'
  | 'falloff'
  | 'targets'
  | 'growth'
  | 'instantTicks'
  | 'follow'
  | 'damageReduction'
  | 'restore'
  | 'distance'
  | 'speed'
  | 'extraCost'
  /** Stacks a DoT adds per application. */
  | 'stacks'

export type ValueKey = AbilityKey | EffectKey

export const ABILITY_KEYS: ReadonlySet<ValueKey> = new Set<ValueKey>([
  'cost',
  'castTime',
  'cooldown',
  'charges',
  'range',
  'gcd',
  'echo',
])

export type EffectType =
  | 'heal'
  | 'chain'
  | 'bloom'
  | 'hot'
  | 'zone'
  | 'shield'
  /** Direct damage to your target; with a radius, to every enemy that close to it. */
  | 'damage'
  /** Damage over time on enemies. */
  | 'dot'
  /** One minion's attack. */
  | 'minion'
  | 'restore'
  | 'move'
  | 'buff'
  /** A group buff's stats, for you and your group. */
  | 'aura'

/**
 * Who an effect lands on. Smart targeting, as in the pillars: heals go to the lowest-health ally
 * in range, zones are placed on that ally, damage goes to the enemy nearest your crosshair, and
 * there is no click targeting.
 */
export type TargetRule =
  /** Lowest-health ally in range (you included). */
  | 'lowest'
  /** Lowest-health ally in range that doesn't already have this effect from you (for zones: isn't standing in one). */
  | 'lowest-missing'
  /** Lowest-health ally in range other than whoever the triggering heal just hit. */
  | 'next-lowest'
  /** Every ally in range. */
  | 'all'
  | 'self'
  /** Whoever the previous effect of the same cast landed on first. */
  | 'same'
  /** Whoever the triggering event landed on (procs). */
  | 'event'
  /** Allies along the path you just moved. */
  | 'path'
  /** Where you stood before you moved (zones). */
  | 'origin'
  /** The enemy nearest your crosshair, in range. */
  | 'target'
  /** Every enemy in range that has one of your DoTs or stands in one of your zones. */
  | 'afflicted'

export interface BuffSpec {
  id: string
  name: string
  duration: number
  /** Character stats while it lasts: speed %, damage reduction %, resource per second… */
  stats?: Partial<CharStats>
  /** Ability and effect changes while it lasts. */
  mods?: ModMechanic[]
  /** Used up by the next cast of an ability that matches. */
  consumeOn?: Match
  /** Getting it again adds a stack, up to this many; its stats and mods count once per stack. */
  maxStacks?: number
  /** Your whole group gets its stats, not only you (Fervor's haste). */
  group?: boolean
}

/** One piece of what an ability does. Only the fields its type uses matter. */
export interface EffectSpec {
  type: EffectType
  /** Shown in tooltips and the meters when it isn't the ability's own name. */
  name?: string
  target?: TargetRule
  /** Heal, damage or shield per hit — per tick for HoTs, DoTs and zones. */
  amount?: number
  duration?: number
  /** Seconds between ticks for HoTs, DoTs and zones, or between a minion's attacks. */
  interval?: number
  /** A zone's size, how far a chain can jump, or an explosion's reach around its target. */
  radius?: number
  bounces?: number
  /** % less healing per chain jump. */
  falloff?: number
  /** How many allies it lands on (heals, chains). */
  targets?: number
  /** % change per tick: negative decays, positive grows. */
  growth?: number
  /** Ticks that land the moment a HoT is applied. */
  instantTicks?: number
  /** 1 = a zone follows the ally or enemy it was placed on. */
  follow?: number
  /** % less damage taken by allies inside a zone. */
  damageReduction?: number
  /** Resource given back. */
  restore?: number
  distance?: number
  mode?: 'dash' | 'teleport'
  /** Bloom's extra cost per ally healed. */
  extraCost?: number
  /** For buff effects. Its `stats.speed` is the effect's `speed` value. */
  buff?: BuffSpec
  /** HoTs, DoTs and zones with the same key refresh instead of stacking. Defaults to "<ability>:<index>". */
  key?: string
  tags?: readonly Tag[]
  /** A zone that hurts enemies standing in it instead of healing allies. */
  hostile?: boolean
  /** A DoT applied to every enemy inside a hostile zone on each tick. */
  inflicts?: EffectSpec
  /** Each application is its own stack with its own timer; ticks hit once per live stack. */
  rolling?: boolean
  /** Stacks added per application of a rolling DoT. Default 1. */
  stacks?: number
  /** Damage is multiplied by how many of your effects matching this the target has (Harvest's "per DoT"). */
  perEffect?: Match
  /** On a combo weapon, what grows with each step a cast pays for: its amount (default) or its duration (Rupture). */
  grows?: 'amount' | 'duration'
  /** For aura effects: the stats you and your group get. */
  stats?: Partial<CharStats>
}

/** When a conditional bonus applies. Every field set must hold. */
export interface Condition {
  /** The cast paid its cost in at least this many steps (combo weapons). Procs only. */
  paidAtLeast?: number
  /** Target below this % health, checked before the hit or heal lands. */
  targetBelow?: number
  /** Target has one of your HoTs or DoTs that matches. */
  targetHas?: Match
  /** Target stands in one of your zones. */
  inZone?: boolean
  /** Target has one of your HoTs or DoTs, or stands in one of your zones. */
  affected?: boolean
  /** Target is you. */
  targetSelf?: boolean
  /** The heal overhealed. */
  overheal?: boolean
  /** The bonus counts once for each of your effects matching this on the target (Convalescence). */
  each?: Match
  /** The bonus counts once for each stack of your effects matching this on the target (Festering Rot). */
  stacksOf?: Match
}

export interface ModMechanic {
  kind: 'mod'
  key: ValueKey
  match: Match
  /** Flat change, before percentages. */
  add?: number
  /** % change. All percentages on the same number add together. */
  pct?: number
  /** Only for `amount`: a bonus that applies only when this holds, checked as the hit or heal lands. */
  when?: Condition
}

/**
 * What procs listen for. `cast` fires when a cast finishes (mobility included), `heal` and `crit`
 * on every heal that lands (HoT ticks too), `hit` on every damage that lands (DoT ticks and minion
 * attacks too; `crit` again when it crits), `tick` once per zone tick, and `expire` when a HoT,
 * DoT or zone runs out.
 */
export type EventKind = 'cast' | 'heal' | 'crit' | 'hit' | 'tick' | 'expire'

export type Action =
  /**
   * Gives back resource: a flat `amount` (a weapon's own tree: mana, an imp, a combo point) or
   * `pctMax`, a % of your maximum, for shared trees that must mean the same on any weapon.
   */
  | { do: 'restore'; amount?: number; pctMax?: number }
  /** Gives back this % of the triggering cast's cost (once per cast). */
  | { do: 'refund'; pct: number }
  /** Applies an effect. With `ofEvent`, its amount is that % of the event's healing or overhealing. */
  | { do: 'apply'; effect: EffectSpec; ofEvent?: { pct: number; of: 'amount' | 'overheal' } }
  /**
   * Adds (or with a negative, takes) seconds to your HoTs, DoTs and zones that match: on the event's
   * target, everyone, allies near you, or ('source') the HoT, DoT or zone whose tick triggered it,
   * never past `capPct`% longer than it started.
   */
  | {
      do: 'extend'
      match: Match
      seconds: number
      scope: 'event' | 'all' | 'near' | 'source'
      radius?: number
      capPct?: number
    }
  /** Takes seconds off matching abilities' cooldowns. Infinity resets them. */
  | { do: 'cooldown'; match: Match; seconds: number }
  | { do: 'buff'; buff: BuffSpec }
  /** Instantly lands this many seconds' worth of matching HoTs or DoTs (on the event's target) or zones. */
  | { do: 'pulse'; match: Match; seconds: number }
  /** When a HoT, DoT or zone ends: lands this many seconds' worth, once more. */
  | { do: 'burst'; seconds: number }
  /** Casts the triggering ability's effects again, for free. */
  | { do: 'recast' }
  /** When a HoT ends: it jumps to the most injured ally in range without it (once). */
  | { do: 'jump'; range: number }
  /** Copies a matching DoT from the event's target to the nearest enemy in range that doesn't have it. */
  | { do: 'spread'; match: Match; range: number }
  /** Fires another ability's effects, slotted or not. */
  | { do: 'fire'; ability: string; at?: 'event' }

export interface ProcSpec {
  on: EventKind
  match: Match
  when?: Condition
  /** % chance. */
  chance?: number
  /** Fires on every Nth matching event. */
  every?: number
  actions: Action[]
}

/** What one rank of a talent does. */
export type Mechanic =
  | ModMechanic
  | { kind: 'stat'; stat: CharStat; add: number }
  /** A stat for you and your whole group (group buff trees). */
  | { kind: 'group'; stat: CharStat; add: number }
  /** Adds an effect to an ability. */
  | { kind: 'grant'; to: string; effect: EffectSpec }
  | { kind: 'proc'; proc: ProcSpec }

/** The playable side of an ability: its numbers before gear and talents. */
export interface AbilitySpec {
  /** Extra tags talents can aim at, besides the ability id, slot kind and effect families. */
  tags?: readonly Tag[]
  /** Resource: mana, imps sacrificed, combo points. */
  cost?: number
  /** Each cast uses the next of its effects in turn (Plague's Pox, Blight, Malady). */
  cycle?: boolean
  /** Seconds; 0 is instant. */
  castTime?: number
  /** Seconds. With charges, it's the time to get one charge back. */
  cooldown?: number
  charges?: number
  range?: number
  /** Global cooldown it starts, in seconds. 0 = off the global cooldown (mobility). Default 1. */
  gcd?: number
  /** A passive: its effects fire on this event instead of being cast. */
  passive?: { on: EventKind; match: Match }
  /** For an artifact whose resource is minions: what each one does (one minion per point of resource). */
  minion?: EffectSpec
  effects: EffectSpec[]
  /** Card text with the live numbers. */
  text: (a: ResolvedAbility) => string
}

export interface Conditional {
  pct: number
  when: Condition
  /** Talent name. */
  source: string
}

export interface ResolvedEffect {
  index: number
  type: EffectType
  family: Family
  name?: string
  /** The tree's tint, for zones and beams in the arena. */
  color: string
  key: string
  tags: ReadonlySet<Tag>
  target: TargetRule
  amount: number
  critChance: number
  /** 1.5 = crits land for 150%. */
  critMultiplier: number
  duration: number
  interval: number
  ticks: number
  radius: number
  bounces: number
  falloff: number
  targets: number
  growth: number
  instantTicks: number
  follow: number
  damageReduction: number
  restore: number
  distance: number
  speed: number
  extraCost: number
  stacks: number
  mode?: 'dash' | 'teleport'
  buff?: BuffSpec
  hostile?: boolean
  inflicts?: ResolvedEffect
  rolling?: boolean
  perEffect?: Match
  grows?: 'amount' | 'duration'
  stats?: Partial<CharStats>
  conditionals: Conditional[]
  /** Added by a talent (Lingering Mend's HoT, say), not part of the base ability. */
  granted?: string
}

export interface ResolvedAbility {
  treeId: string
  name: string
  color: string
  /** The artifact's resource, lower case ("mana", "imps"), for card text. */
  resource: string
  kind: SlotKind
  tags: ReadonlySet<Tag>
  cost: number
  /**
   * On a combo weapon (the daggers) the cost is paid in steps, as many as you can afford, and every
   * step past the first adds `perStep` times the ability's strength. `maxSteps` is what a full bar
   * pays for. Absent on other weapons and on abilities that cost nothing.
   */
  combo?: { maxSteps: number; perStep: number }
  cycle?: boolean
  castTime: number
  cooldown: number
  charges: number
  range: number
  gcd: number
  /** % chance to be cast a second time for free. */
  echo: number
  passive?: { on: EventKind; match: Match }
  minion?: ResolvedEffect
  effects: ResolvedEffect[]
  text: string
}
