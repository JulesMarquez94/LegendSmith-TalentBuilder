import { GEAR_STATS, isValidPair, RARITIES, SPLIT_MAX, SPLIT_MIN, TRINKET_SLOTS, type Gear, type Trinket } from './game/gear.ts'
import { MAX_LEVEL } from './talents/levels.ts'
import { capFor, setLevel, totalSpent, type Loadout } from './talents/loadout.ts'
import { isPrerequisiteMet, isRivalTaken, isRowUnlocked } from './talents/rules.ts'
import { setArtifact } from './talents/slots.ts'
import { validateCatalog } from './talents/validate.ts'
import { buildFromHash, type Build } from './share.ts'
import { ARTIFACTS, POINT_RULES, STARTING_LOADOUT, TREES } from './trees/index.ts'

// The build and gear are kept in this browser between visits, so a test setup survives a reload.
// A shared link's build (in the address, see share.ts) comes first. Either way, anything that no
// longer matches the tree data (a renamed tree, a removed talent) is dropped.

const KEY = 'legendsmith.builder.v2'

function read(): Partial<Build> {
  const shared = typeof location === 'undefined' ? null : buildFromHash(location.hash)
  if (shared) return shared
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Build>
  } catch {
    return {}
  }
}

export function savedLoadout(): Loadout {
  const { loadout: stored } = read()
  // Builds saved before the group buff and character slots had six slots: add the two empty ones.
  const padded =
    stored && Array.isArray(stored.slots) && stored.slots.length < STARTING_LOADOUT.slots.length
      ? { ...stored, slots: [...stored.slots, ...Array(STARTING_LOADOUT.slots.length - stored.slots.length).fill(null)] }
      : stored
  if (!padded || !Array.isArray(padded.slots)) return STARTING_LOADOUT
  // Builds saved with the ultimate in slot 5 and mobility in slot 6: the two traded places.
  const kindAt = (i: number) => TREES.find((t) => t.id === padded.slots[i])?.kind
  const ordered =
    kindAt(4) === 'cooldown' || kindAt(5) === 'mobility'
      ? { ...padded, slots: padded.slots.map((id, i) => (i === 4 ? padded.slots[5] : i === 5 ? padded.slots[4] : id)) }
      : padded
  // An ability the weapon can no longer slot (a strike it can't make) comes out; the rest of the build stays.
  const held = ARTIFACTS.find((a) => a.id === ordered.artifact)
  const loadout =
    held && ordered.slots[0] === (held.tree?.id ?? null)
      ? { ...ordered, slots: setArtifact({ ...ordered, ranks: ordered.ranks ?? {} }, held, TREES).slots }
      : ordered
  if (validateCatalog(TREES, ARTIFACTS, loadout).length > 0) return STARTING_LOADOUT
  // Keep only ranks for talents that still exist, within their max rank.
  const ranks = Object.fromEntries(
    Object.entries(loadout.ranks ?? {}).flatMap(([treeId, treeRanks]) => {
      const tree = TREES.find((t) => t.id === treeId)
      if (!tree || !loadout.slots.includes(treeId)) return []
      const kept = Object.entries(treeRanks).filter(([id, rank]) => {
        const talent = tree.talents.find((t) => t.id === id)
        return talent !== undefined && Number.isInteger(rank) && rank > 0 && rank <= talent.maxRank
      })
      // A tree whose points no longer fit its cap (an ultimate's went down to 6), or that holds a talent
      // it can no longer reach (moved below another, or behind a new arrow), starts over.
      const spent = kept.reduce((sum, [, rank]) => sum + rank, 0)
      const learned = Object.fromEntries(kept)
      const reachable = tree.talents.every(
        (t) =>
          !learned[t.id] ||
          (isRowUnlocked(tree, learned, t.row) && isPrerequisiteMet(tree, learned, t) && !isRivalTaken(tree, learned, t)),
      )
      return [[treeId, spent > capFor(tree, POINT_RULES) || !reachable ? {} : learned]]
    }),
  )
  // Talents needing more points than level 60 gives (60 before levels opened the slots, 52 now) start over.
  const fitted = { ...loadout, ranks: totalSpent({ ...loadout, ranks }) > POINT_RULES.total ? {} : ranks }
  // Builds saved before levels were at level 60. Either way, never below what the build needs.
  return setLevel(fitted, Number.isFinite(loadout.level) ? loadout.level : MAX_LEVEL)
}

/** Items saved before balances were a slider leaned with `lean`: 0 toward the first stat, 1 the second. */
type Stored = Trinket & { lean?: 0 | 1 }

function validTrinket(stored: Stored | undefined, slot: string): Trinket | null {
  if (!stored || stored.slot !== slot || !RARITIES.includes(stored.rarity)) return null
  if (!Number.isFinite(stored.itemLevel) || stored.itemLevel <= 0) return null
  if (!Array.isArray(stored.stats) || !stored.stats.every((s) => GEAR_STATS.includes(s))) return null
  if (!isValidPair(stored.stats[0], stored.stats[1])) return null
  const { lean, ...t } = stored
  const split = t.split ?? (lean === 0 ? SPLIT_MAX : lean === 1 ? SPLIT_MIN : undefined)
  const item: Trinket = { ...t }
  delete item.split
  if (split !== undefined && Number.isFinite(split) && split !== 100) item.split = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, split))
  if (typeof t.name !== 'string' || !t.name.trim()) delete item.name
  else item.name = t.name.slice(0, 60)
  return item
}

export function savedGear(): Gear {
  const gear = (read().gear ?? {}) as Partial<Record<string, Stored>>
  return Object.fromEntries(
    TRINKET_SLOTS.flatMap((s) => {
      const t = validTrinket(gear[s], s)
      return t ? [[s, t]] : []
    }),
  )
}

export function save(saved: Build) {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved))
  } catch {
    // Private windows and blocked storage: the page works the same, it just won't remember.
  }
}
