import { isSlotOpen, MAX_LEVEL, SLOT_LEVELS, slotLevel } from './levels.ts'
import { canLearn, canUnlearn, pointsSpent, rankOf, rival, type Ranks } from './rules.ts'
import type { TalentDef, TreeDef } from './types.ts'

/** The artifact held, which tree sits in each slot (by id, null = empty), and the ranks learned in each tree. */
export interface Loadout {
  /** 1 to 60. Levels 1–8 open the slots, one each; every level after gives a talent point. */
  level: number
  artifact: string
  /** Slot 1 holds the artifact's own tree, when it has one. */
  slots: readonly (string | null)[]
  ranks: Readonly<Record<string, Ranks>>
}

export interface PointRules {
  /** Points to spend across every slotted tree. */
  total: number
  /** Most points any one tree can hold. */
  perTree: number
  /** Most points a small tree (an ultimate's or a group buff's) can hold, if not `perTree`. */
  perSmall?: number
}

/** Slot kinds whose trees are small: the ultimate, mobility and the group buff. */
export const SMALL_KINDS: ReadonlySet<TreeDef['kind']> = new Set<TreeDef['kind']>(['cooldown', 'mobility', 'buff'])

export const isSmallTree = (tree: TreeDef) => SMALL_KINDS.has(tree.kind)

/** Most points this tree can hold: fewer for an ultimate, mobility or a group buff. */
export function capFor(tree: TreeDef, rules: PointRules): number {
  return isSmallTree(tree) ? (rules.perSmall ?? rules.perTree) : rules.perTree
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
  Math.min(rules.total - totalSpent(loadout), capFor(tree, rules) - pointsSpent(tree, ranksIn(loadout, tree)))

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

/** Takes one side of a choice: the other side's points come out first, or nothing changes. */
export function takeSide(loadout: Loadout, tree: TreeDef, talent: TalentDef, rules: PointRules): Loadout {
  const other = rival(tree, talent)
  let next = loadout
  while (other && rankOf(ranksIn(next, tree), other) > 0) {
    const after = unlearn(next, tree, other)
    if (after === next) return loadout
    next = after
  }
  const learned = learn(next, tree, talent, rules)
  return learned === next ? loadout : learned
}

/**
 * Puts a tree in a slot (null empties it). A tree that's already in another slot trades places
 * with whatever was here, keeping both trees' points; a tree that leaves the loadout refunds its points.
 */
export function slotTree(loadout: Loadout, index: number, treeId: string | null): Loadout {
  if (treeId !== null && !isSlotOpen(index, loadout.level)) return loadout
  const slots = [...loadout.slots]
  const previous = slots[index]
  const from = treeId === null ? -1 : slots.indexOf(treeId)
  if (from === index) return loadout
  if (from >= 0) slots[from] = previous
  slots[index] = treeId
  const ranks = { ...loadout.ranks }
  if (previous !== null && !slots.includes(previous)) delete ranks[previous]
  return { ...loadout, slots, ranks }
}

export const resetTalents = (loadout: Loadout): Loadout => ({ ...loadout, ranks: {} })

/** The lowest level that holds this build: every filled slot open, and a point for every rank learned. */
export function levelNeeded(loadout: Loadout): number {
  const last = loadout.slots.reduce((at, id, i) => (id === null ? at : i), 0)
  const spent = totalSpent(loadout)
  return Math.max(slotLevel(last), spent > 0 ? SLOT_LEVELS + spent : 1)
}

/** Sets the level, but never below what the build needs: empty slots or reset talents to go lower. */
export const setLevel = (loadout: Loadout, level: number): Loadout => ({
  ...loadout,
  level: Math.min(MAX_LEVEL, Math.max(levelNeeded(loadout), Math.round(level))),
})
