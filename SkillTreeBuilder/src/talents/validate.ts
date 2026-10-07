import { rankValueCounts } from './description.ts'
import type { SlotKind, TreeDef } from './types.ts'

/** Catches tree-data mistakes (typos in ids, overlapping cells, missing art) and lists them in plain words. */
export function validateTree(tree: TreeDef, hasArt: (folder: string, name: string) => boolean): string[] {
  const problems: string[] = []
  // Trees without an art folder use placeholder art, so there's nothing to check.
  const art = (label: string, name: string | undefined) => {
    if (tree.artFolder === undefined) return
    if (name === undefined) problems.push(`${label}: no icon set`)
    else if (!hasArt(tree.artFolder, name)) problems.push(`${label}: no "${name}.png" in Art/${tree.artFolder}`)
  }
  if (tree.background !== undefined) art('Tree background', tree.background)
  art(tree.ability.name, tree.ability.icon)
  for (const effect of tree.effects ?? []) art(effect.name, effect.icon)

  const ids = new Set<string>()
  const cells = new Map<string, string>()
  for (const t of tree.talents) {
    if (ids.has(t.id)) problems.push(`Two talents use the id "${t.id}"`)
    ids.add(t.id)
    const cell = `${t.row},${t.col}`
    const other = cells.get(cell)
    if (other !== undefined) problems.push(`${t.name} and ${other} are both in row ${t.row + 1}, column ${t.col + 1}`)
    cells.set(cell, t.name)
    if (!Number.isInteger(t.row) || t.row < 0) problems.push(`${t.name}: row must be 0 or more`)
    if (!Number.isInteger(t.col) || t.col < 0 || t.col >= tree.columns) {
      problems.push(`${t.name}: column must be 0–${tree.columns - 1}`)
    }
    if (!Number.isInteger(t.maxRank) || t.maxRank < 1) problems.push(`${t.name}: maxRank must be 1 or more`)
    for (const count of rankValueCounts(t.description)) {
      if (count !== t.maxRank) problems.push(`${t.name}: a {…} group has ${count} values but the talent has ${t.maxRank} ranks`)
    }
    art(t.name, t.icon)
  }

  for (const t of tree.talents) {
    if (t.requires === undefined) continue
    const pre = tree.talents.find((p) => p.id === t.requires)
    if (pre === undefined) problems.push(`${t.name} requires "${t.requires}", which isn't a talent in this tree`)
    else if (pre.row > t.row) problems.push(`${t.name} requires ${pre.name}, which sits in a lower row`)
    else if (pre === t) problems.push(`${t.name} requires itself`)
  }
  return problems
}

/** Checks the tree list and the starting loadout against the slot layout. */
export function validateCatalog(
  trees: readonly TreeDef[],
  slots: readonly SlotKind[],
  starting: readonly (string | null)[],
): string[] {
  const problems: string[] = []
  const seen = new Set<string>()
  for (const tree of trees) {
    if (seen.has(tree.id)) problems.push(`Two trees use the id "${tree.id}"`)
    seen.add(tree.id)
  }
  if (starting.length !== slots.length) problems.push(`The starting loadout has ${starting.length} slots, not ${slots.length}`)
  starting.forEach((id, i) => {
    if (id === null) return
    const tree = trees.find((t) => t.id === id)
    if (tree === undefined) problems.push(`Starting slot ${i + 1} holds "${id}", which isn't a tree`)
    else if (tree.kind !== slots[i]) problems.push(`Starting slot ${i + 1} is a ${slots[i]} slot, but ${tree.ability.name} is ${tree.kind}`)
    if (starting.indexOf(id) !== i) problems.push(`"${id}" starts in more than one slot`)
  })
  return problems
}
