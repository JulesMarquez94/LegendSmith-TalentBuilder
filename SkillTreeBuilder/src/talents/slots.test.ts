import { describe, expect, it } from 'vitest'
import { lifewardenStaff } from '../trees/healer/staff.ts'
import { ashwoodLongbow, STARTING_LOADOUT, tomeOfSummoning, TREES, twinDaggers } from '../trees/index.ts'
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

  it("drops strikes the new weapon can't make, and keeps its spells", () => {
    const daggers = {
      artifact: 'twin-daggers',
      slots: ['twin-daggers', 'backstab', 'harvest', 'doom-bolt', null, 'dash', null, null],
      ranks: { backstab: { 'ready-blade': 1 }, harvest: { 'keen-scythe': 1 } },
    }
    expect(setArtifact(daggers, ashwoodLongbow, TREES)).toEqual({
      artifact: 'ashwood-longbow',
      slots: ['ashwood-longbow', null, 'harvest', 'doom-bolt', null, 'dash', null, null],
      ranks: { harvest: { 'keen-scythe': 1 } },
    })
  })

  it('fits spells on any weapon of the role, but strikes and shots only on weapons that make them', () => {
    // Spells: anyone of the role.
    expect(fits(tree('plague'), 'damage', tomeOfSummoning)).toBe(true)
    expect(fits(tree('harvest'), 'damage', twinDaggers)).toBe(true)
    expect(fits(tree('plague'), 'damage', ashwoodLongbow)).toBe(true)
    expect(fits(tree('doom-bolt'), 'damage', twinDaggers)).toBe(true)
    expect(fits(tree('raise-ghoul'), 'damage', ashwoodLongbow)).toBe(true)
    // Weapon strikes and shots: only weapons that can make them.
    expect(fits(tree('backstab'), 'damage', twinDaggers)).toBe(true)
    expect(fits(tree('eviscerate'), 'damage', tomeOfSummoning)).toBe(false)
    expect(fits(tree('fan-of-knives'), 'damage', ashwoodLongbow)).toBe(false)
    expect(fits(tree('multi-shot'), 'damage', tomeOfSummoning)).toBe(false)
    expect(fits(tree('multi-shot'), 'damage', ashwoodLongbow)).toBe(true)
    expect(fits(tree('mend'), 'damage', tomeOfSummoning)).toBe(false)
    expect(fits(tree('fervor'), 'cooldown', lifewardenStaff)).toBe(true)
    expect(fits(tree('fervor'), 'cooldown', tomeOfSummoning)).toBe(true)
    expect(fits(tree('war-cadence'), 'buff', lifewardenStaff)).toBe(false)
    expect(fits(tree('vitality-aura'), 'buff', lifewardenStaff)).toBe(true)
  })
})
