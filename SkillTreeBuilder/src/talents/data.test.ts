import { describe, expect, it } from 'vitest'
import { hasArt } from '../art.ts'
import { ARTIFACTS, POINT_RULES, STARTING_LOADOUT, TREES } from '../trees/index.ts'
import { more, proc, restore, talent } from '../trees/authoring.ts'
import { harvest } from '../trees/necro/spells.ts'
import { plague } from '../trees/plague.ts'
import type { TreeDef } from './types.ts'
import { TREE_RANKS, validateCatalog, validateTree } from './validate.ts'

describe('tree data', () => {
  it.each(TREES.map((tree) => [tree.ability.name, tree] as const))('%s has no problems', (_, tree) => {
    expect(validateTree(tree, hasArt)).toEqual([])
  })

  it('fits the slots it starts in', () => {
    expect(validateCatalog(TREES, ARTIFACTS, STARTING_LOADOUT)).toEqual([])
  })

  it('gives every tree more ranks than the per-tree cap but no more than 18, so the cap forces choices', () => {
    for (const tree of TREES) {
      const total = tree.talents.reduce((sum, t) => sum + t.maxRank, 0)
      expect(total, tree.id).toBeGreaterThan(POINT_RULES.perTree)
      expect(total, tree.id).toBeLessThanOrEqual(TREE_RANKS)
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
      "Plague's talents hold 19 ranks in all, more than 18",
      `Pandemic requires "nope", which isn't a talent in this tree`,
    ])
    expect(
      validateCatalog(TREES, ARTIFACTS, {
        artifact: 'tome-of-summoning',
        slots: ['tome-of-summoning', 'shadow-step', null, null, null, null, null, null],
        ranks: {},
      }),
    ).toEqual(['Starting slot 2 is a damage slot, but Shadow Step is mobility'])
    expect(
      validateCatalog(TREES, ARTIFACTS, {
        ...STARTING_LOADOUT,
        slots: ['lifewarden-staff', 'mend', null, null, 'army-of-the-dead', null, null, null],
      }),
    ).toEqual(['Starting slot 5 is a cooldown slot, but Army of the Dead is damage cooldown'])
  })
})
