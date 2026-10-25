import { describe, expect, it } from 'vitest'
import {
  equip,
  GEAR_PRESETS,
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

describe('the unique name rule', () => {
  it('takes off a worn item with the same name in another slot', () => {
    const worn = equip({}, ring).gear
    const { gear, cleared } = equip(worn, { ...ring, slot: 'Band', rarity: 'rare' })
    expect(cleared).toBe('Ring')
    expect(gear.Ring).toBeUndefined()
    expect(gear.Band?.rarity).toBe('rare')
  })

  it('holds in every preset', () => {
    for (const preset of GEAR_PRESETS) {
      const names = TRINKET_SLOTS.flatMap((s) => (preset.gear[s] ? [uniqueName(preset.gear[s])] : []))
      expect(new Set(names).size, preset.name).toBe(names.length)
      for (const s of TRINKET_SLOTS) expect(preset.gear[s]?.slot ?? s).toBe(s)
    }
  })
})
