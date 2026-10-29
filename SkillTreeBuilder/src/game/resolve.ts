import type { Ranks } from '../talents/rules.ts'
import type { ArtifactDef, TreeDef } from '../talents/types.ts'
import { gearTotals, type Gear } from './gear.ts'
import { int, pct } from './format.ts'
import { LEVEL_GROWTH, levelPower, levelShare, MAX_LEVEL } from '../talents/levels.ts'
import { BASE_STATS, MIN_GCD } from './stats.ts'
import {
  ABILITY_KEYS,
  type CharStat,
  type CharStats,
  type EffectSpec,
  type EffectType,
  type Family,
  type Match,
  type Mechanic,
  type ModMechanic,
  type ProcSpec,
  type ResolvedAbility,
  type ResolvedEffect,
  type Tag,
  type ValueKey,
} from './types.ts'

export const FAMILY_OF: Record<EffectType, Family> = {
  heal: 'direct-heal',
  chain: 'direct-heal',
  bloom: 'direct-heal',
  hot: 'hot',
  zone: 'zone',
  shield: 'shield',
  damage: 'direct-damage',
  dot: 'dot',
  minion: 'minion',
  summon: 'minion',
  curse: 'debuff',
  restore: 'resource',
  move: 'movement',
  buff: 'buff',
  aura: 'aura',
}

const HEALING: ReadonlySet<Family> = new Set<Family>(['direct-heal', 'hot', 'zone'])
const DAMAGING: ReadonlySet<Family> = new Set<Family>(['direct-damage', 'dot', 'debuff', 'minion'])
/** Power raises every damage, heal and shield number. */
const POWERED: ReadonlySet<Family> = new Set<Family>([
  'direct-heal',
  'hot',
  'zone',
  'shield',
  'direct-damage',
  'dot',
  'debuff',
  'minion',
])
/** Potency lengthens these durations. A dash isn't made longer by it. */
const POTENT: ReadonlySet<Family> = new Set<Family>(['hot', 'dot', 'debuff', 'zone', 'shield', 'buff'])

/** The heal green from the overview's colour key. */
const DEFAULT_COLOR = '#8fe3a0'

export function matches(match: Match, tags: ReadonlySet<Tag>): boolean {
  if (typeof match === 'string') return match === '*' || tags.has(match)
  if ('all' in match) return match.all.every((t) => tags.has(t))
  return match.some((t) => t === '*' || tags.has(t))
}

/** Which talent a mechanic came from, for tooltips and the combat log. */
export interface Source {
  treeId: string
  treeName: string
  talentId: string
  talentName: string
  rank: number
}

export type Sourced<M> = M & { source: Source }

export interface ResolvedProc {
  proc: ProcSpec
  source: Source
  /** The tree the talent sits in. Effects it applies count as that ability's. */
  tree: TreeDef
}

export interface StatLine {
  base: number
  gear: number
  talents: number
  /** From your group buff (yours too, since you're in your own group). */
  group: number
  total: number
}

export interface CharacterSheet {
  stats: CharStats
  lines: Record<CharStat, StatLine>
}

export interface BuildInput {
  artifact: ArtifactDef
  /** The tree in each slot (null = empty), the artifact's own tree first. */
  trees: readonly (TreeDef | null)[]
  ranks: Readonly<Record<string, Ranks>>
  gear: Gear
  /** Every tree, for abilities a talent fires while they aren't slotted. */
  catalog: readonly TreeDef[]
  /** 1 to 60, 60 if left out: it sets your Health and part of your Power. */
  level?: number
}

export interface Kit {
  /** The artifact's resource name ("Mana", "Imps"). */
  resource: string
  role: ArtifactDef['role']
  /** Resource a fight starts with. */
  resourceStart: number
  level: number
  /** The level's share of level 60's strength: the arena scales its fights by it. */
  levelShare: number
  character: CharacterSheet
  /** What your group buff gives everyone in your group, you included. */
  groupStats: Partial<CharStats>
  /** What each of your minions does, when your resource is minions. */
  minion: ResolvedEffect | null
  /** Each slot's ability with live numbers; null when empty or the tree is display-only. */
  slots: readonly (ResolvedAbility | null)[]
  procs: readonly ResolvedProc[]
  mechanics: readonly Sourced<Mechanic>[]
  /** Any tree in the catalog with this build's talents and gear, plus `extra` mods (active buffs). */
  resolve(treeId: string, extra?: readonly ModMechanic[], stats?: CharStats): ResolvedAbility | null
  /** An effect a talent applies, counted as its tree's ability. */
  resolveEffect(tree: TreeDef, effect: EffectSpec, extra?: readonly ModMechanic[], stats?: CharStats): ResolvedEffect
}

/** Every mechanic the learned talents in the slotted trees add, tagged with where it came from. */
export function collectMechanics(trees: readonly (TreeDef | null)[], ranks: BuildInput['ranks']): Sourced<Mechanic>[] {
  const out: Sourced<Mechanic>[] = []
  for (const tree of trees) {
    if (!tree) continue
    const treeRanks = ranks[tree.id] ?? {}
    for (const talent of tree.talents) {
      const rank = treeRanks[talent.id] ?? 0
      if (rank === 0 || !talent.effects) continue
      const source = { treeId: tree.id, treeName: tree.ability.name, talentId: talent.id, talentName: talent.name, rank }
      for (const m of talent.effects(rank)) out.push({ ...m, source })
    }
  }
  return out
}

/** The group buff's stats: its aura plus its talents' group stats. You get them too. */
export function computeGroupStats(trees: readonly (TreeDef | null)[], mechanics: readonly Mechanic[]): Partial<CharStats> {
  const group: Partial<CharStats> = {}
  const add = (stat: CharStat, n: number) => (group[stat] = (group[stat] ?? 0) + n)
  for (const tree of trees) {
    for (const effect of tree?.spec?.effects ?? []) {
      if (effect.type !== 'aura') continue
      for (const [stat, n] of Object.entries(effect.stats ?? {})) add(stat as CharStat, n ?? 0)
    }
  }
  for (const m of mechanics) if (m.kind === 'group') add(m.stat, m.add)
  return group
}

export function computeCharacter(
  input: BuildInput,
  mechanics: readonly Mechanic[],
  groupStats: Partial<CharStats> = {},
): CharacterSheet {
  const gear = gearTotals(input.gear)
  const stats = { ...BASE_STATS }
  const lines = {} as Record<CharStat, StatLine>
  const level = input.level ?? MAX_LEVEL
  // Health and Power grow with level; the rest is the same at every level.
  const forLevel = (stat: CharStat) =>
    stat === 'health' ? Math.round(BASE_STATS.health * levelShare(level)) : stat === 'power' ? levelPower(level) : BASE_STATS[stat]
  for (const stat of Object.keys(BASE_STATS) as CharStat[]) {
    const base = forLevel(stat) + (input.artifact.stats?.[stat] ?? 0)
    const fromGear = gear[stat] ?? 0
    const talents = mechanics.reduce((sum, m) => (m.kind === 'stat' && m.stat === stat ? sum + m.add : sum), 0)
    const group = groupStats[stat] ?? 0
    const total = base + fromGear + talents + group
    lines[stat] = { base, gear: fromGear, talents, group, total }
    stats[stat] = total
  }
  // "% more health" multiplies the flat total; the extra shows on the Health line as group.
  if (stats.healthPct) {
    const flat = stats.health
    stats.health = Math.round(flat * (1 + stats.healthPct / 100))
    lines.health = { ...lines.health, group: lines.health.group + stats.health - flat, total: stats.health }
  }
  return { stats, lines }
}

interface Sums {
  add: number
  pct: number
}

function sum(mods: readonly ModMechanic[], key: ValueKey, tags: ReadonlySet<Tag>, stats: CharStats): Sums {
  let add = 0
  let pct = 0
  for (const m of mods) {
    if (m.key !== key || m.when || !matches(m.match, tags)) continue
    add += m.add ?? 0
    pct += (m.pct ?? 0) + (m.pctOf ? stats[m.pctOf] : 0)
  }
  return { add, pct }
}

const scaled = (base: number, s: Sums) => (base + s.add) * (1 + s.pct / 100)

/** A buff's stats with `strength` talents added to each. */
function strengthen(stats: Partial<CharStats> | undefined, s: Sums): Partial<CharStats> | undefined {
  if (!stats || (s.add === 0 && s.pct === 0)) return stats
  return Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, k === 'speed' ? v : scaled(v, s)]))
}

/** Abilities that cost resource are spells; so are their effects, for talents like Overdrive. */
const isSpell = (tree: TreeDef) => (tree.spec?.cost ?? 0) > 0

function effectTags(tree: TreeDef, effect: EffectSpec): Set<Tag> {
  const family = FAMILY_OF[effect.type]
  // A minion's attack is its own: it doesn't carry the main attack's tags.
  const abilityTags = FAMILY_OF[effect.type] === 'minion' ? [] : (tree.spec?.tags ?? [])
  const tags = new Set<Tag>([family, tree.id, tree.kind, ...abilityTags, ...(effect.tags ?? [])])
  if (effect.hostile) tags.add('damage').add('aoe')
  else if (HEALING.has(family)) tags.add('healing')
  if (DAMAGING.has(family)) tags.add('damage')
  if (effect.type === 'damage' && (effect.radius ?? 0) > 0) tags.add('aoe')
  if (isSpell(tree)) tags.add('spell')
  return tags
}

function resolveEffectWith(
  tree: TreeDef,
  effect: EffectSpec,
  index: number,
  stats: CharStats,
  mods: readonly ModMechanic[],
  granted?: string,
  groupTalents: Partial<CharStats> = {},
  unit = 1,
): ResolvedEffect {
  const family = FAMILY_OF[effect.type]
  const tags = effectTags(tree, effect)
  const get = (key: ValueKey) => sum(mods, key, tags, stats)

  // Numbers are written for level 60, whose level alone gives +200% Power: a third of it is the base.
  const power = POWERED.has(family) ? (1 + stats.power / 100) / LEVEL_GROWTH : 1
  const durationMods = effect.fixedDuration ? { add: 0, pct: 0 } : get('duration')
  const potency = POTENT.has(family) && !effect.fixedDuration ? stats.potency : 0
  const duration = Math.max(0, (effect.duration ?? 0) + durationMods.add) * (1 + (durationMods.pct + potency) / 100)
  const tickRate = get('tickRate')
  const interval =
    effect.interval !== undefined ? effect.interval / (1 + (stats.haste + tickRate.pct + tickRate.add) / 100) : 0
  const speedBase = effect.buff?.stats?.speed ?? 0

  return {
    index,
    type: effect.type,
    family,
    name: effect.name,
    color: tree.color ?? DEFAULT_COLOR,
    key: effect.key ?? `${tree.id}:${granted ?? index}`,
    tags,
    // Damage finds the enemy under your crosshair; everything else, the lowest-health ally.
    target: effect.target ?? (DAMAGING.has(family) || effect.hostile ? 'target' : 'lowest'),
    amount: Math.max(0, scaled(effect.amount ?? 0, get('amount')) * power),
    critChance: Math.min(100, stats.crit + get('critChance').add),
    critMultiplier: 1 + (stats.critDamage + get('critDamage').add) / 100,
    duration,
    interval,
    ticks: interval > 0 ? Math.floor(duration / interval + 1e-6) : 0,
    radius: Math.max(0, scaled(effect.radius ?? 0, get('radius'))),
    bounces: Math.max(0, Math.round((effect.bounces ?? 0) + get('bounces').add)),
    falloff: Math.min(100, Math.max(0, (effect.falloff ?? 0) + get('falloff').add)),
    targets: Math.max(1, Math.round((effect.targets ?? 1) + get('targets').add)),
    growth: (effect.growth ?? 0) + get('growth').add,
    instantTicks: Math.max(0, Math.round((effect.instantTicks ?? 0) + get('instantTicks').add)),
    follow: (effect.follow ?? 0) + get('follow').add > 0 ? 1 : 0,
    damageReduction: Math.min(90, (effect.damageReduction ?? 0) + get('damageReduction').add),
    restore: Math.max(0, scaled((effect.restore ?? 0) * unit, get('restore'))),
    distance: Math.max(0, scaled(effect.distance ?? 0, get('distance'))),
    returnWindow: Math.max(0, (effect.returnWindow ?? 0) + get('returnWindow').add),
    speed: Math.max(0, scaled(speedBase, get('speed'))),
    extraCost: Math.max(0, scaled((effect.extraCost ?? 0) * unit, get('extraCost'))),
    stacks: Math.max(1, Math.round((effect.stacks ?? 1) + get('stacks').add)),
    maxStacks: effect.maxStacks ? Math.max(1, Math.round(effect.maxStacks + get('maxStacks').add)) : 0,
    max: Math.max(1, Math.round((effect.max ?? 1) + get('max').add)),
    mode: effect.mode,
    // A buff's stats grow with `strength` talents (Frenzy's haste, Volley's splash); speed has its own key.
    buff: effect.buff && { ...effect.buff, stats: strengthen(effect.buff.stats, get('strength')) },
    hostile: effect.hostile,
    inflicts: effect.inflicts
      ? resolveEffectWith(tree, effect.inflicts, index, stats, mods, effect.inflicts.name ?? 'inflicts')
      : undefined,
    rolling: effect.rolling,
    addsDuration: effect.addsDuration,
    perEffect: effect.perEffect,
    grows: effect.grows,
    stats: effect.type === 'aura' ? addStats(effect.stats ?? {}, groupTalents) : effect.stats,
    taunt: effect.taunt ? Math.max(0, scaled(effect.taunt, get('taunt'))) : 0,
    splash: Math.max(0, scaled(effect.splash ?? 0, get('splash'))),
    soloSplash: Math.max(0, get('soloSplash').add + get('soloSplash').pct),
    keepChance: Math.min(100, Math.max(0, (effect.keepChance ?? 0) + get('keepChance').add)),
    auto: effect.auto,
    conditionals: mods
      .filter((m) => m.key === 'amount' && m.when !== undefined && matches(m.match, tags))
      .map((m) => ({
        pct: m.pct ?? 0,
        when: m.when!,
        source: (m as Partial<Sourced<ModMechanic>>).source?.talentName ?? 'Buff',
      })),
    granted,
  }
}

function resolveAbilityWith(
  tree: TreeDef,
  stats: CharStats,
  mods: readonly ModMechanic[],
  grants: readonly Sourced<Extract<Mechanic, { kind: 'grant' }>>[],
  weapon: ArtifactDef,
  groupTalents: Partial<CharStats> = {},
): ResolvedAbility | null {
  const spec = tree.spec
  if (!spec) return null
  const effects: { effect: EffectSpec; granted?: string }[] = [
    ...spec.effects.map((effect) => ({ effect })),
    ...grants.filter((g) => g.to === tree.id).map((g) => ({ effect: g.effect, granted: g.source.talentName })),
  ]
  const families = effects.map(({ effect }) => FAMILY_OF[effect.type])
  const tags = new Set<Tag>([tree.id, tree.kind, ...(spec.tags ?? []), ...families])
  if (effects.some(({ effect }) => HEALING.has(FAMILY_OF[effect.type]) && !effect.hostile)) tags.add('healing')
  if (effects.some(({ effect }) => DAMAGING.has(FAMILY_OF[effect.type]) || effect.hostile)) tags.add('damage')
  if (isSpell(tree)) tags.add('spell')
  const get = (key: ValueKey) => sum(mods, key, tags, stats)
  const haste = 1 + stats.haste / 100
  const baseGcd = spec.gcd ?? 1
  const moves = families.includes('movement')
  const unit = weapon.unit ?? 1

  const resolved: ResolvedAbility = {
    treeId: tree.id,
    name: tree.ability.name,
    color: tree.color ?? DEFAULT_COLOR,
    resource: weapon.resource.toLowerCase(),
    kind: tree.kind,
    tags,
    // Costs and gains are written in points; the weapon says how much of its resource a point is.
    cost: Math.max(0, scaled((spec.cost ?? 0) * unit, get('cost'))),
    cycle: spec.cycle,
    castTime: Math.max(0, scaled(spec.castTime ?? 0, get('castTime'))) / haste,
    cooldown: spec.cooldown ? Math.max(0, scaled(spec.cooldown, get('cooldown'))) : 0,
    charges: Math.max(1, Math.round((spec.charges ?? 1) + get('charges').add)),
    range: Math.max(0, scaled(spec.range ?? 0, get('range'))),
    gcd: baseGcd === 0 ? 0 : Math.max(MIN_GCD, scaled(baseGcd, get('gcd')) / haste),
    // Echo repeats casts; a second dash or teleport would read as a bug, so movement never echoes.
    echo: spec.passive || moves ? 0 : Math.max(0, stats.echo + get('echo').add),
    autocast: Math.max(0, scaled(0, get('autocast'))),
    notWhileCasting: !!spec.notWhileCasting && get('whileCasting').add <= 0,
    passive: spec.passive,
    minion: spec.minion ? resolveEffectWith(tree, spec.minion, -1, stats, mods, 'minion') : undefined,
    effects: effects.map(({ effect, granted }, i) =>
      resolveEffectWith(tree, effect, i, stats, mods, granted, groupTalents, unit),
    ),
    text: '',
  }
  if (spec.spendsAll && resolved.cost > 0) {
    const surplus = get('surplus').add
    resolved.spendsAll = { surplus, atFull: spendStrength(stats.maxResource, resolved.cost, surplus) }
  } else if (weapon.combo && resolved.cost > 0) {
    resolved.combo = {
      maxSteps: Math.max(1, Math.floor(stats.maxResource / resolved.cost + 1e-6)),
      perStep: 1 + stats.comboBonus / 100,
    }
  }
  resolved.text = spec.text(resolved) + comboText(resolved)
  return resolved
}

/**
 * How many times its base strength an ability that spends all lands at: spending twice its cost is
 * twice the strength, and `surplus` makes everything past the cost count for more.
 */
export const spendStrength = (spent: number, cost: number, surplus: number) =>
  1 + (Math.max(0, spent - cost) / cost) * (1 + surplus / 100)

/** How many times its base strength an ability lands at when it pays for `steps` steps. */
export const comboStrength = (steps: number, perStep: number) => 1 + (Math.max(1, steps) - 1) * perStep

/** On a combo weapon, every ability that costs something says how it grows. */
function comboText(a: ResolvedAbility): string {
  if (!a.combo || a.combo.maxSteps < 2) return ''
  const { maxSteps, perStep } = a.combo
  return (
    ` Spends your ${a.resource} in steps of ${int(a.cost)}, as many as you have, and grows with every step: ` +
    `${maxSteps} steps at full ${a.resource} for ${pct(comboStrength(maxSteps, perStep))}× the effect.`
  )
}

export function buildKit(input: BuildInput): Kit {
  const mechanics = collectMechanics(input.trees, input.ranks)
  const groupStats = computeGroupStats(input.trees, mechanics)
  const character = computeCharacter(input, mechanics, groupStats)
  const mods = mechanics.filter((m): m is Sourced<ModMechanic> => m.kind === 'mod')
  const grants = mechanics.filter((m): m is Sourced<Extract<Mechanic, { kind: 'grant' }>> => m.kind === 'grant')
  const treeById = new Map(input.catalog.map((t) => [t.id, t]))
  const treeOf = new Map(input.trees.filter((t): t is TreeDef => t !== null).map((t) => [t.id, t]))
  const procs: ResolvedProc[] = mechanics.flatMap((m) =>
    m.kind === 'proc' ? [{ proc: m.proc, source: m.source, tree: treeOf.get(m.source.treeId)! }] : [],
  )

  // A group buff tree's own group talents, so its card shows the total it gives.
  const groupTalents = (treeId: string) => {
    const out: Partial<CharStats> = {}
    for (const m of mechanics) if (m.kind === 'group' && m.source.treeId === treeId) out[m.stat] = (out[m.stat] ?? 0) + m.add
    return out
  }
  const resolve: Kit['resolve'] = (treeId, extra = [], stats = character.stats) => {
    const tree = treeById.get(treeId)
    if (!tree) return null
    const all = extra.length ? [...mods, ...extra] : mods
    return resolveAbilityWith(tree, stats, all, grants, input.artifact, groupTalents(treeId))
  }

  const slots = input.trees.map((tree) => (tree ? resolve(tree.id) : null))
  return {
    resource: input.artifact.resource,
    role: input.artifact.role,
    resourceStart: input.artifact.resourceStart ?? character.stats.maxResource,
    level: input.level ?? MAX_LEVEL,
    levelShare: levelShare(input.level ?? MAX_LEVEL),
    character,
    groupStats,
    minion: slots[0]?.minion ?? null,
    slots,
    procs,
    mechanics,
    resolve,
    resolveEffect: (tree, effect, extra = [], stats = character.stats) =>
      resolveEffectWith(tree, effect, -1, stats, extra.length ? [...mods, ...extra] : mods, effect.name ?? 'proc', {}, input.artifact.unit),
  }
}

function addStats(a: Partial<CharStats>, b: Partial<CharStats>): Partial<CharStats> {
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) out[k as CharStat] = (out[k as CharStat] ?? 0) + (v ?? 0)
  return out
}

/** One tick of a HoT or zone, after growth or decay: each tick is `growth`% more than the last. */
export const tickAmount = (e: Pick<ResolvedEffect, 'amount' | 'growth'>, tick: number) =>
  e.amount * Math.max(0, 1 + e.growth / 100) ** tick

/** Total healing one target gets from a HoT or zone over its whole duration. */
export function periodicTotal(e: ResolvedEffect): number {
  let total = e.instantTicks * e.amount
  for (let i = 0; i < e.ticks; i++) total += tickAmount(e, i)
  return total
}

/** Healing a chain does if every jump lands. */
export function chainTotal(e: ResolvedEffect): number {
  let total = 0
  for (let i = 0; i <= e.bounces; i++) total += e.amount * (1 - e.falloff / 100) ** i
  return total * e.targets
}

/** Average heal per hit once crits are counted. */
export const withCrits = (e: ResolvedEffect, amount = e.amount) =>
  amount * (1 + (Math.min(100, e.critChance) / 100) * (e.critMultiplier - 1))

/**
 * Which slotted abilities a talent's mechanics reach, so a tooltip can show cross-tree effects:
 * "Your HoTs heal 12% more" → Renew, Lifetide.
 */
export function reach(mechanics: readonly Mechanic[], kit: Kit): string[] {
  const names = new Set<string>()
  const abilities = kit.slots.filter((a): a is ResolvedAbility => a !== null)
  const hits = (match: Match, abilityLevel: boolean) => {
    for (const a of abilities) {
      if (abilityLevel ? matches(match, a.tags) : a.effects.some((e) => matches(match, e.tags))) names.add(a.name)
    }
  }
  const named = (id: string) => {
    const target = abilities.find((a) => a.treeId === id)
    if (target) names.add(target.name)
  }
  for (const m of mechanics) {
    if (m.kind === 'mod') hits(m.match, ABILITY_KEYS.has(m.key))
    else if (m.kind === 'stat') names.add('your character')
    else if (m.kind === 'group') names.add('your group')
    else if (m.kind === 'grant') named(m.to)
    else {
      hits(m.proc.match, m.proc.on === 'cast')
      // What the proc then does counts too: a buff's changes, a cooldown cut, an ability it fires.
      for (const action of m.proc.actions) {
        if (action.do === 'buff') for (const mod of action.buff.mods ?? []) hits(mod.match, ABILITY_KEYS.has(mod.key))
        else if (action.do === 'cooldown') hits(action.match, true)
        else if (action.do === 'fire') named(action.ability)
      }
    }
  }
  return [...names]
}
