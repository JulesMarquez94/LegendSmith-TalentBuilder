import { canLearn, rankOf, rival, talentState, type Ranks, type TalentState } from '../talents/rules.ts'
import type { TalentDef, TreeDef } from '../talents/types.ts'

/** A choice pair, left side first. */
export type Pair = readonly [TalentDef, TalentDef]

/** What a tree draws: one icon per talent, but one split icon for each choice pair. */
export type TreeNode = { talent: TalentDef } | { choice: Pair }

export function nodesOf(tree: TreeDef): TreeNode[] {
  return tree.talents.flatMap((talent): TreeNode[] => {
    const other = rival(tree, talent)
    if (!other) return [{ talent }]
    // Drawn once, with the first of the two in the list.
    if (tree.talents.indexOf(other) < tree.talents.indexOf(talent)) return []
    return [{ choice: talent.col <= other.col ? [talent, other] : [other, talent] }]
  })
}

/** Where a talent's icon sits. A choice pair shares one, halfway between their two places. */
export function placeOf(tree: TreeDef, talent: TalentDef): { row: number; col: number } {
  const other = rival(tree, talent)
  return other ? { row: talent.row, col: (talent.col + other.col) / 2 } : { row: talent.row, col: talent.col }
}

/** The side of a choice that has points, if either. */
export const takenOf = (ranks: Ranks, pair: Pair) => pair.find((t) => rankOf(ranks, t) > 0)

/** The split icon's state: the taken side's, or learnable while either side is. */
export function choiceState(tree: TreeDef, ranks: Ranks, pair: Pair, pointsLeft: number): TalentState {
  const taken = takenOf(ranks, pair)
  if (taken) return talentState(tree, ranks, taken, pointsLeft)
  return pair.some((t) => canLearn(tree, ranks, t, pointsLeft)) ? 'available' : 'locked'
}
