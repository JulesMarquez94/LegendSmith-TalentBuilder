import { describe, expect, it } from 'vitest'
import {
  equip,
  GEAR_PRESETS,
  GEAR_STATS,
  gearTotals,
  isValidPair,
  TRINKET_SLOTS,
  trinketHealth,
  trinketName,
  trinketPower,
  trinketStatValues,
  uniqueName,
  type Trinket,
} from './gear.ts'

const ring: Trinket = { slot: 'Ring', rarity: 'epic', itemLevel: 118, stats: ['haste', 'crit'] }

describe('trinkets', () => {
  it('take their name from the stat pair, in any order', () => {
    expect(trinketName(ring)).toBe('Ring of Peerlessness')
    expect(uniqueName({ ...ring, stats: ['crit', 'haste'] })).toBe('Peerlessness')
  })

  it('get Power and Health from item level, as on the overview card', () => {
    expect(trinketPower(ring)).toBe(12.4)
    expect(trinketHealth(ring)).toBe(1121)
  })

  it('allow one special affix at most', () => {
    expect(isValidPair('haste', 'echo')).toBe(true)
    expect(isValidPair('echo', 'minionPower')).toBe(false)
    expect(isValidPair('haste', 'haste')).toBe(false)
  })

  it('add up, with rarity setting the two stats', () => {
    const totals = gearTotals({ Ring: ring, Necklace: { slot: 'Necklace', rarity: 'common', itemLevel: 50, stats: ['haste', 'potency'] } })
    expect(totals).toMatchObject({ haste: 5, crit: 4, potency: 1, power: 17.7 })
  })
})

describe('leaning trinkets', () => {
  it('split the rarity value 150% / 50% toward one stat, either way', () => {
    expect(trinketStatValues(ring)).toEqual([4, 4])
    expect(trinketStatValues({ ...ring, lean: 0 })).toEqual([6, 2])
    expect(trinketStatValues({ ...ring, lean: 1 })).toEqual([2, 6])
    expect(gearTotals({ Ring: { ...ring, lean: 0 } })).toMatchObject({ haste: 6, crit: 2 })
  })

  it("start their name with the stat they lean toward, but share the pair's unique name", () => {
    expect(trinketName({ ...ring, lean: 0 })).toBe('Quick Ring of Peerlessness')
    expect(trinketName({ ...ring, lean: 1 })).toBe('Keen Ring of Peerlessness')
    const necklace: Trinket = { ...ring, slot: 'Necklace', lean: 1 }
    expect(equip({ Ring: { ...ring, lean: 0 } }, necklace)).toEqual({ gear: { Necklace: necklace }, cleared: 'Ring' })
  })
})

describe('the prebuilt sets', () => {
  const totals = (id: string) => gearTotals(GEAR_PRESETS.find((p) => p.id === id)!.gear)

  it('build one set around each stat, leaning every item that has it toward it', () => {
    for (const stat of GEAR_STATS) {
      const set = GEAR_PRESETS.find((p) => p.id === `main-${stat}`)!
      const items = TRINKET_SLOTS.map((s) => set.gear[s]!)
      expect(items).toHaveLength(12)
      for (const t of items) expect(t.lean === undefined ? null : t.stats[t.lean]).toBe(t.stats.includes(stat) ? stat : null)
      // The main stat comes out on top.
      const sums = totals(set.id)
      for (const other of GEAR_STATS) if (other !== stat) expect(sums[stat]!, `${stat} over ${other}`).toBeGreaterThan(sums[other] ?? 0)
    }
    expect(totals('main-haste')).toMatchObject({ haste: 30 })
    expect(totals('main-echo')).toMatchObject({ echo: 24 })
  })

  it('keep the even mix at 100% / 100% on every item', () => {
    const set = GEAR_PRESETS.find((p) => p.id === 'even-mix')!
    expect(TRINKET_SLOTS.every((s) => set.gear[s] && set.gear[s].lean === undefined)).toBe(true)
    expect(totals('even-mix')).toMatchObject({ haste: 20, crit: 16, critDamage: 16, potency: 20, echo: 12, minionPower: 12 })
  })
})

describe('the unique name rule', () => {
  it('takes off a worn item with the same name in another slot', () => {
    const worn = equip({}, ring).gear
    const { gear, cleared } = equip(worn, { ...ring, slot: 'Band', rarity: 'rare' })
    expect(cleared).toBe('Ring')
    expect(gear.Ring).toBeUndefined()
    expect(gear.Band?.rarity).toBe('rare')
  })

  it('holds in every preset, the main-stat sets and the even mix included', () => {
    for (const preset of GEAR_PRESETS) {
      const names = TRINKET_SLOTS.flatMap((s) => (preset.gear[s] ? [uniqueName(preset.gear[s])] : []))
      expect(new Set(names).size, preset.name).toBe(names.length)
      for (const s of TRINKET_SLOTS) expect(preset.gear[s]?.slot ?? s).toBe(s)
    }
  })
})
