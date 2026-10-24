import type { CharStat, CharStats } from './types.ts'

// Trinket rules from the overview's "Trinkets and item cards":
// - item level sets Power (a %) and Health (flat), always on the item;
// - two stats, no more; Echo and Minion power are special affixes that take one of the two;
// - rarity sets the stats' values (common 1% … epic 4%);
// - the name comes from the stat pair, and you can't wear two items with the same name.

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
export const uniqueName = (t: Trinket) => PAIR_NAMES[pairKey(...t.stats)] ?? 'Oddity'

export const trinketName = (t: Trinket) => `${t.slot} of ${uniqueName(t)}`

/** Power % from item level, as on the overview's item cards. */
export const trinketPower = (t: Trinket) => Math.round(t.itemLevel * 0.105 * 10) / 10

export const trinketHealth = (t: Trinket) => Math.round(t.itemLevel * 9.5)

/** Each of the two stats gets the rarity's value. */
export const trinketStatValue = (t: Trinket) => RARITY_INFO[t.rarity].value

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
    for (const stat of t.stats) add(stat, trinketStatValue(t))
  }
  return totals
}

// ---------- Presets for testing ----------

type PairList = readonly (readonly [GearStat, GearStat])[]

const fill = (rarity: Rarity, itemLevel: number, pairs: PairList): Gear =>
  Object.fromEntries(
    TRINKET_SLOTS.map((slot, i) => [slot, { slot, rarity, itemLevel, stats: pairs[i] } satisfies Trinket]),
  )

// The unique-name rule means 12 slots need 12 different pairs out of 14, so every full set
// carries at least two Minion power or other off-role pairs.
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

export interface GearPreset {
  id: string
  name: string
  gear: Gear
}

export const GEAR_PRESETS: readonly GearPreset[] = [
  { id: 'none', name: 'Nothing equipped', gear: {} },
  { id: 'common-crit', name: 'Critical and Haste · common, item level 60', gear: fill('common', 60, COMMON_CRIT_HASTE) },
  {
    id: 'common-potency',
    name: 'Potency and Haste · common, item level 60',
    gear: fill('common', 60, COMMON_POTENCY_HASTE),
  },
  { id: 'overview', name: "The overview's example set", gear: OVERVIEW },
  { id: 'rare-100', name: 'Haste and Potency · rare, item level 100', gear: fill('rare', 100, HASTE_POTENCY) },
  { id: 'epic-hp', name: 'Haste and Potency · epic, item level 120', gear: fill('epic', 120, HASTE_POTENCY) },
  { id: 'epic-crit', name: 'Critical · epic, item level 120', gear: fill('epic', 120, CRIT) },
]
