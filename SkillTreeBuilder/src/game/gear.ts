import { STAT_INFO } from './stats.ts'
import type { CharStat, CharStats } from './types.ts'

// Trinket rules from the overview's "Trinkets and item cards", with names as in WoW:
// - item level sets Power (a %) and Health (flat), always on the item;
// - two stats, no more; Echo and Minion power are special affixes that take one of the two;
// - rarity sets the stats' value (common 1% … epic 4%), and the item splits twice that between its two
//   stats, anywhere from 150% / 50% to 50% / 150% of it (100% / 100% is even);
// - every item has a name, and the name is all that's unique: you can't wear two items with the same
//   name, and nothing else limits a stat pair. Twelve Haste and Critical items, one in each slot, each
//   with its own balance, can all be worn. An item you don't name is named from its slot and stats
//   ("Quick Ring of Peerlessness"), so those never clash.

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

export interface Trinket {
  slot: TrinketSlot
  rarity: Rarity
  itemLevel: number
  stats: readonly [GearStat, GearStat]
  /** % of the rarity's value the first stat gets, 50 to 150; the second gets the rest of 200%. Absent: 100, even. */
  split?: number
  /** The item's own name, what the unique rule checks. Absent: named from its slot, stats and balance. */
  name?: string
}

/** How far an item can lean: 150% of the rarity's value on one stat and 50% on the other, at most. */
export const SPLIT_MIN = 50
export const SPLIT_MAX = 150
/** The forge's steps between them. */
export const SPLIT_STEP = 5

/** The first stat's share, within the limits: 100 for an even item. */
export const splitOf = (t: Trinket) => Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, t.split ?? 100))

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

/** "Peerlessness": one name per stat pair. */
const pairName = (t: Trinket) => PAIR_NAMES[pairKey(...t.stats)] ?? 'Oddity'

/** "Quick " on an item that leans toward Haste, nothing on an even one. */
const leanWord = (t: Trinket) => {
  const split = splitOf(t)
  return split === 100 ? '' : `${LEAN_WORD[t.stats[split > 100 ? 0 : 1]]} `
}

/** The name it was given, or one from its slot, stats and balance: "Quick Ring of Peerlessness". */
export const defaultName = (t: Trinket) => `${leanWord(t)}${t.slot} of ${pairName(t)}`

/** Its name, the one thing the unique rule checks. */
export const trinketName = (t: Trinket) => t.name?.trim() || defaultName(t)

const sameName = (a: Trinket, b: Trinket) => trinketName(a).toLowerCase() === trinketName(b).toLowerCase()

/**
 * Power % from item level: the overview's item cards' 0.105 per item level, times three, since a level
 * 60 hero's own +200% Power makes each point of it count a third as much.
 */
export const trinketPower = (t: Trinket) => Math.round(t.itemLevel * 0.315 * 10) / 10

export const trinketHealth = (t: Trinket) => Math.round(t.itemLevel * 9.5)

/**
 * How much of a stat an item carries for the rarity's value. Minion power counts once for every minion
 * you command, so an item has a tenth of it: an epic one 0.4%, not 4%.
 */
const STAT_WEIGHT: Partial<Record<GearStat, number>> = { minionPower: 0.1 }

/** The two stats' values: twice the rarity's value, split between them (the rarity's value each when even). */
export function trinketStatValues(t: Trinket): [number, number] {
  const value = RARITY_INFO[t.rarity].value
  const split = splitOf(t)
  const weight = (i: 0 | 1) => STAT_WEIGHT[t.stats[i]] ?? 1
  return [(value * split * weight(0)) / 100, (value * (200 - split) * weight(1)) / 100]
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
  const clash = TRINKET_SLOTS.find((s) => s !== trinket.slot && next[s] && sameName(next[s], trinket))
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
  // To the hundredth: Minion power comes in small steps (0.15% on an uncommon item leaning away from it).
  const add = (stat: CharStat, n: number) => (totals[stat] = Math.round(((totals[stat] ?? 0) + n) * 100) / 100)
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

/** The same pair in all 12 slots, split evenly: names come from the slot, so they never clash. */
const twelve = (pair: readonly [GearStat, GearStat]): PairList => TRINKET_SLOTS.map(() => pair)

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
 * Twelve epic items that all lean as far as they can toward one stat (150%: 6% each), going round
 * its pairs (5, or 4 for Echo and Minion power) for the second stat.
 */
function mainStatSet(stat: GearStat): Gear {
  const withIt = ALL_PAIRS.filter((p) => p.includes(stat))
  return Object.fromEntries(
    TRINKET_SLOTS.map((slot, i) => {
      const stats = withIt[i % withIt.length]
      const split = stats[0] === stat ? SPLIT_MAX : SPLIT_MIN
      return [slot, { slot, rarity: 'epic', itemLevel: 120, stats, split } satisfies Trinket]
    }),
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

const MAIN = 'Main stat · epic, item level 120, every item 150% toward it'
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
    gear: fill('common', 60, twelve(['haste', 'crit'])),
  },
  {
    id: 'common-potency',
    name: 'Potency and Haste · common, item level 60',
    group: EVEN,
    gear: fill('common', 60, twelve(['haste', 'potency'])),
  },
  { id: 'rare-100', name: 'Haste and Potency · rare, item level 100', group: EVEN, gear: fill('rare', 100, twelve(['haste', 'potency'])) },
  { id: 'epic-hp', name: 'Haste and Potency · epic, item level 120', group: EVEN, gear: fill('epic', 120, twelve(['haste', 'potency'])) },
  { id: 'epic-crit', name: 'Critical and Crit damage · epic, item level 120', group: EVEN, gear: fill('epic', 120, twelve(['crit', 'critDamage'])) },
  { id: 'overview', name: "The overview's example set", group: EVEN, gear: OVERVIEW },
]
