import { describe, expect, it } from 'vitest'
import { plague } from '../trees/plague.ts'
import { POINT_RULES } from '../trees/index.ts'
import { isSlotOpen, pointsAt, rulesAt } from './levels.ts'
import { learn, levelNeeded, setLevel, slotTree, totalSpent, type Loadout } from './loadout.ts'

const fresh: Loadout = {
  level: 1,
  artifact: 'tome-of-summoning',
  slots: ['tome-of-summoning', null, null, null, null, null, null, null],
  ranks: {},
}

describe('levels', () => {
  it('open a slot each from 1 to 8, then give a talent point each, 52 at 60', () => {
    expect([1, 2, 7, 8].map((level) => [isSlotOpen(level - 1, level), isSlotOpen(level, level)])).toEqual([
      [true, false],
      [true, false],
      [true, false],
      [true, false],
    ])
    expect([1, 8, 9, 20, 60, 70].map(pointsAt)).toEqual([0, 0, 1, 12, 52, 52])
    expect(POINT_RULES.total).toBe(52)
  })

  it("won't slot an ability before its slot opens", () => {
    expect(slotTree(fresh, 1, 'plague').slots[1]).toBeNull()
    expect(slotTree({ ...fresh, level: 2 }, 1, 'plague').slots[1]).toBe('plague')
  })

  it('give only the points of the level to spend', () => {
    const at10: Loadout = { ...fresh, level: 10, slots: ['tome-of-summoning', 'plague', null, null, null, null, null, null] }
    const lasting = plague.talents.find((t) => t.id === 'lasting-plagues')!
    const potent = plague.talents.find((t) => t.id === 'potent-plagues')!
    const l = [lasting, lasting, potent].reduce((acc, t) => learn(acc, plague, t, rulesAt(POINT_RULES, acc.level)), at10)
    expect(totalSpent(l)).toBe(2)
  })

  it("won't go below what the build needs", () => {
    const build = { ...fresh, level: 60, slots: ['tome-of-summoning', null, 'plague', null, null, null, null, null] }
    expect(levelNeeded(build)).toBe(3)
    expect(setLevel(build, 1).level).toBe(3)
    const learned = { ...build, ranks: { plague: { 'lasting-plagues': 2, 'potent-plagues': 2 } } }
    expect(levelNeeded(learned)).toBe(12)
    expect(setLevel(learned, 5).level).toBe(12)
    expect(setLevel(learned, 99).level).toBe(60)
    expect(setLevel(fresh, 1).level).toBe(1)
  })
})
