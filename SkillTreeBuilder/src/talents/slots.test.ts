import { describe, expect, it } from 'vitest'
import { lifewardenStaff } from '../trees/healer/staff.ts'
import {
  ashwoodLongbow,
  greatsword,
  spear,
  STARTING_LOADOUT,
  swordAndShield,
  tomeOfDawn,
  tomeOfSummoning,
  TREES,
  twinDaggers,
} from '../trees/index.ts'
import { fits, setArtifact, slotKinds } from './slots.ts'

const tree = (id: string) => TREES.find((t) => t.id === id)!

describe('the artifact', () => {
  it('decides what the role slots hold', () => {
    expect(slotKinds(lifewardenStaff)).toEqual(['artifact', 'heal', 'heal', 'heal', 'cooldown', 'mobility', 'buff', 'character'])
    expect(slotKinds(tomeOfSummoning)).toEqual(['artifact', 'damage', 'damage', 'damage', 'cooldown', 'mobility', 'buff', 'character'])
    expect(slotKinds(swordAndShield)).toEqual(['artifact', 'tank', 'tank', 'tank', 'cooldown', 'mobility', 'buff', 'character'])
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

  it('fills a tank: tank abilities, Fervor, mobility and the tank group buffs', () => {
    for (const weapon of [swordAndShield, greatsword]) {
      const fitting = (kind: 'tank' | 'cooldown' | 'buff') => TREES.filter((t) => fits(t, kind, weapon)).map((t) => t.id)
      expect(fitting('cooldown')).toEqual(['fervor'])
      expect(fitting('buff')).toEqual(['stoneskin', 'evasion-drill', 'forced-march'])
      expect(fits(tree('dash'), 'mobility', weapon)).toBe(true)
      expect(fits(tree('plague'), 'damage', weapon)).toBe(false)
    }
    // Shield Block needs a shield; the other tank abilities fit any tank weapon.
    expect(TREES.filter((t) => fits(t, 'tank', swordAndShield)).map((t) => t.id)).toEqual([
      'provoke',
      'stand-firm',
      'tremor',
      'shield-block',
    ])
    expect(TREES.filter((t) => fits(t, 'tank', greatsword)).map((t) => t.id)).toEqual(['provoke', 'stand-firm', 'tremor'])
  })

  it('gives the new healer the shared heals and the spear the spells, but no blade strikes', () => {
    expect(fits(tree('mend'), 'heal', tomeOfDawn)).toBe(true)
    expect(fits(tree('healing-rain'), 'heal', tomeOfDawn)).toBe(true)
    expect(fits(tree('doom-bolt'), 'damage', spear)).toBe(true)
    expect(fits(tree('backstab'), 'damage', spear)).toBe(false)
    expect(fits(tree('fan-of-knives'), 'damage', spear)).toBe(false)
  })
})
