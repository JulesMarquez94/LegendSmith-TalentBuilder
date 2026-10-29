import { describe, expect, it } from 'vitest'
import { hasArt } from '../art.ts'
import { SEATS, seatOf } from '../components/labels.ts'
import { ARTIFACTS, POINT_RULES, STARTING_LOADOUT, TREES } from '../trees/index.ts'
import { more, proc, restore, talent } from '../trees/authoring.ts'
import { harvest } from '../trees/necro/spells.ts'
import { plague } from '../trees/plague.ts'
import type { TreeDef } from './types.ts'
import { capFor, isSmallTree } from './loadout.ts'
import { SMALL_RANKS, TREE_RANKS, treeRanks, validateCatalog, validateTree } from './validate.ts'

describe('tree data', () => {
  it.each(TREES.map((tree) => [tree.ability.name, tree] as const))('%s has no problems', (_, tree) => {
    expect(validateTree(tree, hasArt)).toEqual([])
  })

  it('has two artifacts for every seat: tank, healer, melee and ranged damage', () => {
    for (const seat of SEATS) expect(ARTIFACTS.filter((a) => seatOf(a) === seat), seat).toHaveLength(2)
  })

  it('fits the slots it starts in', () => {
    expect(validateCatalog(TREES, ARTIFACTS, STARTING_LOADOUT)).toEqual([])
  })

  it('gives every tree 18 ranks (an ultimate, mobility or group buff 9), more than it can take, so the cap forces choices', () => {
    for (const tree of TREES) {
      expect(treeRanks(tree), tree.id).toBe(isSmallTree(tree) ? SMALL_RANKS : TREE_RANKS)
      expect(treeRanks(tree), tree.id).toBeGreaterThan(capFor(tree, POINT_RULES))
    }
  })

  it('keeps every talent of a small tree within reach of its points', () => {
    for (const tree of TREES.filter(isSmallTree)) {
      for (const t of tree.talents) {
        expect(t.row * tree.pointsPerRow, `${tree.id}/${t.id}`).toBeLessThan(capFor(tree, POINT_RULES))
      }
    }
  })

  it('keeps ability talents off other abilities and off any one weapon', () => {
    const greedy: TreeDef = {
      ...harvest,
      talents: [
        talent({
          id: 'soul-link',
          name: 'Soul Link',
          row: 0,
          col: 0,
          text: 'Harvest casts Plague and gives you an imp. Your imps deal 5% more damage.',
          does: () => [
            proc('cast', 'harvest', [restore(1), { do: 'fire', ability: 'plague' }]),
            more('amount', 'minion', 5),
          ],
        }),
      ],
    }
    const trees = TREES.map((t) => (t === harvest ? greedy : t))
    expect(validateCatalog(trees, ARTIFACTS, STARTING_LOADOUT)).toEqual([
      'Soul Link (Harvest) aims at Plague: talents aim at their own ability or at families',
      'Soul Link (Harvest) aims at minions, but not every weapon has them',
      'Soul Link (Harvest) gives back a flat amount of resource, not a share of the maximum',
    ])
  })

  it('reports broken data in plain words', () => {
    const pandemic = plague.talents.find((t) => t.id === 'pandemic')!
    const broken: TreeDef = {
      ...plague,
      talents: [...plague.talents, { ...pandemic, id: 'pandemic-copy', requires: 'nope' }],
    }
    expect(validateTree(broken, hasArt)).toEqual([
      'Pandemic and Pandemic are both in row 2, column 1',
      "Plague's talents hold 19 ranks in all, not 18",
      `Pandemic requires "nope", which isn't a talent in this tree`,
    ])
    expect(
      validateCatalog(TREES, ARTIFACTS, {
        level: 60,
        artifact: 'tome-of-summoning',
        slots: ['tome-of-summoning', 'shadow-step', null, null, null, null, null, null],
        ranks: {},
      }),
    ).toEqual(['Starting slot 2 is a damage slot, but Shadow Step is mobility'])
    expect(
      validateCatalog(TREES, ARTIFACTS, {
        ...STARTING_LOADOUT,
        slots: ['lifewarden-staff', 'mend', null, null, null, 'army-of-the-dead', null, null],
      }),
    ).toEqual(['Starting slot 6 is a cooldown slot, but Army of the Dead is damage cooldown'])
  })
})
