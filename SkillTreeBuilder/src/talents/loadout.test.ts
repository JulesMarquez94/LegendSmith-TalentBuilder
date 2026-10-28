import { describe, expect, it } from 'vitest'
import { bloodFrenzy } from '../trees/blood.ts'
import { plague } from '../trees/plague.ts'
import { capFor, learn, pointsLeftFor, ranksIn, slotTree, totalSpent, type Loadout, type PointRules } from './loadout.ts'
import { pointsSpent } from './rules.ts'

const RULES: PointRules = { total: 80, perTree: 15 }
const START: Loadout = { artifact: 'tome-of-summoning', slots: [null, 'plague', 'bone-spear', null, null, null], ranks: {} }

const times = (n: number, id: string) => Array<string>(n).fill(id)
// 17 clicks down the Plague tree in an order the row unlocks allow.
const PATH = [
  ...times(2, 'lasting-plagues'),
  ...times(2, 'potent-plagues'),
  'pandemic',
  ...times(3, 'volatile-plague'),
  'critical-condition',
  ...times(2, 'aggravating'),
  ...times(3, 'convalescence'),
  ...times(3, 'terminal'),
]

const click = (loadout: Loadout, ids: string[], rules = RULES) =>
  ids.reduce((l, id) => learn(l, plague, plague.talents.find((t) => t.id === id)!, rules), loadout)

describe('talent points', () => {
  it('stop at 15 in one tree', () => {
    const l = click(START, PATH)
    expect(pointsSpent(plague, ranksIn(l, plague))).toBe(15)
    expect(ranksIn(l, plague).terminal).toBe(1)
    expect(pointsLeftFor(l, plague, RULES)).toBe(0)
  })

  it('stop when the shared pool runs out', () => {
    const l = click(START, PATH, { total: 5, perTree: 15 })
    expect(totalSpent(l)).toBe(5)
  })

  it('stop at 6 in an ultimate', () => {
    const rules: PointRules = { total: 60, perTree: 12, perSmall: 6 }
    const loadout: Loadout = { ...START, slots: [null, null, null, null, 'blood-frenzy', null], ranks: {} }
    const path = ['bloodlust', 'bloodlust', 'lingering-rage', 'lingering-rage', 'quickened-pulse', 'quickened-pulse', 'twin-frenzy']
    const l = path.reduce((acc, id) => learn(acc, bloodFrenzy, bloodFrenzy.talents.find((t) => t.id === id)!, rules), loadout)
    expect(pointsSpent(bloodFrenzy, ranksIn(l, bloodFrenzy))).toBe(6)
    expect(ranksIn(l, bloodFrenzy)['twin-frenzy']).toBeUndefined()
    expect(capFor(bloodFrenzy, rules)).toBe(6)
    expect(capFor(plague, rules)).toBe(12)
  })
})

describe('slotting', () => {
  const learned = click(START, PATH.slice(0, 4))

  it('refunds a tree that leaves the loadout', () => {
    const l = slotTree(learned, 1, 'raise-ghoul')
    expect(l.slots[1]).toBe('raise-ghoul')
    expect(totalSpent(l)).toBe(0)
  })

  it('swaps with a tree already in another slot, keeping both builds', () => {
    const l = slotTree(learned, 2, 'plague')
    expect(l.slots).toEqual([null, 'bone-spear', 'plague', null, null, null])
    expect(totalSpent(l)).toBe(4)
  })

  it('empties a slot and refunds it', () => {
    const l = slotTree(learned, 1, null)
    expect(l.slots[1]).toBeNull()
    expect(totalSpent(l)).toBe(0)
  })
})
