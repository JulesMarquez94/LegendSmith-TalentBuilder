import type { ArtifactDef, SlotKind } from '../talents/types.ts'

export const KIND_LABEL: Record<SlotKind, string> = {
  artifact: 'Artifact',
  damage: 'Damage',
  heal: 'Heal',
  tank: 'Tank',
  cooldown: 'Ultimate',
  mobility: 'Mobility',
  buff: 'Group buff',
  character: 'Character skills',
}

/** Seats in a group, in the order the artifact picker lists them. */
export const SEATS = ['Tank', 'Healer', 'Melee damage', 'Ranged damage'] as const

export type Seat = (typeof SEATS)[number]

/** "Tank", "Healer", "Melee damage" or "Ranged damage": the artifact's role, and its reach for damage. */
export const seatOf = (artifact: ArtifactDef): Seat =>
  artifact.role === 'tank'
    ? 'Tank'
    : artifact.role === 'healer'
      ? 'Healer'
      : artifact.reach === 'melee'
        ? 'Melee damage'
        : 'Ranged damage'
