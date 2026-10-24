import type { Ranks } from '../talents/rules.ts'
import type { ArtifactDef } from '../talents/types.ts'
import { lifewardenStaff } from '../trees/healer/staff.ts'
import { ARTIFACTS, TREES } from '../trees/index.ts'
import type { Gear } from './gear.ts'
import { buildKit, type Kit } from './resolve.ts'

/**
 * A kit for tests: tree ids for slots 2 onwards (the artifact's own tree always sits in slot 1).
 * Slots 2–4 are role abilities, then the ultimate, mobility and the group buff.
 */
export function kitFor(
  artifact: ArtifactDef,
  slots: (string | null)[],
  ranks: Record<string, Ranks> = {},
  gear: Gear = {},
): Kit {
  const ids = [artifact.tree?.id ?? null, ...slots]
  return buildKit({
    artifact,
    trees: ids.map((id) => (id === null ? null : (TREES.find((t) => t.id === id) ?? null))),
    ranks,
    gear,
    catalog: TREES,
  })
}

export const healerKit = (slots: (string | null)[], ranks: Record<string, Ranks> = {}, gear: Gear = {}) =>
  kitFor(lifewardenStaff, slots, ranks, gear)

export const artifact = (id: string) => ARTIFACTS.find((a) => a.id === id)!

export const abilityIn = (kit: Kit, id: string) => {
  const a = kit.slots.find((s) => s?.treeId === id)
  if (!a) throw new Error(`${id} isn't slotted`)
  return a
}
