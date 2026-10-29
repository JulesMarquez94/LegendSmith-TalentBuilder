import { describe, expect, it } from 'vitest'
import { miasma } from '../trees/necro/spells.ts'
import { plague } from '../trees/plague.ts'
import { describeRank } from './description.ts'
import { canLearn, canUnlearn, isRowUnlocked, talentState } from './rules.ts'

const talent = (id: string) => {
  const found = plague.talents.find((t) => t.id === id)
  if (!found) throw new Error(`No talent "${id}"`)
  return found
}

describe('rows', () => {
  it('unlock for every 2 points spent in the rows above', () => {
    expect(isRowUnlocked(plague, {}, 0)).toBe(true)
    expect(isRowUnlocked(plague, { 'lasting-plagues': 1 }, 1)).toBe(false)
    expect(isRowUnlocked(plague, { 'lasting-plagues': 2 }, 1)).toBe(true)
    expect(isRowUnlocked(plague, { 'lasting-plagues': 3 }, 2)).toBe(false)
    // Any mix of the rows above counts, like WoW.
    expect(isRowUnlocked(plague, { 'lasting-plagues': 3, pandemic: 1 }, 2)).toBe(true)
  })

  it('keep their talents locked until then', () => {
    expect(canLearn(plague, { 'potent-plagues': 1 }, talent('pandemic'), 8)).toBe(false)
    expect(canLearn(plague, { 'potent-plagues': 2 }, talent('pandemic'), 7)).toBe(true)
  })
})

describe('prerequisites', () => {
  it('need the required talent at max rank', () => {
    const ranks = { 'potent-plagues': 1, 'lasting-plagues': 2, pandemic: 1 }
    expect(canLearn(plague, ranks, talent('aggravating'), 5)).toBe(false)
    expect(canLearn(plague, { ...ranks, 'potent-plagues': 2 }, talent('aggravating'), 4)).toBe(true)
  })

  it('stop the required talent from being unlearned while used', () => {
    const ranks = { 'lasting-plagues': 2, 'volatile-plague': 3, pandemic: 1, 'bursting-sores': 1 }
    expect(canUnlearn(plague, ranks, talent('volatile-plague'))).toBe(false)
    expect(canUnlearn(plague, ranks, talent('bursting-sores'))).toBe(true)
  })
})

describe('unlearning', () => {
  it('is blocked when a lower row would lose its unlock', () => {
    const ranks = { 'lasting-plagues': 2, pandemic: 1 }
    expect(canUnlearn(plague, ranks, talent('lasting-plagues'))).toBe(false)
    expect(canUnlearn(plague, ranks, talent('pandemic'))).toBe(true)
    expect(canUnlearn(plague, { ...ranks, 'lasting-plagues': 3 }, talent('lasting-plagues'))).toBe(true)
  })

  it('needs a point to take back', () => {
    expect(canUnlearn(plague, {}, talent('lasting-plagues'))).toBe(false)
  })
})

describe('talent states', () => {
  it('grey out talents with no points once none can be spent', () => {
    const lasting = talent('lasting-plagues')
    expect(canLearn(plague, {}, lasting, 0)).toBe(false)
    expect(talentState(plague, {}, lasting, 0)).toBe('locked')
    expect(talentState(plague, { 'lasting-plagues': 1 }, lasting, 0)).toBe('partial')
    expect(talentState(plague, { 'lasting-plagues': 3 }, lasting, 0)).toBe('maxed')
  })
})

describe('describeRank', () => {
  it('fills in the values for the rank', () => {
    const text = talent('volatile-plague').description
    expect(describeRank(text, 1)).toContain('by 0.5 sec and instantly deals 1 sec worth')
    expect(describeRank(text, 3)).toContain('by 1.5 sec and instantly deals 3 sec worth')
  })
})

describe('choices', () => {
  const choice = (id: string) => miasma.talents.find((t) => t.id === id)!
  // Enough points in the rows above to reach row 4.
  const above = { 'lingering-pox': 2, 'restless-fog': 2, 'virulent-pox': 2 }

  it('let you take one of a choice pair, not both', () => {
    expect(canLearn(miasma, above, choice('emanation'), 6)).toBe(true)
    expect(canLearn(miasma, above, choice('quickening-pulse'), 6)).toBe(true)
    const took = { ...above, emanation: 1 }
    expect(canLearn(miasma, took, choice('quickening-pulse'), 5)).toBe(false)
    // Taking the point back out frees the other.
    expect(canUnlearn(miasma, took, choice('emanation'))).toBe(true)
    expect(canLearn(miasma, above, choice('quickening-pulse'), 6)).toBe(true)
  })
})
