import { GEAR_STATS, isValidPair, RARITIES, TRINKET_SLOTS, type Gear, type Trinket } from './game/gear.ts'
import type { Loadout } from './talents/loadout.ts'
import { validateCatalog } from './talents/validate.ts'
import { ARTIFACTS, STARTING_LOADOUT, TREES } from './trees/index.ts'

// The build and gear are kept in this browser between visits, so a test setup survives a reload.
// Anything that no longer matches the tree data (a renamed tree, a removed talent) is dropped.

const KEY = 'legendsmith.builder.v2'

interface Saved {
  loadout: Loadout
  gear: Gear
}

function read(): Partial<Saved> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Saved>
  } catch {
    return {}
  }
}

export function savedLoadout(): Loadout {
  const { loadout: stored } = read()
  // Builds saved before the group buff and outdoor slots had six slots: add the two empty ones.
  const loadout =
    stored && Array.isArray(stored.slots) && stored.slots.length < STARTING_LOADOUT.slots.length
      ? { ...stored, slots: [...stored.slots, ...Array(STARTING_LOADOUT.slots.length - stored.slots.length).fill(null)] }
      : stored
  if (!loadout || validateCatalog(TREES, ARTIFACTS, loadout).length > 0) return STARTING_LOADOUT
  // Keep only ranks for talents that still exist, within their max rank.
  const ranks = Object.fromEntries(
    Object.entries(loadout.ranks ?? {}).flatMap(([treeId, treeRanks]) => {
      const tree = TREES.find((t) => t.id === treeId)
      if (!tree || !loadout.slots.includes(treeId)) return []
      const kept = Object.entries(treeRanks).filter(([id, rank]) => {
        const talent = tree.talents.find((t) => t.id === id)
        return talent !== undefined && Number.isInteger(rank) && rank > 0 && rank <= talent.maxRank
      })
      return [[treeId, Object.fromEntries(kept)]]
    }),
  )
  return { ...loadout, ranks }
}

const validTrinket = (t: Trinket | undefined, slot: string): t is Trinket =>
  t !== undefined &&
  t.slot === slot &&
  RARITIES.includes(t.rarity) &&
  Number.isFinite(t.itemLevel) &&
  t.itemLevel > 0 &&
  Array.isArray(t.stats) &&
  t.stats.every((s) => GEAR_STATS.includes(s)) &&
  isValidPair(t.stats[0], t.stats[1])

export function savedGear(): Gear {
  const gear = read().gear ?? {}
  return Object.fromEntries(TRINKET_SLOTS.flatMap((s) => (validTrinket(gear[s], s) ? [[s, gear[s]]] : [])))
}

export function save(saved: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved))
  } catch {
    // Private windows and blocked storage: the page works the same, it just won't remember.
  }
}
