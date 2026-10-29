import { STAT_INFO } from './stats.ts'
import type { CharStat, CharStats } from './types.ts'

// Trinket rules from the overview's "Trinkets and item cards":
// - item level sets Power (a %) and Health (flat), always on the item;
// - two stats, no more; Echo and Minion power are special affixes that take one of the two;
// - rarity sets the stats' values (common 1% … epic 4%); an item can split them evenly (100% of the
//   value each) or lean toward one stat (150% of it, 50% of the other);
// - the name comes from the stat pair, and you can't wear two items with the same name. A leaning
//   item's name starts with its stat's word ("Quick Ring of Peerlessness"), and each balance is its
//   own item: a Quick, an even and a Keen Peerlessness can all be worn together, two Quick ones can't.

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic'

export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic']

export const RARITY_INFO: Record<Rarity, { label: string; color: string; value: number }> = {
  common: { label: 'Common', color: '#d9e2e4', value: 1 },
  uncommon: { label: 'Uncommon', color: '#39ff8a', value: 2 },
  rare: { label: 'Rare', color: '#1fc8ff', value: 3 },
  epic: { label: 'Epic', color: '#d24bff', value: 4 },
}

export type GearStat = 'haste' | 'crit' | 'critDamage' | 'potency' | 'echo' | 'minionPower'

export const GEAR_STATS: readonly GearStat[] = ['haste', 'crit', 'critDamage', 'potency', 'echo', 'minionPower']

/** Special affixes: one per item at most (only legendaries, later, may break that). */
export const SPECIAL_STATS: ReadonlySet<GearStat> = new Set<GearStat>(['echo', 'minionPower'])

/** The 12 trinket slots. The overview hasn't fixed their names yet; these are its example item types. */
export const TRINKET_SLOTS = [
  'Ring',
  'Necklace',
  'Bracelet',
  'Charm',
  'Locket',
  'Idol',
  'Band',
  'Sigil',
  'Totem',
  'Pendant',
  'Talisman',
  'Token',
] as const

export type TrinketSlot = (typeof TRINKET_SLOTS)[number]

/** Which of its two stats an item leans toward: index 0 or 1. Leave it out for an even split. */
export type Lean = 0 | 1

export interface Trinket {
  slot: TrinketSlot
  rarity: Rarity
  itemLevel: number
  stats: readonly [GearStat, GearStat]
  /** The stat that gets 150% of the rarity's value; the other gets 50%. Absent: 100% each. */
  lean?: Lean
}

/** Share of the rarity's value each stat gets: even, or leaning toward one. */
export const LEAN_SHARE = { even: 1, heavy: 1.5, light: 0.5 } as const

/** The word a leaning item's name starts with, from the stat it leans toward. */
const LEAN_WORD: Record<GearStat, string> = {
  haste: 'Quick',
  crit: 'Keen',
  critDamage: 'Brutal',
  potency: 'Enduring',
  echo: 'Echoing',
  minionPower: 'Lordly',
}

/** Equipped trinkets by slot. */
export type Gear = Partial<Record<TrinketSlot, Trinket>>

const pairKey = (a: GearStat, b: GearStat) => [a, b].sort().join('+')

/**
 * One name per stat pair, so "Ring of Peerlessness" and "Necklace of Peerlessness" both roll
 * Haste and Critical. Names from the overview where it had them.
 */
const PAIR_NAMES: Record<string, string> = {
  [pairKey('haste', 'crit')]: 'Peerlessness',
  [pairKey('haste', 'critDamage')]: 'Fury',
  [pairKey('haste', 'potency')]: 'Swiftness',
  [pairKey('crit', 'critDamage')]: 'Ruin',
  [pairKey('crit', 'potency')]: 'Precision',
  [pairKey('critDamage', 'potency')]: 'Malice',
  [pairKey('haste', 'echo')]: 'Reverberation',
  [pairKey('crit', 'echo')]: 'Resonance',
  [pairKey('critDamage', 'echo')]: 'Thunder',
  [pairKey('potency', 'echo')]: 'Persistence',
  [pairKey('haste', 'minionPower')]: 'Legion',
  [pairKey('crit', 'minionPower')]: 'Packmaster',
  [pairKey('critDamage', 'minionPower')]: 'Savagery',
  [pairKey('potency', 'minionPower')]: 'Command',
}

export function isValidPair(a: GearStat, b: GearStat): boolean {
  return a !== b && !(SPECIAL_STATS.has(a) && SPECIAL_STATS.has(b))
}

/** "Peerlessness" — the part of the name the unique rule checks. */
const pairName = (t: Trinket) => PAIR_NAMES[pairKey(...t.stats)] ?? 'Oddity'

/** "Quick " on a Haste-leaning item, nothing on an even one. */
const leanWord = (t: Trinket) => (t.lean === undefined ? '' : `${LEAN_WORD[t.stats[t.lean]]} `)

/** "Peerlessness", "Quick Peerlessness": what the unique rule checks. Each balance of a pair is its own item. */
export const uniqueName = (t: Trinket) => `${leanWord(t)}${pairName(t)}`

export const trinketName = (t: Trinket) => `${leanWord(t)}${t.slot} of ${pairName(t)}`

/**
 * Power % from item level: the overview's item cards' 0.105 per item level, times three, since a level
 * 60 hero's own +200% Power makes each point of it count a third as much.
 */
export const trinketPower = (t: Trinket) => Math.round(t.itemLevel * 0.315 * 10) / 10

export const trinketHealth = (t: Trinket) => Math.round(t.itemLevel * 9.5)

/** The two stats' values: the rarity's value each, or 150% and 50% of it on a leaning item. */
export function trinketStatValues(t: Trinket): [number, number] {
  const value = RARITY_INFO[t.rarity].value
  const share = (i: Lean) => (t.lean === undefined ? LEAN_SHARE.even : t.lean === i ? LEAN_SHARE.heavy : LEAN_SHARE.light)
  return [value * share(0), value * share(1)]
}

/** Separate from item level: past level 60 the item level keeps climbing and this stays at 60. */
export const requiredLevel = (itemLevel: number) =>
  Math.min(60, itemLevel <= 50 ? itemLevel : Math.round(50 + (itemLevel - 50) / 6))

/**
 * Wears `trinket` in its slot. A worn item with the same name in another slot comes off, since a
 * new one replaces the one you wear. Returns the new gear and the slot that was cleared, if any.
 */
export function equip(gear: Gear, trinket: Trinket): { gear: Gear; cleared?: TrinketSlot } {
  const next: Gear = { ...gear, [trinket.slot]: trinket }
  const name = uniqueName(trinket)
  const clash = TRINKET_SLOTS.find((s) => s !== trinket.slot && next[s] && uniqueName(next[s]) === name)
  if (clash) delete next[clash]
  return { gear: next, cleared: clash }
}

export function unequip(gear: Gear, slot: TrinketSlot): Gear {
  const next = { ...gear }
  delete next[slot]
  return next
}

/** What the worn trinkets add to the character. */
export function gearTotals(gear: Gear): Partial<CharStats> {
  const totals: Partial<Record<CharStat, number>> = {}
  const add = (stat: CharStat, n: number) => (totals[stat] = Math.round(((totals[stat] ?? 0) + n) * 10) / 10)
  for (const slot of TRINKET_SLOTS) {
    const t = gear[slot]
    if (!t) continue
    add('power', trinketPower(t))
    add('health', trinketHealth(t))
    const values = trinketStatValues(t)
    t.stats.forEach((stat, i) => add(stat, values[i]))
  }
  return totals
}

// ---------- Presets for testing ----------

type PairList = readonly (readonly [GearStat, GearStat])[]

const fill = (rarity: Rarity, itemLevel: number, pairs: PairList): Gear =>
  Object.fromEntries(
    TRINKET_SLOTS.map((slot, i) => [slot, { slot, rarity, itemLevel, stats: pairs[i] } satisfies Trinket]),
  )

// Even sets: the unique-name rule lets each even pair be worn once, so 12 slots need 12 different
// pairs out of 14 and every full even set carries at least two Minion power or other off-role pairs.
const HASTE_POTENCY: PairList = [
  ['haste', 'potency'],
  ['haste', 'crit'],
  ['potency', 'echo'],
  ['haste', 'echo'],
  ['crit', 'potency'],
  ['haste', 'critDamage'],
  ['critDamage', 'potency'],
  ['crit', 'echo'],
  ['potency', 'minionPower'],
  ['haste', 'minionPower'],
  ['crit', 'critDamage'],
  ['critDamage', 'echo'],
]

// Every pair with Critical or Haste, then the three that give the least of anything else.
const COMMON_CRIT_HASTE: PairList = [
  ['haste', 'crit'],
  ['haste', 'critDamage'],
  ['haste', 'potency'],
  ['haste', 'echo'],
  ['haste', 'minionPower'],
  ['crit', 'critDamage'],
  ['crit', 'potency'],
  ['crit', 'echo'],
  ['crit', 'minionPower'],
  ['critDamage', 'potency'],
  ['critDamage', 'echo'],
  ['potency', 'echo'],
]

// Every pair with Potency or Haste, then the three that give the least of anything else.
const COMMON_POTENCY_HASTE: PairList = [
  ['haste', 'potency'],
  ['haste', 'crit'],
  ['haste', 'critDamage'],
  ['haste', 'echo'],
  ['haste', 'minionPower'],
  ['crit', 'potency'],
  ['critDamage', 'potency'],
  ['potency', 'echo'],
  ['potency', 'minionPower'],
  ['crit', 'critDamage'],
  ['crit', 'echo'],
  ['critDamage', 'echo'],
]

const CRIT: PairList = [
  ['crit', 'critDamage'],
  ['haste', 'crit'],
  ['crit', 'potency'],
  ['crit', 'echo'],
  ['critDamage', 'echo'],
  ['haste', 'critDamage'],
  ['critDamage', 'potency'],
  ['crit', 'minionPower'],
  ['critDamage', 'minionPower'],
  ['haste', 'potency'],
  ['haste', 'echo'],
  ['potency', 'echo'],
]

/** The overview's 12 example trinkets. Its Totem of Persistence rolled Haste and Potency, the same pair as
 * the Necklace of Swiftness; here Persistence is Potency and Echo so the two can be worn together. */
const OVERVIEW: Gear = Object.fromEntries(
  (
    [
      ['Ring', 'epic', 118, ['haste', 'crit']],
      ['Necklace', 'epic', 116, ['haste', 'potency']],
      ['Bracelet', 'rare', 108, ['crit', 'critDamage']],
      ['Charm', 'uncommon', 96, ['critDamage', 'potency']],
      ['Locket', 'uncommon', 92, ['crit', 'potency']],
      ['Idol', 'common', 50, ['haste', 'critDamage']],
      ['Band', 'epic', 120, ['potency', 'minionPower']],
      ['Sigil', 'rare', 106, ['crit', 'echo']],
      ['Totem', 'uncommon', 90, ['potency', 'echo']],
      ['Pendant', 'common', 46, ['critDamage', 'echo']],
      ['Talisman', 'rare', 104, ['haste', 'minionPower']],
      ['Token', 'uncommon', 88, ['crit', 'minionPower']],
    ] as const
  ).map(([slot, rarity, itemLevel, stats]) => [slot, { slot, rarity, itemLevel, stats }]),
)

/** Every pair a trinket can roll, in stat order: 14 of them (two special affixes never share an item). */
const ALL_PAIRS: PairList = GEAR_STATS.flatMap((a, i) =>
  GEAR_STATS.slice(i + 1)
    .filter((b) => isValidPair(a, b))
    .map((b) => [a, b] as const),
)

/**
 * Twelve epic items that all carry one stat. Each balance is its own item, so every pair with the
 * stat (5, or 4 for Echo and Minion power) can be worn three times: the set takes them all leaning
 * toward the stat, then all even, then leaning the other way until the 12 slots are full.
 */
function mainStatSet(stat: GearStat): Gear {
  const withIt = ALL_PAIRS.filter((p) => p.includes(stat))
  const toward = (p: readonly [GearStat, GearStat]) => p.indexOf(stat) as Lean
  const items: Omit<Trinket, 'slot' | 'rarity' | 'itemLevel'>[] = [
    ...withIt.map((stats) => ({ stats, lean: toward(stats) })),
    ...withIt.map((stats) => ({ stats })),
    ...withIt.map((stats) => ({ stats, lean: (1 - toward(stats)) as Lean })),
  ]
  return Object.fromEntries(
    TRINKET_SLOTS.map((slot, i) => [slot, { slot, rarity: 'epic', itemLevel: 120, ...items[i] } satisfies Trinket]),
  )
}

// Every stat split evenly: the six ordinary pairs, then three items each of Echo and Minion power,
// so Haste and Potency sit on five items and Critical and Crit damage on four.
const EVEN_MIX: PairList = [
  ['haste', 'crit'],
  ['haste', 'critDamage'],
  ['haste', 'potency'],
  ['crit', 'critDamage'],
  ['crit', 'potency'],
  ['critDamage', 'potency'],
  ['haste', 'echo'],
  ['crit', 'echo'],
  ['potency', 'echo'],
  ['haste', 'minionPower'],
  ['critDamage', 'minionPower'],
  ['potency', 'minionPower'],
]

export interface GearPreset {
  id: string
  name: string
  /** Presets with the same group sit together in the picker. */
  group?: string
  gear: Gear
}

const MAIN = 'Main stat · epic, item level 120: leaning, even and the other way'
const EVEN = 'Even split · 100% / 100%'

export const GEAR_PRESETS: readonly GearPreset[] = [
  { id: 'none', name: 'Nothing equipped', gear: {} },
  ...GEAR_STATS.map((stat) => ({
    id: `main-${stat}`,
    name: `${STAT_INFO[stat].label} main`,
    group: MAIN,
    gear: mainStatSet(stat),
  })),
  { id: 'even-mix', name: 'Even mix · epic, item level 120', group: EVEN, gear: fill('epic', 120, EVEN_MIX) },
  {
    id: 'common-crit',
    name: 'Critical and Haste · common, item level 60',
    group: EVEN,
    gear: fill('common', 60, COMMON_CRIT_HASTE),
  },
  {
    id: 'common-potency',
    name: 'Potency and Haste · common, item level 60',
    group: EVEN,
    gear: fill('common', 60, COMMON_POTENCY_HASTE),
  },
  { id: 'rare-100', name: 'Haste and Potency · rare, item level 100', group: EVEN, gear: fill('rare', 100, HASTE_POTENCY) },
  { id: 'epic-hp', name: 'Haste and Potency · epic, item level 120', group: EVEN, gear: fill('epic', 120, HASTE_POTENCY) },
  { id: 'epic-crit', name: 'Critical · epic, item level 120', group: EVEN, gear: fill('epic', 120, CRIT) },
  { id: 'overview', name: "The overview's example set", group: EVEN, gear: OVERVIEW },
]
