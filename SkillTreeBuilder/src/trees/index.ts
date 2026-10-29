import { MAX_LEVEL, pointsAt } from '../talents/levels.ts'
import type { Loadout, PointRules } from '../talents/loadout.ts'
import type { ArtifactDef, TreeDef } from '../talents/types.ts'
import { GROUP_BUFFS } from './buffs.ts'
import { aimedShot, multiShot, poisonArrow, rainOfArrows } from './archery.ts'
import { ashwoodLongbow } from './bow.ts'
import { carrionCurse } from './curse.ts'
import { overlord } from './overlord.ts'
import { doomBolt } from './doom.ts'
import { frenzy } from './frenzy.ts'
import { volley } from './volley.ts'
import { festeringWound } from './wound.ts'
import { backstab, eviscerate, fanOfKnives, rupture, twinDaggers } from './daggers.ts'
import { fervor } from './fervor.ts'
import { tomeOfDawn } from './healer/dawn.ts'
import { bloom, chainHeal, conduit, healingRain, mend, renew } from './healer/heals.ts'
import { lifewardenStaff } from './healer/staff.ts'
import { lifetide, miracle, sanctuary } from './healer/ultimates.ts'
import { dash, sprint, teleport } from './mobility.ts'
import { ashfall, festeringRot, harvest, miasma, necroticExplosion } from './necro/spells.ts'
import { tomeOfSummoning } from './necro/tome.ts'
import { plague } from './plague.ts'
import { raiseGhoul } from './ghoul.ts'
import { armyOfTheDead, boneSpear, shadowStep, soulSiphon, wraithWalk } from './playtest.ts'
import { bloodFrenzy } from './blood.ts'
import { spear } from './spear.ts'
import { TANK_ABILITIES } from './tank/abilities.ts'
import { greatsword } from './tank/greatsword.ts'
import { swordAndShield } from './tank/shield.ts'

/**
 * One talent point a level from level 9 (levels 1–8 open the slots), 52 at level 60, and no more than
 * 10 in any one tree. The small trees take less: 5 for the ultimate's and the group buff's, 6 for
 * mobility's. This is the most at level 60; `rulesAt` gives the points at a lower level.
 */
export const POINT_RULES: PointRules = { total: pointsAt(MAX_LEVEL), perTree: 10, perSmall: 5, perMobility: 6 }

/**
 * Every artifact that can be held, two per seat: tank, healer, melee and ranged damage. The picker
 * groups them by seat. Add new ones here. The Sword & Shield, Greatsword, Tome of Dawn and Spear are
 * first versions (`firstVersion`), to be replaced by their real designs.
 */
export const ARTIFACTS: readonly ArtifactDef[] = [
  lifewardenStaff,
  tomeOfSummoning,
  twinDaggers,
  ashwoodLongbow,
  swordAndShield,
  greatsword,
  tomeOfDawn,
  spear,
]

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
  volley,
  frenzy,
  carrionCurse,
  overlord,
  festeringWound,
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
  // Tank (first versions)
  ...TANK_ABILITIES,
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
/** You start at level 1, holding the staff, with only its main attack: each level up opens the next slot. */
export const STARTING_LOADOUT: Loadout = {
  level: 1,
  artifact: lifewardenStaff.id,
  slots: [lifewardenStaff.tree!.id, null, null, null, null, null, null, null],
  ranks: {},
}

export { ashwoodLongbow, greatsword, spear, swordAndShield, tomeOfDawn, tomeOfSummoning, twinDaggers }
