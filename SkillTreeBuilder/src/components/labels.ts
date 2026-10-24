import type { SlotKind } from '../talents/types.ts'

export const KIND_LABEL: Record<SlotKind, string> = {
  artifact: 'Artifact',
  damage: 'Damage',
  heal: 'Heal',
  cooldown: 'Ultimate',
  mobility: 'Mobility',
}
