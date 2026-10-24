import type { Loadout } from './loadout.ts'
import type { ArtifactDef, SlotKind, TreeDef } from './types.ts'

/**
 * The eight slots, left to right then top to bottom (3 across): the artifact, three role abilities,
 * the big cooldown, mobility, the group buff and outdoor talents. The artifact decides what the role
 * slots hold and which group buffs fit.
 */
export const slotKinds = (artifact: ArtifactDef): readonly SlotKind[] => [
  'artifact',
  artifact.roleKind,
  artifact.roleKind,
  artifact.roleKind,
  'cooldown',
  'mobility',
  'buff',
  'outdoor',
]

/** The slots the arena's action bar and keys use: the artifact, role abilities, ultimate, mobility. */
export const ACTION_SLOTS = 6

/** A tree fits a slot of its kind, if it belongs to the artifact's role or to every role. */
export const fits = (tree: TreeDef, kind: SlotKind, artifact: ArtifactDef) =>
  tree.kind === kind &&
  kind !== 'artifact' &&
  kind !== 'outdoor' &&
  (tree.role === undefined || tree.role === artifact.role) &&
  (tree.artifacts === undefined || tree.artifacts.includes(artifact.id))

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
