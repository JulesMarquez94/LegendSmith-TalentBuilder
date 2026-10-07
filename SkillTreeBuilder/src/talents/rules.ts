import type { TalentDef, TreeDef } from './types.ts'

/** Current rank of each talent in one tree, keyed by talent id (missing = 0). */
export type Ranks = Readonly<Record<string, number>>

export type TalentState = 'locked' | 'available' | 'partial' | 'maxed'

export function rankOf(ranks: Ranks, talent: TalentDef): number {
  return ranks[talent.id] ?? 0
}

export function pointsSpent(tree: TreeDef, ranks: Ranks): number {
  return tree.talents.reduce((sum, t) => sum + rankOf(ranks, t), 0)
}

/** Points spent in the rows above `row` — what unlocks that row. */
export function pointsAbove(tree: TreeDef, ranks: Ranks, row: number): number {
  return tree.talents.reduce((sum, t) => (t.row < row ? sum + rankOf(ranks, t) : sum), 0)
}

export function rowRequirement(tree: TreeDef, row: number): number {
  return row * tree.pointsPerRow
}

export function isRowUnlocked(tree: TreeDef, ranks: Ranks, row: number): boolean {
  return pointsAbove(tree, ranks, row) >= rowRequirement(tree, row)
}

export function prerequisite(tree: TreeDef, talent: TalentDef): TalentDef | undefined {
  return talent.requires === undefined ? undefined : tree.talents.find((t) => t.id === talent.requires)
}

/** Like WoW, a talent behind an arrow needs its prerequisite fully ranked. */
export function isPrerequisiteMet(tree: TreeDef, ranks: Ranks, talent: TalentDef): boolean {
  const pre = prerequisite(tree, talent)
  return pre === undefined || rankOf(ranks, pre) >= pre.maxRank
}

export function canLearn(tree: TreeDef, ranks: Ranks, talent: TalentDef, pointsLeft: number): boolean {
  return (
    pointsLeft > 0 &&
    rankOf(ranks, talent) < talent.maxRank &&
    isRowUnlocked(tree, ranks, talent.row) &&
    isPrerequisiteMet(tree, ranks, talent)
  )
}

/**
 * Same rule as the WoW Classic talent calculators: a point can only come back
 * out if nothing depends on it — no talent that requires this one has points,
 * and every lower row with points still has enough spent above it.
 */
export function canUnlearn(tree: TreeDef, ranks: Ranks, talent: TalentDef): boolean {
  if (rankOf(ranks, talent) === 0) return false
  if (tree.talents.some((t) => t.requires === talent.id && rankOf(ranks, t) > 0)) return false
  return tree.talents.every(
    (t) =>
      t.row <= talent.row ||
      rankOf(ranks, t) === 0 ||
      pointsAbove(tree, ranks, t.row) - 1 >= rowRequirement(tree, t.row),
  )
}

export function talentState(tree: TreeDef, ranks: Ranks, talent: TalentDef, pointsLeft: number): TalentState {
  const rank = rankOf(ranks, talent)
  if (rank >= talent.maxRank) return 'maxed'
  if (rank > 0) return 'partial'
  return canLearn(tree, ranks, talent, pointsLeft) ? 'available' : 'locked'
}
