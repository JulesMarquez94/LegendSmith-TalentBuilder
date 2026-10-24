import { describe, expect, it } from 'vitest'
import { lifewardenStaff } from '../trees/healer/staff.ts'
import { STARTING_LOADOUT, tomeOfSummoning, TREES } from '../trees/index.ts'
import { setArtifact, slotKinds } from './slots.ts'

describe('the artifact', () => {
  it('decides what the role slots hold', () => {
    expect(slotKinds(lifewardenStaff)).toEqual(['artifact', 'heal', 'heal', 'heal', 'cooldown', 'mobility'])
    expect(slotKinds(tomeOfSummoning)).toEqual(['artifact', 'damage', 'damage', 'damage', 'cooldown', 'mobility'])
  })

  it('clears abilities that no longer fit when it changes, keeping shared mobility', () => {
    const start = { ...STARTING_LOADOUT, ranks: { mend: { 'greater-mend': 2 }, dash: { 'long-stride': 1 } } }
    const l = setArtifact(start, tomeOfSummoning, TREES)
    expect(l).toEqual({
      artifact: 'tome-of-summoning',
      slots: [null, null, null, null, null, 'dash'],
      ranks: { dash: { 'long-stride': 1 } },
    })
    expect(setArtifact(l, lifewardenStaff, TREES).slots[0]).toBe('lifewarden-staff')
  })
})
