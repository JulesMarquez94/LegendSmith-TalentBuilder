import type { SlotKind } from '../talents/types.ts'

/**
 * Effect families, from the design pillars. Talents and gear aim at families and tags, never at a
 * named ability only, so a talent that boosts heal-over-time effects boosts every HoT in the kit,
 * whichever tree it sits in.
 */
export type Family = 'direct-heal' | 'hot' | 'zone' | 'shield' | 'damage' | 'resource' | 'movement' | 'buff'

/**
 * What a talent can aim at:
 * - a family ('hot', 'zone', 'direct-heal'…), plus 'healing' on every heal, HoT and zone;
 * - a slot kind ('artifact', 'heal', 'cooldown', 'mobility');
 * - an ability id ('mend', 'chain-heal');
 * - an extra tag an ability or effect declares ('main-attack', 'chain');
 * - 'spell' on abilities (and their effects) that cost resource;
 * - '*' for everything.
 */
export type Tag = string

/** Any one of these tags, or `{ all }` for every one of them. */
export type Match = Tag | readonly Tag[] | { readonly all: readonly Tag[] }

/** Character stats. Gear gives the first group; talents and buffs can change any of them. */
export type CharStat =
  | 'health'
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
  | 'speed'
  /**
   * The artifact's resource (mana for the staff). Abilities only say "cost" and "resource", so
   * another healing weapon with its own resource can use the same heals.
   */
  | 'maxResource'
  | 'resourceRegen'
  /** % of overhealing stored, then given back as resource by the next main attack. */
  | 'overhealToResource'
  /** % stronger resource regeneration while below 30% of the maximum. */
  | 'lowResourceRegen'
  /** Extra resource per second while you stand in one of your zones. */
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

export type EffectType = 'heal' | 'chain' | 'bloom' | 'hot' | 'zone' | 'shield' | 'damage' | 'restore' | 'move' | 'buff'

/**
 * Who an effect lands on. Smart targeting, as in the pillars: heals go to the lowest-health ally
 * in range, zones are placed on that ally, and there is no click targeting.
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
}

/** One piece of what an ability does. Only the fields its type uses matter. */
export interface EffectSpec {
  type: EffectType
  /** Shown in tooltips and the healing meter when it isn't the ability's own name. */
  name?: string
  target?: TargetRule
  /** Heal, damage or shield per hit — per tick for HoTs and zones. */
  amount?: number
  duration?: number
  /** Seconds between ticks for HoTs and zones. */
  interval?: number
  /** A zone's size, or how far a chain can jump. */
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
  /** 1 = a zone follows the ally it was placed on. */
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
  /** HoTs and zones with the same key refresh instead of stacking. Defaults to "<ability>:<index>". */
  key?: string
  tags?: readonly Tag[]
}

/** When a conditional bonus applies. Every field set must hold. */
export interface Condition {
  /** Target below this % health, checked before the heal lands. */
  targetBelow?: number
  /** Target has one of your HoTs that matches. */
  targetHas?: Match
  /** Target stands in one of your zones. */
  inZone?: boolean
  /** Target has one of your HoTs or stands in one of your zones. */
  affected?: boolean
  /** Target is you. */
  targetSelf?: boolean
  /** The heal overhealed. */
  overheal?: boolean
}

export interface ModMechanic {
  kind: 'mod'
  key: ValueKey
  match: Match
  /** Flat change, before percentages. */
  add?: number
  /** % change. All percentages on the same number add together. */
  pct?: number
  /** Only for `amount`: a bonus that applies only when this holds, checked as the heal lands. */
  when?: Condition
}

/**
 * What procs listen for. `cast` fires when a cast finishes (mobility included), `heal` and `crit`
 * on every heal that lands (HoT ticks too), `hit` on damage, `tick` once per zone tick, and
 * `expire` when a HoT or zone runs out.
 */
export type EventKind = 'cast' | 'heal' | 'crit' | 'hit' | 'tick' | 'expire'

export type Action =
  | { do: 'restore'; amount: number }
  /** Gives back this % of the triggering cast's cost (once per cast). */
  | { do: 'refund'; pct: number }
  /** Applies an effect. With `ofEvent`, its amount is that % of the event's healing or overhealing. */
  | { do: 'apply'; effect: EffectSpec; ofEvent?: { pct: number; of: 'amount' | 'overheal' } }
  /**
   * Adds seconds to your HoTs and zones that match: on the event's target, everyone, allies near you,
   * or ('source') the HoT or zone whose heal triggered it, never past `capPct`% longer than it started.
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
  /** Instantly heals for this many seconds' worth of matching HoTs (on the event's target) or zones. */
  | { do: 'pulse'; match: Match; seconds: number }
  /** When a HoT or zone ends: heals for this many seconds' worth, once more. */
  | { do: 'burst'; seconds: number }
  /** Casts the triggering ability's effects again, for free. */
  | { do: 'recast' }
  /** When a HoT ends: it jumps to the most injured ally in range without it (once). */
  | { do: 'jump'; range: number }
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
  /** Adds an effect to an ability. */
  | { kind: 'grant'; to: string; effect: EffectSpec }
  | { kind: 'proc'; proc: ProcSpec }

/** The playable side of an ability: its numbers before gear and talents. */
export interface AbilitySpec {
  /** Extra tags talents can aim at, besides the ability id, slot kind and effect families. */
  tags?: readonly Tag[]
  /** Mana. */
  cost?: number
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
  /** 1.5 = crits heal for 150%. */
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
  mode?: 'dash' | 'teleport'
  buff?: BuffSpec
  conditionals: Conditional[]
  /** Added by a talent (Lingering Mend's HoT, say), not part of the base ability. */
  granted?: string
}

export interface ResolvedAbility {
  treeId: string
  name: string
  color: string
  /** The artifact's resource, lower case ("mana"), for card text. */
  resource: string
  kind: SlotKind
  tags: ReadonlySet<Tag>
  cost: number
  castTime: number
  cooldown: number
  charges: number
  range: number
  gcd: number
  /** % chance to be cast a second time for free. */
  echo: number
  passive?: { on: EventKind; match: Match }
  effects: ResolvedEffect[]
  text: string
}
