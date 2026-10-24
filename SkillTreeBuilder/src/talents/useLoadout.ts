import { useState } from 'react'
import { learn, resetTalents, slotTree, unlearn, type Loadout, type PointRules } from './loadout.ts'
import { setArtifact } from './slots.ts'
import type { ArtifactDef, TalentDef, TreeDef } from './types.ts'

export function useLoadout(initial: Loadout | (() => Loadout), rules: PointRules, trees: readonly TreeDef[]) {
  const [loadout, setLoadout] = useState(initial)

  return {
    loadout,
    learn: (tree: TreeDef, talent: TalentDef) => setLoadout((l) => learn(l, tree, talent, rules)),
    unlearn: (tree: TreeDef, talent: TalentDef) => setLoadout((l) => unlearn(l, tree, talent)),
    slot: (index: number, treeId: string | null) => setLoadout((l) => slotTree(l, index, treeId)),
    hold: (artifact: ArtifactDef) => setLoadout((l) => setArtifact(l, artifact, trees)),
    resetTalents: () => setLoadout(resetTalents),
  }
}
