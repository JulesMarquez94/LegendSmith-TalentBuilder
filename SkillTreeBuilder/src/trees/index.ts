import type { Loadout, PointRules } from '../talents/loadout.ts'
import type { SlotKind, TreeDef } from '../talents/types.ts'
import { plague } from './plague.ts'
import { armyOfTheDead, bloodFrenzy, boneSpear, raiseGhoul, shadowStep, soulSiphon, wraithWalk } from './playtest.ts'

/** 80 points to spend anywhere, but no more than 15 in any one tree. */
export const POINT_RULES: PointRules = { total: 80, perTree: 15 }

/** The six slots, left to right then top to bottom (3 across, 2 down). */
export const SLOTS: readonly SlotKind[] = ['artifact', 'damage', 'damage', 'damage', 'cooldown', 'mobility']

/** Slot 1's artifact. Only a placeholder for now; later it will decide what fits the other slots. */
export const ARTIFACT = { name: 'Tome of Summoning', color: '#c89b4c' }

/** Every ability that can be slotted, with its tree. Add new trees here. */
export const TREES: readonly TreeDef[] = [
  plague,
  boneSpear,
  raiseGhoul,
  soulSiphon,
  bloodFrenzy,
  armyOfTheDead,
  shadowStep,
  wraithWalk,
]

/** What the builder opens with: a tree id (or null) for each slot. */
export const STARTING_LOADOUT: Loadout = {
  slots: [null, 'plague', null, null, null, null],
  ranks: {},
}
