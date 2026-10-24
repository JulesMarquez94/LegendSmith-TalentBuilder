import type { Loadout } from './loadout.ts'
import type { ArtifactDef, SlotKind, TreeDef } from './types.ts'

/**
 * The six slots, left to right then top to bottom (3 across, 2 down): the artifact, three role
 * abilities, the big cooldown and mobility. The artifact decides what the role slots hold.
 */
export const slotKinds = (artifact: ArtifactDef): readonly SlotKind[] => [
  'artifact',
  artifact.roleKind,
  artifact.roleKind,
  artifact.roleKind,
  'cooldown',
  'mobility',
]

/** A tree fits a slot of its kind, if it belongs to the artifact's role or to every role. */
export const fits = (tree: TreeDef, kind: SlotKind, artifact: ArtifactDef) =>
  tree.kind === kind && kind !== 'artifact' && (tree.role === undefined || tree.role === artifact.role)

/**
 * Holds a different artifact. Its tree (if it has one) goes in slot 1, abilities that no longer
 * fit leave their slots, and every tree that leaves the loadout refunds its points.
 */
export function setArtifact(loadout: Loadout, artifact: ArtifactDef, trees: readonly TreeDef[]): Loadout {
  const kinds = slotKinds(artifact)
  const slots = loadout.slots.map((id, i) => {
    if (i === 0) return artifact.tree?.id ?? null
    const tree = trees.find((t) => t.id === id)
    return tree && fits(tree, kinds[i], artifact) ? id : null
  })
  const ranks = Object.fromEntries(Object.entries(loadout.ranks).filter(([id]) => slots.includes(id)))
  return { artifact: artifact.id, slots, ranks }
}
