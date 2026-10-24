import type { Mechanic } from '../game/types.ts'
import { rankValueCounts } from './description.ts'
import type { Loadout } from './loadout.ts'
import { fits, slotKinds } from './slots.ts'
import type { ArtifactDef, TreeDef } from './types.ts'

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
    // A playable tree whose talent does nothing would quietly show wrong numbers in the arena.
    if (tree.spec && !t.effects) problems.push(`${t.name}: no effects, so it does nothing in the test arena`)
    for (let rank = 1; rank <= t.maxRank && t.effects; rank++) {
      for (const m of t.effects(rank)) {
        if (m.kind === 'mod' && m.when && m.key !== 'amount') {
          problems.push(`${t.name}: only "amount" can have a condition, not "${m.key}"`)
        }
      }
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

/** Abilities a mechanic names by id: grants add to them, `fire` casts them. */
function namedAbilities(m: Mechanic): string[] {
  if (m.kind === 'grant') return [m.to]
  if (m.kind === 'proc') return m.proc.actions.flatMap((a) => (a.do === 'fire' ? [a.ability] : []))
  return []
}

/** Checks the trees and artifacts against each other, and the starting loadout against the slots. */
export function validateCatalog(
  trees: readonly TreeDef[],
  artifacts: readonly ArtifactDef[],
  starting: Loadout,
): string[] {
  const problems: string[] = []
  const seen = new Set<string>()
  for (const tree of trees) {
    if (seen.has(tree.id)) problems.push(`Two trees use the id "${tree.id}"`)
    seen.add(tree.id)
    if (tree.kind === 'artifact' && !artifacts.some((a) => a.tree === tree)) {
      problems.push(`${tree.ability.name} is an artifact tree, but no artifact holds it`)
    }
    for (const t of tree.talents) {
      for (const m of t.effects?.(t.maxRank) ?? []) {
        for (const id of namedAbilities(m)) {
          const target = trees.find((other) => other.id === id)
          if (!target) problems.push(`${t.name} names "${id}", which isn't a tree`)
          else if (!target.spec) problems.push(`${t.name} names ${target.ability.name}, which isn't playable`)
        }
      }
    }
  }
  for (const artifact of artifacts) {
    if (artifact.tree && artifact.tree.kind !== 'artifact') problems.push(`${artifact.name}'s tree must be an artifact tree`)
    if (artifact.tree && !trees.includes(artifact.tree)) problems.push(`${artifact.name}'s tree isn't in the tree list`)
  }

  const artifact = artifacts.find((a) => a.id === starting.artifact)
  if (!artifact) return [...problems, `The starting artifact "${starting.artifact}" isn't an artifact`]
  const slots = slotKinds(artifact)
  if (starting.slots.length !== slots.length) problems.push(`The starting loadout has ${starting.slots.length} slots, not ${slots.length}`)
  if (starting.slots[0] !== (artifact.tree?.id ?? null)) problems.push(`Starting slot 1 must hold ${artifact.name}'s tree`)
  starting.slots.forEach((id, i) => {
    if (id === null || i === 0) return
    const tree = trees.find((t) => t.id === id)
    if (tree === undefined) problems.push(`Starting slot ${i + 1} holds "${id}", which isn't a tree`)
    else if (!fits(tree, slots[i], artifact)) {
      const what = tree.role && tree.kind !== slots[i] ? tree.kind : [tree.role, tree.kind].filter(Boolean).join(' ')
      problems.push(`Starting slot ${i + 1} is a ${slots[i]} slot, but ${tree.ability.name} is ${what}`)
    }
    if (starting.slots.indexOf(id) !== i) problems.push(`"${id}" starts in more than one slot`)
  })
  return problems
}
