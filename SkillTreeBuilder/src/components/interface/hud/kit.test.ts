import { describe, expect, it } from 'vitest'
import { ARTIFACTS, TREES } from '../../../trees/index.ts'
import { builderKit, hudKit } from './kit.ts'
import { ACTION_SLOTS, isInUnity, UNITY_ARTIFACTS } from './unity.ts'

describe("the Unity game's kits", () => {
  it('name only builder trees that exist, one per action slot', () => {
    const ids = new Set(TREES.map((t) => t.id))
    for (const a of UNITY_ARTIFACTS) {
      expect(a.kit).toHaveLength(ACTION_SLOTS.length)
      for (const e of a.kit) if ('tree' in e) expect(ids.has(e.tree), `${a.name}: ${e.tree}`).toBe(true)
      expect(ARTIFACTS.some((b) => b.id === a.builderId), a.builderId).toBe(true)
    }
  })

  it('are the five weapons the game has', () => {
    expect(UNITY_ARTIFACTS.map((a) => a.name)).toEqual([
      'Lifewarden Staff',
      'Ashwood Longbow',
      'Twin Daggers',
      'Tome of Summoning',
      'Sword and shield',
    ])
    expect(isInUnity('greatsword')).toBe(false)
    expect(isInUnity('spear')).toBe(false)
  })
})

describe('a character on the HUD', () => {
  it("gets the game's tiles in control order, the group buff last and passive", () => {
    const kit = hudKit('lifewarden-staff', 60)
    expect(kit.slots.map((s) => s.name)).toEqual(['Radiant Bolt', 'Mend', 'Renew', 'Healing Rain', 'Miracle', 'Dash', 'Vitality Aura'])
    expect(kit.slots.map((s) => s.key?.keyboard ?? null)).toEqual(['LMB', 'RMB', 'Q', 'E', 'F', 'Alt', null])
    expect(kit.slots.map((s) => s.key?.gamepad ?? null)).toEqual(['LT', 'RT', 'LB', 'RB', 'Y', 'B', null])
    const buff = kit.slots[6]
    expect(buff.passive).toBe(true)
    expect(buff.cooldown).toBe(0)
    expect(kit.roleLine).toBe('Healer · Lifewarden Staff')
  })

  it('opens the slots at the levels the game does: Big at 5, Mobility and the group buff at 6', () => {
    expect(hudKit('twin-daggers', 1).slots.map((s) => s.open)).toEqual([true, false, false, false, false, false, false])
    expect(hudKit('twin-daggers', 5).slots.map((s) => s.open)).toEqual([true, true, true, true, true, false, false])
    expect(hudKit('twin-daggers', 6).slots.every((s) => s.open)).toBe(true)
  })

  it("shows the game's resource: mana a bar, combo points pips, imps a bar with the count", () => {
    const staff = hudKit('lifewarden-staff', 60).resource
    expect(staff).toMatchObject({ label: 'MANA', max: 1000, regen: 8, pips: false, unity: 'mana' })
    expect(hudKit('twin-daggers', 60).resource).toMatchObject({ label: 'COMBO', name: 'Combo points', max: 6, pips: true })
    expect(hudKit('tome-of-summoning', 60).resource).toMatchObject({ label: 'IMPS', max: 15, pips: false })
    expect(hudKit('ashwood-longbow', 60).resource).toMatchObject({ label: 'FOCUS', max: 100 })
  })

  it("plays the sword and shield as the game's stand-in: rage, and its own abilities and numbers", () => {
    const kit = hudKit('sword-and-shield', 12)
    expect(kit.roleLine).toBe('Tank · Sword and shield')
    expect(kit.resource).toMatchObject({ label: 'RAGE', unity: 'rage' })
    expect(kit.slots.slice(0, 6).map((s) => s.name)).toEqual(['Slash', 'Shield Slam', 'Block', 'Taunt', 'Shield Wall', 'Charge'])
    expect(kit.slots[1]).toMatchObject({ cost: 15, cooldown: 6, tree: null })
    expect(kit.slots[6].name).toBe('Stoneskin')
  })

  it("uses the builder's numbers for a builder ability, costs in the weapon's units", () => {
    const staff = hudKit('lifewarden-staff', 60)
    expect(staff.slots[1].castTime).toBe(2)
    expect(staff.slots[1].cost).toBeGreaterThan(0)
    expect(staff.slots[4].cooldown).toBeGreaterThan(60)
    const bow = hudKit('ashwood-longbow', 60)
    // Focus counts in tens: Aimed Shot's 3 is 30 focus.
    expect(bow.slots[1].cost % 10).toBe(0)
  })

  it('counts the ghouls Raise Ghoul raises, once its slot is open', () => {
    expect(hudKit('tome-of-summoning', 60).minions).toEqual([{ name: 'Ghoul', max: 3, duration: 24, slot: 'ability3' }])
    expect(hudKit('tome-of-summoning', 3).minions).toEqual([])
    expect(hudKit('lifewarden-staff', 60).minions).toEqual([])
  })
})

describe("a weapon the game doesn't have yet", () => {
  it("gets a kit from the builder's trees, in the game's order, with no ability twice", () => {
    for (const id of ['greatsword', 'tome-of-dawn', 'spear']) {
      const artifact = ARTIFACTS.find((a) => a.id === id)!
      const entries = builderKit(artifact)
      expect(entries).toHaveLength(7)
      const trees = entries.flatMap((e) => ('tree' in e ? [e.tree] : []))
      expect(new Set(trees).size).toBe(trees.length)
      expect(trees[0]).toBe(artifact.tree?.id)
      const kit = hudKit(id, 60)
      expect(kit.unity).toBeNull()
      expect(kit.resource.unity).toBeNull()
      expect(kit.resource.name).toBe(artifact.resource)
      expect(kit.slots[4].tree?.kind).toBe('cooldown')
      expect(kit.slots[5].tree?.kind).toBe('mobility')
      expect(kit.slots[6].tree?.kind).toBe('buff')
    }
  })
})
