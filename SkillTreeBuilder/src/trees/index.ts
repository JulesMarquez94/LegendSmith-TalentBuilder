import type { Loadout, PointRules } from '../talents/loadout.ts'
import type { ArtifactDef, TreeDef } from '../talents/types.ts'
import { bloom, chainHeal, conduit, healingRain, mend, renew } from './healer/heals.ts'
import { lifewardenStaff } from './healer/staff.ts'
import { lifetide, miracle, sanctuary } from './healer/ultimates.ts'
import { dash, sprint, teleport } from './mobility.ts'
import { plague } from './plague.ts'
import { armyOfTheDead, bloodFrenzy, boneSpear, raiseGhoul, shadowStep, soulSiphon, wraithWalk } from './playtest.ts'

/**
 * One talent point per level up to 60, and no more than 12 in any one tree, as in the overview's
 * "Ability slots and talent trees".
 */
export const POINT_RULES: PointRules = { total: 60, perTree: 12 }

/** The damage placeholder the Plague and playtest trees sit under. It has no main attack or tree yet. */
export const tomeOfSummoning: ArtifactDef = {
  id: 'tome-of-summoning',
  name: 'Tome of Summoning',
  color: '#c89b4c',
  role: 'damage',
  roleKind: 'damage',
  resource: 'None yet',
  description: 'Damage. A placeholder for the Plague and playtest trees: no main attack or talents yet.',
}

/** Every artifact that can be held. Add new ones here. */
export const ARTIFACTS: readonly ArtifactDef[] = [lifewardenStaff, tomeOfSummoning]

/** Every tree that can be slotted, artifact trees included. Add new trees here. */
export const TREES: readonly TreeDef[] = [
  ...ARTIFACTS.flatMap((a) => (a.tree ? [a.tree] : [])),
  // Healer
  mend,
  chainHeal,
  healingRain,
  renew,
  bloom,
  conduit,
  miracle,
  sanctuary,
  lifetide,
  // Damage
  plague,
  boneSpear,
  raiseGhoul,
  soulSiphon,
  bloodFrenzy,
  armyOfTheDead,
  // Mobility, for every role
  dash,
  teleport,
  sprint,
  shadowStep,
  wraithWalk,
]

/** What the builder opens with: the healer kit, ready for the test arena. */
export const STARTING_LOADOUT: Loadout = {
  artifact: lifewardenStaff.id,
  slots: [lifewardenStaff.tree!.id, 'mend', 'renew', 'healing-rain', 'miracle', 'dash'],
  ranks: {},
}
