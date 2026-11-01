import { describe, expect, it } from 'vitest'
import { TREES } from '../trees/index.ts'
import { chainTotal, periodicTotal, reach } from './resolve.ts'
import { lifewardenStaff } from '../trees/healer/staff.ts'
import { Arena } from './sim/arena.ts'
import { SCENARIOS } from './sim/scenarios.ts'
import { abilityIn, healerKit, kitFor } from './testkit.ts'

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
    expect(mend).toMatchObject({ cost: 130, castTime: 2, range: 40, gcd: 1, charges: 1, resource: 'mana' })
    expect(mend.effects[0]).toMatchObject({ amount: 2400, critChance: 5, critMultiplier: 1.5 })
    expect(mend.text).toContain('2,400')

    const renew = abilityIn(kit, 'renew').effects[0]
    expect(renew).toMatchObject({ amount: 300, interval: 2, duration: 12, ticks: 6 })
    expect(periodicTotal(renew)).toBe(1800)

    // 900 on the first tick, 15% less on each of the next nine.
    expect(periodicTotal(abilityIn(kit, 'lifetide').effects[0])).toBeCloseTo(4818.8, 1)
    expect(abilityIn(kit, 'dash')).toMatchObject({ gcd: 0, charges: 2, cooldown: 8, echo: 0 })
  })

  it("add up a chain's jumps", () => {
    const chain = abilityIn(healerKit(['chain-heal']), 'chain-heal').effects[0]
    expect(chainTotal(chain)).toBeCloseTo(1900 * (1 + 0.75 + 0.75 ** 2))
  })
})

describe('gear', () => {
  it('raises heals with Power and speeds casts and ticks with Haste', () => {
    const kit = healerKit(SLOTS, {}, { Ring: { slot: 'Ring', rarity: 'epic', itemLevel: 120, stats: ['haste', 'crit'] } })
    const mend = abilityIn(kit, 'mend')
    // Level 60's own +200%, and the ring's 37.8%: worth 12.6% on top of level 60's numbers.
    expect(kit.character.stats.power).toBe(237.8)
    expect(mend.effects[0].amount).toBeCloseTo(2400 * 1.126)
    // An even epic Haste and Critical ring: 30% and 50% over 18 (12 items at 150%) each, times its 1.5… 4 / 6.
    expect(mend.castTime).toBeCloseTo(2 / (1 + 30 / 18 / 100))
    expect(mend.effects[0].critChance).toBeCloseTo(5 + 50 / 18)
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
    expect(abilityIn(kit, 'mend').effects[0].amount).toBe(2400)
    expect(reach(talentOf('renew', 'verdant').effects!(3), kit)).toEqual(['Renew', 'Lifetide'])
  })

  it("does nothing from a tree that isn't slotted", () => {
    const kit = healerKit(['mend', null, null, 'lifetide', null], { renew: { verdant: 3 } })
    expect(abilityIn(kit, 'lifetide').effects[0].amount).toBe(900)
  })

  it("lifts a whole family from each tree's \"heals more\" talent", () => {
    const kit = healerKit(['mend', 'chain-heal', 'bloom', 'miracle', null], { mend: { 'greater-mend': 3 } })
    expect(abilityIn(kit, 'mend').effects[0].amount).toBeCloseTo(2400 * 1.24)
    expect(abilityIn(kit, 'chain-heal').effects[0].amount).toBeCloseTo(1900 * 1.24)
    expect(abilityIn(kit, 'bloom').effects[0].amount).toBeCloseTo(900 * 1.24)
    expect(abilityIn(kit, 'miracle').effects[0].amount).toBeCloseTo(6000 * 1.24)
  })

  it('adds percentages together, and reaches granted effects by their own family', () => {
    const kit = healerKit(SLOTS, { mend: { 'greater-mend': 3, 'echoing-mend': 2, 'empowered-mend': 2 }, renew: { verdant: 3 } })
    const [heal, echo] = abilityIn(kit, 'mend').effects
    // Greater Mend's 24% and Empowered Mend's 40%, added.
    expect(heal.amount).toBeCloseTo(2400 * 1.64)
    expect(echo).toMatchObject({ type: 'heal', granted: 'Echoing Mend', target: 'next-lowest' })
    // Echoing Mend is a direct heal: Greater Mend lifts it, Verdant (HoTs) doesn't.
    expect(echo.amount).toBeCloseTo(2400 * 0.4 * 1.64)
  })

  it('trades cost for healing on spells only (Overdrive)', () => {
    const kit = healerKit(['mend', 'conduit', null, 'miracle', null], { conduit: { overdrive: 1 } })
    expect(abilityIn(kit, 'mend').cost).toBe(260)
    expect(abilityIn(kit, 'mend').effects[0].amount).toBeCloseTo(2400 * 1.6)
    // Conduit and Miracle cost nothing, so they aren't spells.
    expect(abilityIn(kit, 'conduit').effects[0].amount).toBe(250)
    expect(abilityIn(kit, 'miracle').effects[0].amount).toBe(6000)
  })

  it('reaches zones, costs, charges and cooldowns', () => {
    const kit = healerKit(['chain-heal', 'healing-rain', null, 'sanctuary', null], {
      'healing-rain': { downpour: 2, 'twin-storms': 1 },
      'chain-heal': {},
    })
    expect(abilityIn(kit, 'sanctuary').effects[0].amount).toBeCloseTo(708)
    expect(abilityIn(kit, 'healing-rain')).toMatchObject({ charges: 2, cooldown: 10 })

    const empowered = healerKit(['mend', 'chain-heal', null, 'miracle', null], { mend: { 'empowered-mend': 2 } })
    expect(abilityIn(empowered, 'mend').cost).toBeCloseTo(182)
    expect(abilityIn(empowered, 'chain-heal').cost).toBe(160)
  })

  it('keeps conditional bonuses for the moment the heal lands', () => {
    const kit = healerKit(['mend', 'conduit', null, null, null], { mend: { triage: 2, 'nurturing-mend': 2 } })
    expect(abilityIn(kit, 'mend').effects[0].conditionals).toEqual([
      { pct: 50, when: { missing: true }, source: 'Triage' },
      { pct: 20, when: { affected: true }, source: 'Nurturing Mend' },
    ])
    // Both are Mend's own: Conduit's direct heal doesn't get them.
    expect(abilityIn(kit, 'conduit').effects[0].conditionals).toHaveLength(0)
  })

  it('collects stat talents into the character sheet', () => {
    const kit = healerKit(SLOTS, { 'lifewarden-staff': { 'deep-reserves': 2, meditation: 2 } })
    expect(kit.character.stats.maxResource).toBe(1200)
    expect(kit.character.lines.resourceRegen).toMatchObject({ base: 8, talents: 4, total: 12 })
  })
})

describe('levels', () => {
  const at = (level: number) => kitFor(lifewardenStaff, SLOTS, {}, {}, level)

  it('grow Health and Power from a third at level 1 to all of it at 60', () => {
    expect([1, 30, 60].map((l) => at(l).character.stats.health)).toEqual([800, 1586, 2400])
    expect([1, 30, 60].map((l) => at(l).character.stats.power)).toEqual([0, 98.3, 200])
    expect(abilityIn(at(1), 'mend').effects[0].amount).toBeCloseTo(800)
    expect(abilityIn(at(60), 'mend').effects[0].amount).toBeCloseTo(2400)
  })

  it('scale the arena with you: the boss, the bots and every hit you take', () => {
    const scenario = SCENARIOS.find((s) => s.id === 'dungeon')!
    const low = new Arena(at(1), scenario, { seed: 1 })
    const high = new Arena(at(60), scenario, { seed: 1 })
    expect(low.boss.maxHp).toBeCloseTo(high.boss.maxHp / 3)
    const bot = (a: Arena) => a.allies.find((x) => !x.isPlayer)!.maxHp
    expect(bot(low)).toBeCloseTo(bot(high) / 3)
    expect(low.player.maxHp).toBe(800)
  })
})
