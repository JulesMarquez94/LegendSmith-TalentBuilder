import { describe, expect, it } from 'vitest'
import { lifewardenStaff } from '../trees/healer/staff.ts'
import { STARTING_LOADOUT, tomeOfSummoning, TREES } from '../trees/index.ts'
import { fits, setArtifact, slotKinds } from './slots.ts'

const tree = (id: string) => TREES.find((t) => t.id === id)!

describe('the artifact', () => {
  it('decides what the role slots hold', () => {
    expect(slotKinds(lifewardenStaff)).toEqual(['artifact', 'heal', 'heal', 'heal', 'cooldown', 'mobility', 'buff', 'outdoor'])
    expect(slotKinds(tomeOfSummoning)).toEqual(['artifact', 'damage', 'damage', 'damage', 'cooldown', 'mobility', 'buff', 'outdoor'])
  })

  it('clears abilities and group buffs that no longer fit when it changes, keeping shared mobility', () => {
    const start = { ...STARTING_LOADOUT, ranks: { mend: { 'greater-mend': 2 }, dash: { 'long-stride': 1 } } }
    const l = setArtifact(start, tomeOfSummoning, TREES)
    expect(l).toEqual({
      artifact: 'tome-of-summoning',
      slots: ['tome-of-summoning', null, null, null, null, 'dash', null, null],
      ranks: { dash: { 'long-stride': 1 } },
    })
    expect(setArtifact(l, lifewardenStaff, TREES).slots[0]).toBe('lifewarden-staff')
  })

  it('keeps weapon-specific abilities to their weapon, and shares role-free ultimates', () => {
    expect(fits(tree('plague'), 'damage', tomeOfSummoning)).toBe(true)
    expect(fits(tree('eviscerate'), 'damage', tomeOfSummoning)).toBe(false)
    expect(fits(tree('fervor'), 'cooldown', lifewardenStaff)).toBe(true)
    expect(fits(tree('fervor'), 'cooldown', tomeOfSummoning)).toBe(true)
    expect(fits(tree('war-cadence'), 'buff', lifewardenStaff)).toBe(false)
    expect(fits(tree('vitality-aura'), 'buff', lifewardenStaff)).toBe(true)
  })
})
