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

  it('start their name with the stat they lean toward, and count as their own item', () => {
    expect(trinketName({ ...ring, lean: 0 })).toBe('Quick Ring of Peerlessness')
    expect(trinketName({ ...ring, lean: 1 })).toBe('Keen Ring of Peerlessness')
    expect(uniqueName({ ...ring, lean: 0 })).toBe('Quick Peerlessness')
    // A Quick, an even and a Keen Peerlessness stack…
    const quick = equip({}, { ...ring, lean: 0 }).gear
    const even = equip(quick, { ...ring, slot: 'Band' }).gear
    const all = equip(even, { ...ring, slot: 'Necklace', lean: 1 })
    expect(all.cleared).toBeUndefined()
    expect(gearTotals(all.gear)).toMatchObject({ haste: 12, crit: 12 })
    // …but two Quick ones don't.
    expect(equip(all.gear, { ...ring, slot: 'Idol', lean: 0 }).cleared).toBe('Ring')
  })
})

describe('the prebuilt sets', () => {
  const totals = (id: string) => gearTotals(GEAR_PRESETS.find((p) => p.id === id)!.gear)

  it('build one set around each stat, stacking its pairs leaning, even and the other way', () => {
    for (const stat of GEAR_STATS) {
      const set = GEAR_PRESETS.find((p) => p.id === `main-${stat}`)!
      const items = TRINKET_SLOTS.map((s) => set.gear[s]!)
      expect(items.every((t) => t.stats.includes(stat)), stat).toBe(true)
      const leaningToward = items.filter((t) => t.lean !== undefined && t.stats[t.lean] === stat)
      expect(leaningToward).toHaveLength(stat === 'echo' || stat === 'minionPower' ? 4 : 5)
      // The main stat comes out on top.
      const sums = totals(set.id)
      for (const other of GEAR_STATS) if (other !== stat) expect(sums[stat]!, `${stat} over ${other}`).toBeGreaterThan(sums[other] ?? 0)
    }
    // Haste: 5 leaning (6% each), 5 even (4%) and 2 leaning the other way (2%).
    expect(totals('main-haste')).toMatchObject({ haste: 54 })
    // Echo: its 4 pairs, three times each.
    expect(totals('main-echo')).toMatchObject({ echo: 48 })
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
