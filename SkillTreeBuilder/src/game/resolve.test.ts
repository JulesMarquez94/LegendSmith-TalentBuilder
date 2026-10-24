import { describe, expect, it } from 'vitest'
import { TREES } from '../trees/index.ts'
import { chainTotal, periodicTotal, reach } from './resolve.ts'
import { abilityIn, healerKit } from './testkit.ts'

const SLOTS = ['mend', 'renew', 'healing-rain', 'lifetide', 'dash']

const talentOf = (treeId: string, talentId: string) => TREES.find((t) => t.id === treeId)!.talents.find((t) => t.id === talentId)!

describe('base numbers', () => {
  const kit = healerKit(SLOTS)

  it('come from the staff and the level 60 base', () => {
    expect(kit.resource).toBe('Mana')
    expect(kit.character.stats).toMatchObject({ health: 2400, maxResource: 1000, resourceRegen: 8, crit: 5, critDamage: 50 })
  })

  it('match each ability card', () => {
    const mend = abilityIn(kit, 'mend')
    expect(mend).toMatchObject({ cost: 100, castTime: 1.5, range: 40, gcd: 1, charges: 1, resource: 'mana' })
    expect(mend.effects[0]).toMatchObject({ amount: 1800, critChance: 5, critMultiplier: 1.5 })
    expect(mend.text).toContain('1,800')

    const renew = abilityIn(kit, 'renew').effects[0]
    expect(renew).toMatchObject({ amount: 300, interval: 2, duration: 12, ticks: 6 })
    expect(periodicTotal(renew)).toBe(1800)

    // 900 on the first tick, 15% less on each of the next nine.
    expect(periodicTotal(abilityIn(kit, 'lifetide').effects[0])).toBeCloseTo(4818.8, 1)
    expect(abilityIn(kit, 'dash')).toMatchObject({ gcd: 0, charges: 2, cooldown: 8, echo: 0 })
  })

  it("add up a chain's jumps", () => {
    const chain = abilityIn(healerKit(['chain-heal']), 'chain-heal').effects[0]
    expect(chainTotal(chain)).toBeCloseTo(1400 * (1 + 0.85 + 0.85 ** 2 + 0.85 ** 3))
  })
})

describe('gear', () => {
  it('raises heals with Power and speeds casts and ticks with Haste', () => {
    const kit = healerKit(SLOTS, {}, { Ring: { slot: 'Ring', rarity: 'epic', itemLevel: 120, stats: ['haste', 'crit'] } })
    const mend = abilityIn(kit, 'mend')
    expect(kit.character.stats.power).toBe(12.6)
    expect(mend.effects[0].amount).toBeCloseTo(1800 * 1.126)
    expect(mend.castTime).toBeCloseTo(1.5 / 1.04)
    expect(mend.effects[0].critChance).toBe(9)
  })

  it('fits more ticks into the same duration with Haste, and lengthens it with Potency', () => {
    const hasty = healerKit(SLOTS)
    const renewFor = (haste: number, potency: number) => {
      const stats = { ...hasty.character.stats, haste, potency }
      return hasty.resolve('renew', [], stats)!.effects[0]
    }
    expect(renewFor(20, 0)).toMatchObject({ duration: 12, ticks: 7 })
    expect(renewFor(0, 20).duration).toBeCloseTo(14.4)
    expect(renewFor(0, 20).ticks).toBe(7)
  })
})

describe('talents reach across trees by family', () => {
  it('boosts every HoT from a point in Renew', () => {
    const kit = healerKit(SLOTS, { renew: { verdant: 3 } })
    expect(abilityIn(kit, 'renew').effects[0].amount).toBeCloseTo(354)
    expect(abilityIn(kit, 'lifetide').effects[0].amount).toBeCloseTo(1062)
    expect(abilityIn(kit, 'mend').effects[0].amount).toBe(1800)
    expect(reach(talentOf('renew', 'verdant').effects!(3), kit)).toEqual(['Renew', 'Lifetide'])
  })

  it("does nothing from a tree that isn't slotted", () => {
    const kit = healerKit(['mend', null, null, 'lifetide', null], { renew: { verdant: 3 } })
    expect(abilityIn(kit, 'lifetide').effects[0].amount).toBe(900)
  })

  it("lifts a whole family from each tree's \"heals more\" talent", () => {
    const kit = healerKit(['mend', 'chain-heal', 'bloom', 'miracle', null], { mend: { 'greater-mend': 3 } })
    expect(abilityIn(kit, 'mend').effects[0].amount).toBeCloseTo(1800 * 1.24)
    expect(abilityIn(kit, 'chain-heal').effects[0].amount).toBeCloseTo(1400 * 1.24)
    expect(abilityIn(kit, 'bloom').effects[0].amount).toBeCloseTo(900 * 1.24)
    expect(abilityIn(kit, 'miracle').effects[0].amount).toBeCloseTo(6000 * 1.24)
  })

  it('adds percentages together, and reaches granted effects by their own family', () => {
    const kit = healerKit(SLOTS, { mend: { 'greater-mend': 3, 'lingering-mend': 1 }, renew: { verdant: 3 } })
    const [heal, lingering] = abilityIn(kit, 'mend').effects
    expect(heal.amount).toBeCloseTo(1800 * 1.24)
    expect(lingering).toMatchObject({ type: 'hot', granted: 'Lingering Mend', ticks: 3 })
    // Lingering Mend is a HoT: Verdant lifts it, Greater Mend (direct heals) doesn't.
    expect(lingering.amount).toBeCloseTo(180 * 1.18)
  })

  it('trades cost for healing on spells only (Overdrive)', () => {
    const kit = healerKit(['mend', 'conduit', null, 'miracle', null], { conduit: { overdrive: 1 } })
    expect(abilityIn(kit, 'mend').cost).toBe(200)
    expect(abilityIn(kit, 'mend').effects[0].amount).toBeCloseTo(1800 * 1.6)
    // Conduit and Miracle cost nothing, so they aren't spells.
    expect(abilityIn(kit, 'conduit').effects[0].amount).toBe(250)
    expect(abilityIn(kit, 'miracle').effects[0].amount).toBe(6000)
  })

  it('reaches zones, costs, charges and cooldowns', () => {
    const kit = healerKit(['chain-heal', 'healing-rain', null, 'sanctuary', null], {
      'healing-rain': { downpour: 3, 'gathering-clouds': 2, 'twin-storms': 1 },
      'chain-heal': {},
    })
    expect(abilityIn(kit, 'sanctuary').effects[0].amount).toBeCloseTo(708)
    expect(abilityIn(kit, 'healing-rain')).toMatchObject({ charges: 2, cooldown: 6 })

    const thrifty = healerKit(['mend', 'chain-heal', null, 'miracle', null], { mend: { 'efficient-prayers': 3 } })
    expect(abilityIn(thrifty, 'chain-heal').cost).toBeCloseTo(140.8)
    expect(abilityIn(thrifty, 'mend').cost).toBeCloseTo(88)
    expect(abilityIn(thrifty, 'miracle').cost).toBe(0)
  })

  it('keeps conditional bonuses for the moment the heal lands', () => {
    const kit = healerKit(['mend', 'conduit', null, null, null], { mend: { triage: 3 } })
    expect(abilityIn(kit, 'mend').effects[0].conditionals).toEqual([
      { pct: 30, when: { targetBelow: 40 }, source: 'Triage' },
    ])
    // Conduit's heal is a direct heal too, so Triage reaches it.
    expect(abilityIn(kit, 'conduit').effects[0].conditionals).toHaveLength(1)
  })

  it('collects stat talents into the character sheet', () => {
    const kit = healerKit(SLOTS, { 'lifewarden-staff': { 'deep-reserves': 2, meditation: 3 } })
    expect(kit.character.stats.maxResource).toBe(1200)
    expect(kit.character.lines.resourceRegen).toMatchObject({ base: 8, talents: 3, total: 11 })
  })
})
