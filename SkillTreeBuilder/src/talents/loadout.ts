import { canLearn, canUnlearn, pointsSpent, rankOf, type Ranks } from './rules.ts'
import type { TalentDef, TreeDef } from './types.ts'

/** Which tree sits in each slot (by id, null = empty), and the ranks learned in each tree. */
export interface Loadout {
  slots: readonly (string | null)[]
  ranks: Readonly<Record<string, Ranks>>
}

export interface PointRules {
  /** Points to spend across every slotted tree. */
  total: number
  /** Most points any one tree can hold. */
  perTree: number
}

const NO_RANKS: Ranks = {}

export const ranksIn = (loadout: Loadout, tree: TreeDef): Ranks => loadout.ranks[tree.id] ?? NO_RANKS

export const totalSpent = (loadout: Loadout): number =>
  Object.values(loadout.ranks).reduce(
    (sum, ranks) => sum + Object.values(ranks).reduce((a, b) => a + b, 0),
    0,
  )

/** Points a tree can still take: whatever is left overall, up to the per-tree cap. */
export const pointsLeftFor = (loadout: Loadout, tree: TreeDef, rules: PointRules): number =>
  Math.min(rules.total - totalSpent(loadout), rules.perTree - pointsSpent(tree, ranksIn(loadout, tree)))

function withRank(loadout: Loadout, tree: TreeDef, talent: TalentDef, rank: number): Loadout {
  return { ...loadout, ranks: { ...loadout.ranks, [tree.id]: { ...ranksIn(loadout, tree), [talent.id]: rank } } }
}

export function learn(loadout: Loadout, tree: TreeDef, talent: TalentDef, rules: PointRules): Loadout {
  const ranks = ranksIn(loadout, tree)
  if (!canLearn(tree, ranks, talent, pointsLeftFor(loadout, tree, rules))) return loadout
  return withRank(loadout, tree, talent, rankOf(ranks, talent) + 1)
}

export function unlearn(loadout: Loadout, tree: TreeDef, talent: TalentDef): Loadout {
  const ranks = ranksIn(loadout, tree)
  if (!canUnlearn(tree, ranks, talent)) return loadout
  return withRank(loadout, tree, talent, rankOf(ranks, talent) - 1)
}

/**
 * Puts a tree in a slot (null empties it). A tree that's already in another slot trades places
 * with whatever was here, keeping both trees' points; a tree that leaves the loadout refunds its points.
 */
export function slotTree(loadout: Loadout, index: number, treeId: string | null): Loadout {
  const slots = [...loadout.slots]
  const previous = slots[index]
  const from = treeId === null ? -1 : slots.indexOf(treeId)
  if (from === index) return loadout
  if (from >= 0) slots[from] = previous
  slots[index] = treeId
  const ranks = { ...loadout.ranks }
  if (previous !== null && !slots.includes(previous)) delete ranks[previous]
  return { slots, ranks }
}

export const resetTalents = (loadout: Loadout): Loadout => ({ ...loadout, ranks: {} })
