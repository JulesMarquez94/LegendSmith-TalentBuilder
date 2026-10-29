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
  /** A curse on an enemy that something else sets off (Carrion Curse: your minions' hits). */
  | 'debuff'
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
  /** % chance to turn aside an enemy's melee swing (the boss's, an add's), so it does nothing. */
  | 'parry'
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
  /** Resource you gain each time an enemy's hit lands on you (Rage). In the weapon's own units. */
  | 'resourceWhenHit'
  /** Resource you gain each time you parry. In the weapon's own units. */
  | 'resourceOnParry'
  /** % chance each minion you sacrifice to pay for an ability survives, and isn't spent (the book's imps). */
  | 'spareChance'
  /**
   * Combo weapons: each step past the first adds this % on top of its usual 100%, so three steps at
   * +20% land at 1 + 2 × 1.2 = 3.4 times the ability's strength.
   */
  | 'comboBonus'
  /**
   * Your ranged single-target direct damage also hits every enemy within 8 yd of its target for this %
   * of what it dealt (Volley).
   */
  | 'splash'
  /** % of overhealing stored, then given back as resource by the next main attack. */
  | 'overhealToResource'
  /** % stronger resource regeneration while below 30% of the maximum. */
  | 'lowResourceRegen'
  /** Extra regeneration, as a % of your maximum resource per second, while you stand in one of your zones. */
  | 'zoneResourceRegen'

export type CharStats = Record<CharStat, number>

/** Numbers that belong to an ability as a whole. Talents aim these at the ability's tags. */
export type AbilityKey =
  | 'cost'
  | 'castTime'
  | 'cooldown'
  | 'charges'
  | 'range'
  | 'gcd'
  | 'echo'
  /** An ability that spends all: % more that what it spends past its cost counts for. */
  | 'surplus'
  /** Seconds: above 0, the ability is passive and goes off on its own this often, for free (Endless Harvest). */
  | 'autocast'
  /** Above 0, an ability that's `notWhileCasting` can be used mid-cast after all (Teleport's Spellstride). */
  | 'whileCasting'

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
  /** How many of a summon can be up at once. */
  | 'max'
  /** How many stacks a stacking DoT can reach. */
  | 'maxStacks'
  /** A buff's stats: talents make them bigger (Frenzy's haste, Volley's splash). */
  | 'strength'
  /** Seconds a hit taunts its enemies for. */
  | 'taunt'
  /** % of each hit splashed onto every other enemy within 8 yd of the one it hit. */
  | 'splash'
  /** % more splash when the cast hits only one enemy. */
  | 'soloSplash'
  /** Seconds after a teleport to use it again and go back where you were, for free (Recall). */
  | 'returnWindow'
  /** % chance a curse's stack bursts without being taken (Undying Hex). */
  | 'keepChance'
  /** A summon (the Overlord): % more damage for every other minion while it's up. */
  | 'empower'
  /** A summon: % faster attacks for every other minion while it's up. */
  | 'hasten'
  /** A summon: seconds it gains when one of your other minions falls. No cap. */
  | 'feed'
  /** A summon: a meteor of this much damage at every 5th minion that falls while it's up (Impending Doom). */
  | 'meteor'
  /** A summon: seconds its every attack adds to your other minions. */
  | 'sustain'
  /** A summon: above 0, it attacks faster by the haste your ultimate's buffs give you, live. */
  | 'patron'

export type ValueKey = AbilityKey | EffectKey

export const ABILITY_KEYS: ReadonlySet<ValueKey> = new Set<ValueKey>([
  'cost',
  'castTime',
  'cooldown',
  'charges',
  'range',
  'gcd',
  'echo',
  'surplus',
  'autocast',
  'whileCasting',
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
  /** Raises a minion of its own (a ghoul) that hits your target for `amount` every `interval` sec for `duration` sec. */
  | 'summon'
  /** Curses an enemy with `stacks` stacks: each hit from your minions takes one and deals `amount` more damage. */
  | 'curse'
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
  /** Lost as soon as you use an ability that doesn't match this (Rapid Fire: anything but the main attack). */
  lostUnless?: Match
  /** Another stack doesn't refresh its timer: every stack ends when the first one does (Dark Bargain). */
  keepsTimer?: boolean
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
  /** Seconds after a teleport to use it again and go back where you were, for free. */
  returnWindow?: number
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
  /** Stacks added per application of a rolling or stacking DoT. Default 1. */
  stacks?: number
  /**
   * A stacking DoT (Festering Wound): each application adds `stacks` up to this many and refreshes
   * them all, and each tick hits once per stack. Leave out for a DoT that only refreshes.
   */
  maxStacks?: number
  /** Summons: how many can be up at once; one more replaces the oldest. Default 1. */
  max?: number
  /** Damage is multiplied by how many of your effects matching this the target has (Harvest's "per DoT"). */
  perEffect?: Match
  /** On a combo weapon, what grows with each step a cast pays for: its amount (default) or its duration (Rupture). */
  grows?: 'amount' | 'duration'
  /** For aura effects: the stats you and your group get. */
  stats?: Partial<CharStats>
  /** Direct damage that taunts: every enemy it hits attacks only you for this many seconds. */
  taunt?: number
  /** % of each hit splashed onto every other enemy within 8 yd of the one it hit (Harvest's talents). */
  splash?: number
  /** A curse: % chance a stack bursts without being taken. */
  keepChance?: number
  /** A summon: % more damage for your other minions while it's up. */
  empower?: number
  /** A summon: % faster attacks for your other minions while it's up. */
  hasten?: number
  /**
   * Fires only when its ability goes off on its own (`autocast`), and then instead of the others:
   * Emanation turns Miasma's zone into a Pox around you every 10 sec.
   */
  auto?: boolean
  /** Potency and duration talents don't lengthen it (Barbed Arrows' bleed always lasts 5 sec). */
  fixedDuration?: boolean
  /**
   * A DoT that never stacks: applying it to an enemy that has it adds its duration to what's left,
   * instead of refreshing it (Barbed Arrows: each arrow adds 5 sec to the one bleed).
   */
  addsDuration?: boolean
}

/** When a conditional bonus applies. Every field set must hold. */
export interface Condition {
  /**
   * The cast paid its cost at least this many times over: steps on a combo weapon, or what an ability
   * that spends all spent against its cost. Procs only.
   */
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
  /** The cast hit only one enemy (Lone Reaper). */
  single?: boolean
  /** Only one enemy has one of your effects matching this (Concentrated Pox). Enemies only. */
  alone?: Match
  /** The bonus counts once for each minion you command, Overlords aside (Lord of the Legion). */
  perMinion?: boolean
}

export interface ModMechanic {
  kind: 'mod'
  key: ValueKey
  match: Match
  /** Flat change, before percentages. */
  add?: number
  /** % change. All percentages on the same number add together. */
  pct?: number
  /** A % change equal to one of your stats, added to the others (Ripening: Potency on Harvest's damage). */
  pctOf?: CharStat
  /** Only for `amount`: a bonus that applies only when this holds, checked as the hit or heal lands. */
  when?: Condition
}

/**
 * What procs listen for. `cast` fires when a cast finishes (mobility included), `heal` and `crit`
 * on every heal that lands (HoT ticks too), `hit` on every damage that lands (DoT ticks and minion
 * attacks too; `crit` again when it crits), `tick` once per zone tick, and `expire` when a HoT,
 * DoT or zone runs out. `gain` fires when you gain resource: once per gain from an ability or talent,
 * and once for every 10% of your maximum you regenerate. `parry` fires when you parry a swing; its
 * enemy is the one that swung. `second` fires once every second of the fight while you're alive,
 * so a proc with `every: 5` goes off every 5 sec. `sacrifice` fires once for each minion you
 * sacrifice to pay for an ability, and `moving` once for every second you spend moving.
 */
export type EventKind =
  | 'cast'
  | 'heal'
  | 'crit'
  | 'hit'
  | 'tick'
  | 'expire'
  | 'gain'
  | 'parry'
  | 'second'
  | 'sacrifice'
  | 'moving'

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
  /**
   * Ends your effects matching this (DoTs on the event's enemy, HoTs on your allies, your zones and
   * summons) and hits the event's enemy for `pct`% of the event's damage per second they had left.
   */
  | { do: 'absorb'; match: Match; pct: number }
  /** Adds seconds to one of your buffs while it's up (Frenzy, fed by spending). */
  | { do: 'extendBuff'; buff: string; seconds: number }
  /** Copies a matching DoT from the event's target to the nearest enemy in range that doesn't have it. */
  | { do: 'spread'; match: Match; range: number }
  /**
   * Gives back `pct`% of what your main attack gives right now, spread over `seconds`: one tick a
   * second, in whole points, with what doesn't divide carried to the next tick (Barbed Arrows: 12
   * focus over 5 sec lands as 2, 2, 3, 2, 3). Stops if the event's enemy dies. With `extends`, a new
   * one on an enemy that already has one from the same talent adds its points and seconds to it.
   */
  | { do: 'trickle'; pct: number; seconds: number; extends?: boolean }
  /** Adds seconds to every imp you command (the book's minions, which last a while). */
  | { do: 'extendImps'; seconds: number }
  /** Adds seconds to every minion you command: imps and summons (ghouls) alike. */
  | { do: 'extendMinions'; seconds: number }
  /** Adds stacks to your matching curse on the event's enemy, never past what it started with. */
  | { do: 'curseStack'; match: Match; stacks: number }
  /** Does one of these, picked at random (Dark Bargain: haste, crit, echo or minion power). */
  | { do: 'oneOf'; actions: Action[] }
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
  /** Seconds before it can go off again. */
  cooldown?: number
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
  /**
   * Spends all your resource, at least `cost`, and grows with what it spends: twice the cost is twice
   * the strength (more with `surplus`). Effects grow in amount, or in duration with `grows`.
   */
  spendsAll?: boolean
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
  /** Off the global cooldown, but not while you cast (Teleport). A `whileCasting` talent lifts it. */
  notWhileCasting?: boolean
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
  returnWindow: number
  speed: number
  extraCost: number
  stacks: number
  /** A stacking DoT's cap; 0 for any other effect. */
  maxStacks: number
  max: number
  mode?: 'dash' | 'teleport'
  buff?: BuffSpec
  hostile?: boolean
  inflicts?: ResolvedEffect
  rolling?: boolean
  addsDuration?: boolean
  perEffect?: Match
  grows?: 'amount' | 'duration'
  stats?: Partial<CharStats>
  /** Seconds the enemies it hits attack only you; 0 for an effect that doesn't taunt. */
  taunt: number
  splash: number
  soloSplash: number
  keepChance: number
  empower: number
  hasten: number
  feed: number
  meteor: number
  sustain: number
  patron: number
  auto?: boolean
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
  /** It spends all your resource: `surplus` is its bonus on what's past the cost, `atFull` its strength with a full bar. */
  spendsAll?: { surplus: number; atFull: number }
  cycle?: boolean
  castTime: number
  cooldown: number
  charges: number
  range: number
  gcd: number
  /** % chance to be cast a second time for free. */
  echo: number
  /** Above 0, it's passive: it goes off on its own every this many seconds, for free. */
  autocast: number
  /** Can't be used while you cast. */
  notWhileCasting: boolean
  passive?: { on: EventKind; match: Match }
  minion?: ResolvedEffect
  effects: ResolvedEffect[]
  text: string
}
