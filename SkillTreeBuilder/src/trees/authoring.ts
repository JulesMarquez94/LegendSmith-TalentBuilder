import { ranks } from '../game/format.ts'
import type {
  Action,
  BuffSpec,
  CharStat,
  CharStats,
  Condition,
  EffectSpec,
  EventKind,
  Match,
  Mechanic,
  ModMechanic,
  ProcSpec,
  TargetRule,
  ValueKey,
} from '../game/types.ts'
import type { TalentDef } from '../talents/types.ts'

// Helpers for writing playable trees, so a talent's text and what it does come from the same numbers.

interface TalentInput {
  id: string
  name: string
  /** File name (without .png) in the tree's art folder. */
  icon?: string
  row: number
  col: number
  requires?: string
  /** A talent this is a choice with: one or the other, not both. */
  excludes?: string
  /** One value per rank. "{}" in the text shows them as "{6/12/18}". Leave out for a one-rank talent. */
  per?: readonly number[]
  /** "@resource" shows the artifact's resource ("mana"), so shared abilities fit any healing weapon. */
  text: string
  /** What the talent does with its value at a rank. */
  does: (value: number) => Mechanic[]
}

export function talent({ per, text, does, ...rest }: TalentInput): TalentDef {
  const values = per ?? [1]
  return {
    ...rest,
    maxRank: values.length,
    description: per ? text.replaceAll('{}', ranks(per)) : text,
    effects: (rank) => does(values[Math.min(Math.max(rank, 1), values.length) - 1]),
  }
}

// ---------- Mechanics ----------

/** % more (or less, with a negative) of a number, on whatever matches. */
export const more = (key: ValueKey, match: Match, pct: number, when?: Condition): ModMechanic =>
  when ? { kind: 'mod', key, match, pct, when } : { kind: 'mod', key, match, pct }

/** % more of a number on whatever matches, equal to one of your stats (Ripening: Potency on Harvest). */
export const moreByStat = (key: ValueKey, match: Match, s: CharStat): ModMechanic => ({ kind: 'mod', key, match, pctOf: s })

/** A flat change to a number, on whatever matches. */
export const plus = (key: ValueKey, match: Match, add: number): ModMechanic => ({ kind: 'mod', key, match, add })

export const stat = (s: CharStat, add: number): Mechanic => ({ kind: 'stat', stat: s, add })

/** Adds an effect to an ability. */
export const grant = (to: string, effect: EffectSpec): Mechanic => ({ kind: 'grant', to, effect })

export const proc = (
  on: EventKind,
  match: Match,
  actions: Action[],
  options: Omit<ProcSpec, 'on' | 'match' | 'actions'> = {},
): Mechanic => ({ kind: 'proc', proc: { on, match, actions, ...options } })

export const buff = (spec: BuffSpec): Action => ({ do: 'buff', buff: spec })

export const apply = (effect: EffectSpec, ofEvent?: { pct: number; of: 'amount' | 'overheal' }): Action =>
  ofEvent ? { do: 'apply', effect, ofEvent } : { do: 'apply', effect }

/** Gives back a flat amount of resource. Only for a weapon's own tree (mana, an imp, a combo point). */
export const restore = (amount: number): Action => ({ do: 'restore', amount })

/** Gives back a % of your maximum resource: for shared trees, so it means the same on any weapon. */
export const restoreShare = (pctMax: number): Action => ({ do: 'restore', pctMax })

/** Gives back a % of what the triggering cast cost (once per cast). */
export const refund = (pct: number): Action => ({ do: 'refund', pct })

export const cooldown = (match: Match, seconds: number): Action => ({ do: 'cooldown', match, seconds })

// ---------- Effects ----------

type Extra = Partial<EffectSpec>

export const heal = (amount: number, target: TargetRule = 'lowest', extra: Extra = {}): EffectSpec => ({
  type: 'heal',
  amount,
  target,
  ...extra,
})

export const hot = (
  amount: number,
  duration: number,
  interval: number,
  target: TargetRule = 'lowest',
  extra: Extra = {},
): EffectSpec => ({ type: 'hot', amount, duration, interval, target, ...extra })

export const zone = (
  amount: number,
  duration: number,
  interval: number,
  radius: number,
  target: TargetRule = 'lowest',
  extra: Extra = {},
): EffectSpec => ({ type: 'zone', amount, duration, interval, radius, target, ...extra })

export const shield = (amount: number, duration: number, target: TargetRule, extra: Extra = {}): EffectSpec => ({
  type: 'shield',
  amount,
  duration,
  target,
  ...extra,
})

/** A buff on you that potency and duration talents can lengthen, like Sprint. */
export const selfBuff = (spec: BuffSpec): EffectSpec => ({
  type: 'buff',
  target: 'self',
  duration: spec.duration,
  buff: spec,
})

// ---------- Damage, minions and group buffs ----------

/** Direct damage to the enemy nearest your crosshair; give it a `radius` to hit everything that close to it. */
export const damage = (amount: number, target: TargetRule = 'target', extra: Extra = {}): EffectSpec => ({
  type: 'damage',
  amount,
  target,
  ...extra,
})

/**
 * Damage over time on an enemy. Add `maxStacks` for one that stacks up to a cap and refreshes, or
 * `rolling: true` for stacks that each keep their own timer.
 */
export const dot = (
  amount: number,
  duration: number,
  interval: number,
  target: TargetRule = 'target',
  extra: Extra = {},
): EffectSpec => ({ type: 'dot', amount, duration, interval, target, ...extra })

/** A zone that hurts enemies inside it. With `inflicts`, it also puts that DoT on them every tick. */
/** A minion that fights on its own: `amount` every `interval` sec for `duration` sec, up to `max` at once. */
export const summon = (amount: number, interval: number, duration: number, max: number, extra: Extra = {}): EffectSpec => ({
  type: 'summon',
  amount,
  interval,
  duration,
  max,
  ...extra,
})

/** Curses an enemy with `stacks` stacks; each hit from your minions takes one for `amount` more damage. */
export const curse = (amount: number, stacks: number, duration: number, extra: Extra = {}): EffectSpec => ({
  type: 'curse',
  amount,
  stacks,
  duration,
  target: 'target',
  ...extra,
})

export const hostileZone = (
  amount: number,
  duration: number,
  interval: number,
  radius: number,
  extra: Extra = {},
): EffectSpec => ({ type: 'zone', hostile: true, amount, duration, interval, radius, target: 'target', ...extra })

/** A group buff's stats, for you and everyone in your group. */
export const aura = (stats: Partial<CharStats>): EffectSpec => ({ type: 'aura', target: 'all', stats })

/** A stat for you and your whole group (group buff talents). */
export const group = (s: CharStat, add: number): Mechanic => ({ kind: 'group', stat: s, add })

/** Copies a matching DoT from the event's target to the nearest enemy in range without it. */
export const spread = (match: Match, range: number): Action => ({ do: 'spread', match, range })
