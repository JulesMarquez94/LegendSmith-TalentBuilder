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
  type Gear,
  type Trinket,
} from './gear.ts'

const ring: Trinket = { slot: 'Ring', rarity: 'epic', itemLevel: 118, stats: ['haste', 'crit'] }

describe('trinkets', () => {
  it('take their name from the slot and the stat pair, in any order, unless they have their own', () => {
    expect(trinketName(ring)).toBe('Ring of Peerlessness')
    expect(trinketName({ ...ring, stats: ['crit', 'haste'] })).toBe('Ring of Peerlessness')
    expect(trinketName({ ...ring, name: 'Band of the Swift Hand' })).toBe('Band of the Swift Hand')
    expect(trinketName({ ...ring, name: '   ' })).toBe('Ring of Peerlessness')
  })

  it("get Power (three times the overview card's, for level 60's own +200%) and Health from item level", () => {
    expect(trinketPower(ring)).toBe(37.2)
    expect(trinketHealth(ring)).toBe(1121)
  })

  it('allow one special affix at most', () => {
    expect(isValidPair('haste', 'echo')).toBe(true)
    expect(isValidPair('echo', 'minionPower')).toBe(false)
    expect(isValidPair('haste', 'haste')).toBe(false)
  })

  it('add up, with rarity setting the two stats', () => {
    const totals = gearTotals({ Ring: ring, Necklace: { slot: 'Necklace', rarity: 'common', itemLevel: 50, stats: ['haste', 'potency'] } })
    expect(totals).toMatchObject({ haste: 5, crit: 4, potency: 1, power: 53 })
  })
})

describe('leaning trinkets', () => {
  it('split twice the rarity value between the stats, from 150% / 50% to 50% / 150%', () => {
    expect(trinketStatValues(ring)).toEqual([4, 4])
    expect(trinketStatValues({ ...ring, split: 150 })).toEqual([6, 2])
    expect(trinketStatValues({ ...ring, split: 50 })).toEqual([2, 6])
    expect(trinketStatValues({ ...ring, split: 125 })).toEqual([5, 3])
    // Never past 150% / 50%.
    expect(trinketStatValues({ ...ring, split: 200 })).toEqual([6, 2])
    expect(gearTotals({ Ring: { ...ring, split: 150 } })).toMatchObject({ haste: 6, crit: 2 })
  })

  it('start their name with the stat they lean toward', () => {
    expect(trinketName({ ...ring, split: 150 })).toBe('Quick Ring of Peerlessness')
    expect(trinketName({ ...ring, split: 55 })).toBe('Keen Ring of Peerlessness')
  })
})

describe('the prebuilt sets', () => {
  const totals = (id: string) => gearTotals(GEAR_PRESETS.find((p) => p.id === id)!.gear)

  it('build one set around each stat, every item leaning all the way toward it', () => {
    for (const stat of GEAR_STATS) {
      const set = GEAR_PRESETS.find((p) => p.id === `main-${stat}`)!
      const items = TRINKET_SLOTS.map((s) => set.gear[s]!)
      // 12 items at 6% each (a tenth of that for Minion power, which counts per minion); it comes out on top.
      const each = stat === 'minionPower' ? 0.6 : 6
      expect(items.every((t) => Math.abs(trinketStatValues(t)[t.stats.indexOf(stat)] - each) < 1e-9), stat).toBe(true)
      const sums = totals(set.id)
      expect(sums[stat], stat).toBeCloseTo(12 * each)
      for (const other of GEAR_STATS) if (other !== stat) expect(sums[stat]!, `${stat} over ${other}`).toBeGreaterThan(sums[other] ?? 0)
    }
  })

  it('wear one stat pair in all 12 slots: only names are unique', () => {
    expect(totals('common-crit')).toMatchObject({ haste: 12, crit: 12 })
    expect(totals('epic-crit')).toMatchObject({ crit: 48, critDamage: 48 })
  })

  it('keep the even mix at 100% / 100% on every item', () => {
    const set = GEAR_PRESETS.find((p) => p.id === 'even-mix')!
    expect(TRINKET_SLOTS.every((s) => set.gear[s] && set.gear[s].split === undefined)).toBe(true)
    // Minion power counts per minion: items carry a tenth of it.
    const mix = totals('even-mix')
    expect(mix).toMatchObject({ haste: 20, crit: 16, critDamage: 16, potency: 20, echo: 12 })
    expect(mix.minionPower).toBeCloseTo(1.2)
  })
})

describe('the unique name rule', () => {
  it('lets twelve Haste and Critical items be worn together, each with its own balance', () => {
    let gear: Gear = {}
    TRINKET_SLOTS.forEach((slot, i) => {
      const worn = equip(gear, { ...ring, slot, split: 50 + i * 5 })
      expect(worn.cleared, slot).toBeUndefined()
      gear = worn.gear
    })
    expect(Object.keys(gear)).toHaveLength(12)
  })

  it('takes off a worn item with the same name in another slot, whatever its case', () => {
    const worn = equip({}, { ...ring, name: 'Band of the Swift Hand' }).gear
    const { gear, cleared } = equip(worn, { ...ring, slot: 'Band', rarity: 'rare', name: 'band of the swift hand' })
    expect(cleared).toBe('Ring')
    expect(gear.Ring).toBeUndefined()
    expect(gear.Band?.rarity).toBe('rare')
  })

  it('holds in every preset, the main-stat sets and the even mix included', () => {
    for (const preset of GEAR_PRESETS) {
      const names = TRINKET_SLOTS.flatMap((s) => (preset.gear[s] ? [trinketName(preset.gear[s])] : []))
      expect(new Set(names).size, preset.name).toBe(names.length)
      for (const s of TRINKET_SLOTS) expect(preset.gear[s]?.slot ?? s).toBe(s)
    }
  })
})
