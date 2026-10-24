import { ranks } from '../game/format.ts'
import type {
  Action,
  BuffSpec,
  CharStat,
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
  row: number
  col: number
  requires?: string
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

/** Gives back resource (mana for the staff). */
export const restore = (amount: number): Action => ({ do: 'restore', amount })

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
