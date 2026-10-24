import type { Loadout, PointRules } from '../talents/loadout.ts'
import type { ArtifactDef, TreeDef } from '../talents/types.ts'
import { GROUP_BUFFS } from './buffs.ts'
import { aimedShot, multiShot, poisonArrow, rainOfArrows } from './archery.ts'
import { ashwoodLongbow } from './bow.ts'
import { doomBolt } from './doom.ts'
import { backstab, eviscerate, fanOfKnives, rupture, twinDaggers } from './daggers.ts'
import { fervor } from './fervor.ts'
import { bloom, chainHeal, conduit, healingRain, mend, renew } from './healer/heals.ts'
import { lifewardenStaff } from './healer/staff.ts'
import { lifetide, miracle, sanctuary } from './healer/ultimates.ts'
import { dash, sprint, teleport } from './mobility.ts'
import { ashfall, festeringRot, harvest, miasma, necroticExplosion } from './necro/spells.ts'
import { tomeOfSummoning } from './necro/tome.ts'
import { plague } from './plague.ts'
import { armyOfTheDead, bloodFrenzy, boneSpear, raiseGhoul, shadowStep, soulSiphon, wraithWalk } from './playtest.ts'

/**
 * One talent point per level up to 60, and no more than 12 in any one tree, as in the overview's
 * "Ability slots and talent trees".
 */
export const POINT_RULES: PointRules = { total: 60, perTree: 12 }

/** Every artifact that can be held. Add new ones here. */
export const ARTIFACTS: readonly ArtifactDef[] = [lifewardenStaff, tomeOfSummoning, twinDaggers, ashwoodLongbow]

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
  // Summoner
  plague,
  harvest,
  festeringRot,
  miasma,
  necroticExplosion,
  ashfall,
  boneSpear,
  raiseGhoul,
  soulSiphon,
  bloodFrenzy,
  armyOfTheDead,
  // Spells any damage weapon can cast
  doomBolt,
  // Daggers
  eviscerate,
  rupture,
  fanOfKnives,
  backstab,
  // Bow
  aimedShot,
  multiShot,
  poisonArrow,
  rainOfArrows,
  // Ultimates for every role
  fervor,
  // Mobility, for every role
  dash,
  teleport,
  sprint,
  shadowStep,
  wraithWalk,
  // Group buffs, by role
  ...GROUP_BUFFS,
]

/** What the builder opens with: the healer kit, ready for the test arena. */
export const STARTING_LOADOUT: Loadout = {
  artifact: lifewardenStaff.id,
  slots: [lifewardenStaff.tree!.id, 'mend', 'renew', 'healing-rain', 'miracle', 'dash', 'vitality-aura', null],
  ranks: {},
}

export { ashwoodLongbow, tomeOfSummoning, twinDaggers }
