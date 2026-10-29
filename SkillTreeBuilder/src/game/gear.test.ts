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
  FULL_EPIC_MAX,
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

  it('add up, with rarity setting the two stats (a common item a quarter of an epic one)', () => {
    const totals = gearTotals({ Ring: ring, Necklace: { slot: 'Necklace', rarity: 'common', itemLevel: 50, stats: ['haste', 'potency'] } })
    // Even epic: Haste 30/18, Critical 50/18; even common: a quarter of 30/18 for Haste and Potency.
    expect(totals.haste).toBeCloseTo(30 / 18 + 30 / 72, 2)
    expect(totals.crit).toBeCloseTo(50 / 18, 2)
    expect(totals.potency).toBeCloseTo(30 / 72, 2)
    expect(totals.power).toBe(53)
  })
})

describe('leaning trinkets', () => {
  it('split between the stats from 150% / 50% to 50% / 150%, each on its own scale', () => {
    // An epic item at 150% carries a twelfth of the stat's full-epic cap: Haste 2.5%, Critical 4.17%.
    const close = (got: [number, number], want: [number, number]) => {
      expect(got[0]).toBeCloseTo(want[0])
      expect(got[1]).toBeCloseTo(want[1])
    }
    close(trinketStatValues(ring), [30 / 18, 50 / 18])
    close(trinketStatValues({ ...ring, split: 150 }), [30 / 12, 50 / 36])
    close(trinketStatValues({ ...ring, split: 50 }), [30 / 36, 50 / 12])
    close(trinketStatValues({ ...ring, split: 125 }), [(30 / 18) * 1.25, (50 / 18) * 0.75])
    // Never past 150% / 50%.
    close(trinketStatValues({ ...ring, split: 200 }), [30 / 12, 50 / 36])
  })

  it('start their name with the stat they lean toward', () => {
    expect(trinketName({ ...ring, split: 150 })).toBe('Quick Ring of Peerlessness')
    expect(trinketName({ ...ring, split: 55 })).toBe('Keen Ring of Peerlessness')
  })
})

describe('the prebuilt sets', () => {
  const totals = (id: string) => gearTotals(GEAR_PRESETS.find((p) => p.id === id)!.gear)

  it('build one set around each stat that reaches its full-epic cap, and no more', () => {
    // Haste 30%, Critical 50%, Crit damage 50%, Potency 30%, Echo 30%, Minion power 5%.
    expect(FULL_EPIC_MAX).toEqual({ haste: 30, crit: 50, critDamage: 50, potency: 30, echo: 30, minionPower: 5 })
    for (const stat of GEAR_STATS) {
      const set = GEAR_PRESETS.find((p) => p.id === `main-${stat}`)!
      const items = TRINKET_SLOTS.map((s) => set.gear[s]!)
      const each = FULL_EPIC_MAX[stat] / 12
      expect(items.every((t) => Math.abs(trinketStatValues(t)[t.stats.indexOf(stat)] - each) < 1e-9), stat).toBe(true)
      expect(totals(set.id)[stat], stat).toBeCloseTo(FULL_EPIC_MAX[stat], 1)
    }
  })

  it('wear one stat pair in all 12 slots: only names are unique', () => {
    const common = totals('common-crit')
    expect(common.haste).toBeCloseTo(30 / 6, 1)
    expect(common.crit).toBeCloseTo(50 / 6, 1)
  })

  it('wear every stat pair in epic: even, and leaning all the way either way', () => {
    // 14 pairs (Echo and Minion power never share an item): 14 even sets and 28 leaning ones.
    expect(GEAR_PRESETS.filter((p) => p.id.startsWith('pair-'))).toHaveLength(14)
    expect(GEAR_PRESETS.filter((p) => p.id.startsWith('lean-'))).toHaveLength(28)
    // Even: two thirds of each cap. Critical main, Haste low: all of Critical's cap, a third of Haste's.
    const even = totals('pair-haste-crit')
    expect(even.haste).toBeCloseTo(20, 1)
    expect(even.crit).toBeCloseTo(100 / 3, 1)
    const critMain = totals('lean-crit-haste')
    expect(critMain.crit).toBeCloseTo(50, 1)
    expect(critMain.haste).toBeCloseTo(10, 1)
    expect(GEAR_PRESETS.find((p) => p.id === 'lean-crit-haste')!.name).toBe('Critical main, Haste low')
  })

  it('keep the even mix at 100% / 100% on every item', () => {
    const set = GEAR_PRESETS.find((p) => p.id === 'even-mix')!
    expect(TRINKET_SLOTS.every((s) => set.gear[s] && set.gear[s].split === undefined)).toBe(true)
    // Haste and Potency on 5 items, Critical and Crit damage on 4, Echo and Minion power on 3: even epic
    // items carry two thirds of a full lean, so a stat on n items gets n / 18 of its cap.
    const mix = totals('even-mix')
    const expected = { haste: 5, potency: 5, crit: 4, critDamage: 4, echo: 3, minionPower: 3 } as const
    for (const [stat, n] of Object.entries(expected)) {
      expect(mix[stat as keyof typeof expected], stat).toBeCloseTo((FULL_EPIC_MAX[stat as keyof typeof expected] * n) / 18, 1)
    }
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
