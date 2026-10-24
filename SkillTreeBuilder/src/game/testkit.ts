import type { Ranks } from '../talents/rules.ts'
import { lifewardenStaff } from '../trees/healer/staff.ts'
import { TREES } from '../trees/index.ts'
import type { Gear } from './gear.ts'
import { buildKit, type Kit } from './resolve.ts'

/** A healer kit for tests: tree ids for slots 2–6 (the staff always sits in slot 1). */
export function healerKit(slots: (string | null)[], ranks: Record<string, Ranks> = {}, gear: Gear = {}): Kit {
  const ids = [lifewardenStaff.tree!.id, ...slots]
  return buildKit({
    artifact: lifewardenStaff,
    trees: ids.map((id) => (id === null ? null : (TREES.find((t) => t.id === id) ?? null))),
    ranks,
    gear,
    catalog: TREES,
  })
}

export const abilityIn = (kit: Kit, id: string) => {
  const a = kit.slots.find((s) => s?.treeId === id)
  if (!a) throw new Error(`${id} isn't slotted`)
  return a
}
