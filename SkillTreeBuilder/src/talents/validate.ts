import type { Action, BuffSpec, CharStat, Condition, Match, Mechanic, ModMechanic, ValueKey } from '../game/types.ts'
import { rankValueCounts } from './description.ts'
import { isSmallTree, type Loadout } from './loadout.ts'
import { canMake, fits, NEEDS_LABEL, slotKinds } from './slots.ts'
import type { ArtifactDef, TreeDef } from './types.ts'

/**
 * The ranks every tree's talents hold in all. With 10 points to spend per tree, a tree of 18 makes
 * you leave 8 of them: you can't take everything.
 */
export const TREE_RANKS = 18

/** A small tree (an ultimate's, mobility's or a group buff's): about 5 talents and 9 ranks, for its 5 points. */
export const SMALL_RANKS = 9

/** The ranks a tree must hold: 9 for an ultimate or a group buff, 18 for the rest. */
export const ranksFor = (tree: TreeDef) => (isSmallTree(tree) ? SMALL_RANKS : TREE_RANKS)

/** A tree's ranks in all, counting each choice pair once, at the bigger of the two. */
export function treeRanks(tree: TreeDef): number {
  let total = tree.talents.reduce((sum, t) => sum + t.maxRank, 0)
  const counted = new Set<string>()
  for (const t of tree.talents) {
    const other = tree.talents.find((p) => p !== t && (p.id === t.excludes || p.excludes === t.id))
    if (!other) continue
    const pair = [t.id, other.id].sort().join('|')
    if (counted.has(pair)) continue
    counted.add(pair)
    total -= Math.min(t.maxRank, other.maxRank)
  }
  return total
}

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
        if (m.kind === 'mod' && m.when?.paidAtLeast !== undefined) problems.push(`${t.name}: only procs can count combo steps`)
      }
    }
    art(t.name, t.icon)
  }

  const total = treeRanks(tree)
  if (total !== ranksFor(tree)) problems.push(`${tree.ability.name}'s talents hold ${total} ranks in all, not ${ranksFor(tree)}`)

  // Power comes from your level and gear only; talents and buffs give their own multipliers instead.
  for (const t of tree.talents) {
    if ((t.effects?.(t.maxRank) ?? []).flatMap(givenStats).includes('power')) {
      problems.push(`${t.name} gives Power: Power only comes from your level and gear`)
    }
  }
  for (const e of tree.spec?.effects ?? []) {
    if (e.stats?.power !== undefined || e.buff?.stats?.power !== undefined) {
      problems.push(`${tree.ability.name} gives Power: Power only comes from your level and gear`)
    }
  }

  for (const t of tree.talents) {
    if (t.excludes === undefined) continue
    const other = tree.talents.find((p) => p.id === t.excludes)
    if (other === undefined) problems.push(`${t.name} is a choice with "${t.excludes}", which isn't a talent in this tree`)
    else if (other === t) problems.push(`${t.name} is a choice with itself`)
    // The pair shares one split icon, halfway between their two places.
    else if (other.row !== t.row) problems.push(`${t.name} and ${other.name} are a choice, so they must share a row`)
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

const tagsOf = (match: Match | undefined): string[] =>
  match === undefined ? [] : typeof match === 'string' ? [match] : 'all' in match ? [...match.all] : [...match]

const conditionTags = (c: Condition | undefined): string[] =>
  c ? [...tagsOf(c.targetHas), ...tagsOf(c.each), ...tagsOf(c.stacksOf)] : []

const buffTags = (b: BuffSpec | undefined): string[] =>
  b ? [...tagsOf(b.consumeOn), ...tagsOf(b.lostUnless), ...(b.mods ?? []).flatMap(aimedTags)] : []

function actionTags(a: Action): string[] {
  switch (a.do) {
    case 'extend':
    case 'cooldown':
    case 'pulse':
    case 'spread':
    case 'absorb':
      return tagsOf(a.match)
    case 'buff':
      return buffTags(a.buff)
    case 'apply':
      return [...tagsOf(a.effect.perEffect), ...buffTags(a.effect.buff)]
    case 'fire':
      return [a.ability]
    case 'oneOf':
      return a.actions.flatMap(actionTags)
    default:
      return []
  }
}

/** Every tag a mechanic aims at: what it changes, what it listens for, and what its conditions and actions look at. */
function aimedTags(m: Mechanic): string[] {
  switch (m.kind) {
    case 'mod':
      return [...tagsOf(m.match), ...conditionTags(m.when)]
    case 'grant':
      return [m.to, ...buffTags(m.effect.buff)]
    case 'proc':
      return [...tagsOf(m.proc.match), ...conditionTags(m.proc.when), ...m.proc.actions.flatMap(actionTags)]
    default:
      return []
  }
}

const withoutAbsorb = (m: Mechanic): Mechanic =>
  m.kind === 'proc' ? { ...m, proc: { ...m.proc, actions: m.proc.actions.filter((a) => a.do !== 'absorb') } } : m

/** The stats a mechanic gives, its buffs' included. */
function givenStats(m: Mechanic): CharStat[] {
  const of = (b: BuffSpec | undefined) => Object.keys(b?.stats ?? {}) as CharStat[]
  const fromAction = (a: Action): CharStat[] =>
    a.do === 'buff' ? of(a.buff) : a.do === 'apply' ? of(a.effect.buff) : a.do === 'oneOf' ? a.actions.flatMap(fromAction) : []
  if (m.kind === 'stat' || m.kind === 'group') return [m.stat]
  if (m.kind === 'grant') return of(m.effect.buff)
  if (m.kind !== 'proc') return []
  return m.proc.actions.flatMap(fromAction)
}

/** Numbers in a weapon's own resource: flat changes to them mean different things on every weapon. */
const RESOURCE_KEYS: readonly ValueKey[] = ['cost', 'restore', 'extraCost']

/** A mechanic's mods, its buffs' included. */
function modsOf(m: Mechanic): ModMechanic[] {
  if (m.kind === 'mod') return [m]
  if (m.kind !== 'proc') return []
  return m.proc.actions.flatMap((a) => (a.do === 'buff' ? (a.buff.mods ?? []) : []))
}

/** Stats in a weapon's own numbers: an imp, a combo point and a point of mana are worth very different things. */
const WEAPON_STATS: readonly CharStat[] = [
  'maxResource',
  'resourceRegen',
  'resourceWhenHit',
  'resourceOnParry',
  'spareChance',
  'overhealToResource',
  'minionPower',
  'comboBonus',
]

/**
 * Abilities go on any weapon of their role, so their talents can't lean on one: they aim at their own
 * ability or at families and tags (DoTs, area damage, direct heals), never at another ability, and give
 * resource as a share of the maximum, never as a flat amount of mana or imps. Artifact trees may.
 */
function weaponProblems(tree: TreeDef, trees: readonly TreeDef[]): string[] {
  const problems: string[] = []
  const abilities = new Map(trees.map((t) => [t.id, t.ability.name]))
  // A tree whose ability raises minions, or curses that minions set off, may talk about minions.
  const ownMinion =
    tree.spec?.minion !== undefined || (tree.spec?.effects ?? []).some((e) => e.type === 'summon' || e.type === 'curse')
  for (const t of tree.talents) {
    const mechanics = t.effects?.(t.maxRank) ?? []
    // Absorbing your minions (Doom Bolt's Soul Feast) works on any weapon: no minions, nothing absorbed.
    const minionAims = new Set(mechanics.map(withoutAbsorb).flatMap(aimedTags))
    for (const tag of new Set(mechanics.flatMap(aimedTags))) {
      const other = tag === tree.id ? undefined : abilities.get(tag)
      if (other) problems.push(`${t.name} (${tree.ability.name}) aims at ${other}: talents aim at their own ability or at families`)
      if (tree.kind !== 'artifact' && tag === 'minion' && minionAims.has('minion') && !ownMinion) {
        problems.push(`${t.name} (${tree.ability.name}) aims at minions, but not every weapon has them`)
      }
    }
    if (tree.kind === 'artifact') continue
    for (const stat of new Set(mechanics.flatMap(givenStats))) {
      if (WEAPON_STATS.includes(stat) && !(stat === 'minionPower' && ownMinion)) {
        problems.push(`${t.name} (${tree.ability.name}) gives ${stat}, which only means something on one weapon`)
      }
    }
    const flat = mechanics.some(
      (m) => m.kind === 'proc' && m.proc.actions.some((a) => a.do === 'restore' && (a.amount ?? 0) !== 0),
    )
    if (flat) problems.push(`${t.name} (${tree.ability.name}) gives back a flat amount of resource, not a share of the maximum`)
    const flatCost = mechanics.flatMap(modsOf).some((m) => RESOURCE_KEYS.includes(m.key) && (m.add ?? 0) !== 0)
    if (flatCost) problems.push(`${t.name} (${tree.ability.name}) changes a cost or a gain by a flat amount, not a %`)
    const steps = mechanics.some((m) => m.kind === 'proc' && m.proc.when?.paidAtLeast !== undefined)
    // An ability that spends all counts its own spend on any weapon, so its tree may.
    if (steps && !tree.spec?.spendsAll) {
      problems.push(`${t.name} (${tree.ability.name}) counts combo steps, which only combo weapons take`)
    }
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
    if (tree.madeFor !== undefined) {
      const maker = artifacts.find((a) => a.id === tree.madeFor)
      if (!maker) problems.push(`${tree.ability.name} is made for "${tree.madeFor}", which isn't an artifact`)
      else if (tree.role && maker.role !== tree.role) problems.push(`${tree.ability.name} is made for ${maker.name}, a ${maker.role} weapon`)
      else if (!canMake(tree, maker)) problems.push(`${tree.ability.name} is made for ${maker.name}, which can't make it`)
    }
    if (tree.needs !== undefined && !artifacts.some((a) => canMake(tree, a))) {
      problems.push(`${tree.ability.name} needs ${NEEDS_LABEL[tree.needs]}, and no artifact is one yet`)
    }
    problems.push(...weaponProblems(tree, trees))
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
    else if (fits({ ...tree, needs: undefined }, slots[i], artifact) && !canMake(tree, artifact)) {
      problems.push(`Starting slot ${i + 1} holds ${tree.ability.name}, which needs ${NEEDS_LABEL[tree.needs!]}`)
    } else if (!fits(tree, slots[i], artifact)) {
      const what = tree.role && tree.kind !== slots[i] ? tree.kind : [tree.role, tree.kind].filter(Boolean).join(' ')
      problems.push(`Starting slot ${i + 1} is a ${slots[i]} slot, but ${tree.ability.name} is ${what}`)
    }
    if (starting.slots.indexOf(id) !== i) problems.push(`"${id}" starts in more than one slot`)
  })
  return problems
}
