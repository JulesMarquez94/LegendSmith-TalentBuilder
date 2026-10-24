import { describe, expect, it } from 'vitest'
import { hasArt } from '../art.ts'
import { ARTIFACTS, POINT_RULES, STARTING_LOADOUT, TREES } from '../trees/index.ts'
import { plague } from '../trees/plague.ts'
import type { TreeDef } from './types.ts'
import { validateCatalog, validateTree } from './validate.ts'

describe('tree data', () => {
  it.each(TREES.map((tree) => [tree.ability.name, tree] as const))('%s has no problems', (_, tree) => {
    expect(validateTree(tree, hasArt)).toEqual([])
  })

  it('fits the slots it starts in', () => {
    expect(validateCatalog(TREES, ARTIFACTS, STARTING_LOADOUT)).toEqual([])
  })

  it('gives every tree more ranks than the per-tree cap, so the cap forces choices', () => {
    for (const tree of TREES) {
      expect(tree.talents.reduce((sum, t) => sum + t.maxRank, 0)).toBeGreaterThan(POINT_RULES.perTree)
    }
  })

  it('reports broken data in plain words', () => {
    const pandemic = plague.talents.find((t) => t.id === 'pandemic')!
    const broken: TreeDef = {
      ...plague,
      talents: [...plague.talents, { ...pandemic, id: 'pandemic-copy', requires: 'nope' }],
    }
    expect(validateTree(broken, hasArt)).toEqual([
      'Pandemic and Pandemic are both in row 2, column 1',
      `Pandemic requires "nope", which isn't a talent in this tree`,
    ])
    expect(
      validateCatalog(TREES, ARTIFACTS, {
        artifact: 'tome-of-summoning',
        slots: [null, 'shadow-step', null, null, null, null],
        ranks: {},
      }),
    ).toEqual(['Starting slot 2 is a damage slot, but Shadow Step is mobility'])
    expect(
      validateCatalog(TREES, ARTIFACTS, { ...STARTING_LOADOUT, slots: ['lifewarden-staff', 'mend', null, null, 'army-of-the-dead', null] }),
    ).toEqual(['Starting slot 5 is a cooldown slot, but Army of the Dead is damage cooldown'])
  })
})
