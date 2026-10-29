import { useState } from 'react'
import { rulesAt } from './levels.ts'
import { learn, resetTalents, setLevel, slotTree, takeSide, unlearn, type Loadout, type PointRules } from './loadout.ts'
import { setArtifact } from './slots.ts'
import type { ArtifactDef, TalentDef, TreeDef } from './types.ts'

export function useLoadout(initial: Loadout | (() => Loadout), rules: PointRules, trees: readonly TreeDef[]) {
  const [loadout, setLoadout] = useState(initial)

  return {
    loadout,
    // The level sets how many points there are to spend.
    learn: (tree: TreeDef, talent: TalentDef) => setLoadout((l) => learn(l, tree, talent, rulesAt(rules, l.level))),
    unlearn: (tree: TreeDef, talent: TalentDef) => setLoadout((l) => unlearn(l, tree, talent)),
    takeSide: (tree: TreeDef, talent: TalentDef) => setLoadout((l) => takeSide(l, tree, talent, rulesAt(rules, l.level))),
    level: (level: number) => setLoadout((l) => setLevel(l, level)),
    slot: (index: number, treeId: string | null) => setLoadout((l) => slotTree(l, index, treeId)),
    hold: (artifact: ArtifactDef) => setLoadout((l) => setArtifact(l, artifact, trees)),
    resetTalents: () => setLoadout(resetTalents),
  }
}
