// The world behind the HUD prototype: made-up zones with their objectives, the enemies around you, the
// group, the boss fight and the bag. The rules that the Unity game has (which enemies get a nameplate,
// a boss's phase) work as they do there; the rest is sample data, with no server behind it.

import { RARITY_INFO, TRINKET_SLOTS, trinketName, type Rarity, type Trinket } from '../../../game/gear.ts'
import { BAG_SIZE, BOSSES, ENEMY_KINDS, otherSeats, phaseAt, type BossPhase, type PartySeat, type UnityBoss } from './unity.ts'

// ---------- Space: metres, x east and y north; a heading is radians clockwise from north ----------

export interface Vec {
  x: number
  y: number
}

/** Where a point is from you: ahead (forward) and to your right, in metres. */
export function relative(point: Vec, from: Vec, heading: number): { forward: number; right: number; distance: number } {
  const dx = point.x - from.x
  const dy = point.y - from.y
  const s = Math.sin(heading)
  const c = Math.cos(heading)
  return { forward: dx * s + dy * c, right: dx * c - dy * s, distance: Math.hypot(dx, dy) }
}

/**
 * A point on the minimap, from its centre: −1 to 1 is the view radius, y down. North up, or turned so
 * what's ahead of you is up.
 */
export function mapPoint(point: Vec, from: Vec, heading: number, radius: number, turn: boolean): Vec {
  if (turn) {
    const r = relative(point, from, heading)
    return { x: r.right / radius, y: -r.forward / radius }
  }
  return { x: (point.x - from.x) / radius, y: -(point.y - from.y) / radius }
}

/** Where north is on the minimap's rim, as a unit vector from its centre (straight up when north stays up). */
export const northOnMap = (heading: number, turn: boolean): Vec => (turn ? { x: -Math.sin(heading), y: -Math.cos(heading) } : { x: 0, y: -1 })

/** One step of walking: W and S along your heading, A and D turn you. Jog speed 5 m/s (DEF_PlayerMovement). */
export function walk(at: Vec, heading: number, input: { forward: number; turn: number }, dt: number, speed = 5, turnRate = Math.PI * 0.75) {
  const h = heading + input.turn * turnRate * dt
  return {
    heading: ((h % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI),
    at: { x: at.x + Math.sin(h) * input.forward * speed * dt, y: at.y + Math.cos(h) * input.forward * speed * dt },
  }
}

/** A point in the world on the screen behind your back (0–1 across and down), and how big it draws; null behind the camera. */
export function project(point: Vec, from: Vec, heading: number): { x: number; y: number; scale: number } | null {
  const r = relative(point, from, heading)
  // The camera sits 6 m behind you.
  const depth = r.forward + 6
  if (depth < 2) return null
  return { x: 0.5 + (r.right / depth) * 0.85, y: 0.4 + 1.8 / depth, scale: Math.min(2, 9 / depth) }
}

// ---------- Nameplates, as the game picks them (Combat/Rules/NameplateRules.cs) ----------

export interface PlateCandidate {
  id: number
  distance: number
  alive: boolean
  boss: boolean
  enemy: boolean
  health: number
  maxHealth: number
  targeted: boolean
}

export interface PlateSettings {
  showDistance: number
  targetedShowDistance: number
  maxPlates: number
  showAtFullHealth: boolean
}

/** How far a plate shows: further for the enemy you target. */
export const showRange = (c: PlateCandidate, s: PlateSettings) =>
  c.targeted && s.targetedShowDistance > s.showDistance ? s.targetedShowDistance : s.showDistance

/** Living enemies, never a boss (the boss frame has it), within range; at full health only if the setting says so. */
export function shouldShowPlate(c: PlateCandidate, s: PlateSettings): boolean {
  if (!c.alive || c.boss || !c.enemy) return false
  if (!(c.distance <= showRange(c, s))) return false
  return s.showAtFullHealth || (c.maxHealth > 0 && c.health / c.maxHealth < 1)
}

/** The plates to draw: the target first, then the nearest, ties to the lower id, at most `maxPlates`. */
export function selectPlates(candidates: readonly PlateCandidate[], s: PlateSettings): PlateCandidate[] {
  if (s.maxPlates < 1) return []
  const before = (a: PlateCandidate, b: PlateCandidate) =>
    a.targeted !== b.targeted ? (a.targeted ? -1 : 1) : a.distance - b.distance || a.id - b.id
  return candidates.filter((c) => shouldShowPlate(c, s)).sort(before).slice(0, Math.floor(s.maxPlates))
}

// ---------- Enemies and the group ----------

export interface Enemy {
  id: number
  name: string
  level: number
  at: Vec
  health: number
  maxHealth: number
  boss?: boolean
  /** Its wind-up, while it casts: 0–1. */
  casting?: { name: string; progress: number }
}

/** The scene the prototype shows: out in a zone, or in the mine's boss fight. */
export type Situation = 'explore' | 'boss'

export const SITUATIONS: readonly (readonly [Situation, string])[] = [
  ['explore', 'Out in the zone'],
  ['boss', 'Boss fight'],
]

/** The dungeon of the game's two bosses (the name is made up: the game hasn't named it). */
export const DUNGEON = 'The Gravehand Mine'

/** Enemies around where you start: a pack ahead, a few further off (some past the 30 m plates show at). */
export function sampleEnemies(level: number, situation: Situation): Enemy[] {
  const hp = (n: number) => Math.round(n * (0.4 + level / 60))
  if (situation === 'boss') {
    const boss = BOSSES[1]
    return [
      { id: 1, name: boss.name, level: level + 2, at: { x: 0, y: 14 }, health: hp(90000), maxHealth: hp(90000), boss: true },
      { id: 2, name: boss.adds, level, at: { x: -6, y: 11 }, health: hp(3200), maxHealth: hp(4000) },
      { id: 3, name: boss.adds, level, at: { x: 7, y: 12 }, health: hp(4000), maxHealth: hp(4000) },
    ]
  }
  const [grunt, brute, caster, feral, gobold] = ENEMY_KINDS
  return [
    { id: 1, name: grunt, level, at: { x: -3, y: 12 }, health: hp(2600), maxHealth: hp(3000) },
    { id: 2, name: grunt, level, at: { x: 4, y: 14 }, health: hp(3000), maxHealth: hp(3000) },
    { id: 3, name: brute, level: level + 1, at: { x: 0.5, y: 18 }, health: hp(6000), maxHealth: hp(6000) },
    { id: 4, name: caster, level, at: { x: 9, y: 22 }, health: hp(1400), maxHealth: hp(2000) },
    { id: 5, name: feral, level, at: { x: -16, y: 26 }, health: hp(3500), maxHealth: hp(3500) },
    { id: 6, name: gobold, level: Math.max(1, level - 1), at: { x: 20, y: 38 }, health: hp(1800), maxHealth: hp(1800) },
    { id: 7, name: gobold, level: Math.max(1, level - 1), at: { x: 23, y: 41 }, health: hp(1800), maxHealth: hp(1800) },
  ]
}

/** The enemy your abilities would hit: alive, ahead of you within 40 m, nearest the crosshair. */
export function pickTarget(enemies: readonly Enemy[], from: Vec, heading: number, reach = 40): Enemy | null {
  let best: Enemy | null = null
  let bestScore = Infinity
  for (const e of enemies) {
    if (e.health <= 0) continue
    const r = relative(e.at, from, heading)
    if (r.forward <= 0 || r.distance > reach) continue
    // Off the crosshair counts more than far away.
    const score = Math.abs(r.right / r.forward) * 40 + r.distance * 0.2
    if (score < bestScore) {
      best = e
      bestScore = score
    }
  }
  return best
}

export interface GroupMember extends PartySeat {
  health: number
  maxHealth: number
  /** 0–1 of its resource bar. */
  resourceFill: number
  /** Where it follows you, from DEF_Bots' formation: metres right and ahead. */
  offset: Vec
}

const FORMATION: Record<string, Vec> = { Bram: { x: 2, y: -3 }, Maelis: { x: 0, y: -5 }, Corin: { x: -2, y: -4 }, Wren: { x: 2.5, y: -4.5 } }

/** The other seats of your group at a moment in the fight: their health and resource drift as the fight goes. */
export function groupAt(role: PartySeat['role'], level: number, t: number, fighting: boolean): GroupMember[] {
  const maxHealth = Math.round(800 + (1600 * (level - 1)) / 59)
  return otherSeats(role).map((seat, i) => {
    const wave = fighting ? 0.5 + 0.35 * Math.sin(t / (3 + i) + i * 1.7) + 0.15 * Math.sin(t / 1.3 + i) : 1
    const res = seat.resource === 'mana' ? 0.6 + 0.3 * Math.sin(t / 9) : seat.resource === 'combo' ? Math.floor(((t / 2 + i) % 7)) / 6 : 0.5 + 0.4 * Math.sin(t / 4 + i)
    return {
      ...seat,
      health: Math.max(1, Math.round(maxHealth * Math.min(1, wave))),
      maxHealth,
      resourceFill: Math.max(0, Math.min(1, fighting ? res : seat.resource === 'mana' ? 1 : 0)),
      offset: FORMATION[seat.name] ?? { x: 0, y: -4 },
    }
  })
}

// ---------- The boss fight (Bosses: health with a tick at each phase, enrage, wind-ups) ----------

export interface BossState {
  boss: UnityBoss
  difficulty: 'normal' | 'hard'
  /** % of health left. */
  health: number
  phase: BossPhase
  /** Seconds since the pull. */
  elapsed: number
  /** Seconds to the enrage; 0 once enraged. */
  enrageIn: number
  casting: { name: string; progress: number } | null
}

/** Enrage comes 5 min after the pull. */
export const ENRAGE_AFTER = 300
/** A wind-up every 14 sec, 1.2 sec long. */
const CAST_EVERY = 14
const CAST_TIME = 1.2

/** The fight `t` seconds after the pull: the boss loses a little health a second, down to 5%, and winds up a cast now and then. */
export function bossAt(t: number, boss: UnityBoss = BOSSES[1], difficulty: BossState['difficulty'] = 'normal'): BossState {
  const elapsed = Math.max(0, t)
  const health = Math.max(5, 100 - elapsed * 0.4)
  const inCycle = elapsed % CAST_EVERY
  const castIndex = Math.floor(elapsed / CAST_EVERY)
  const casting =
    elapsed > CAST_EVERY - CAST_TIME && inCycle > CAST_EVERY - CAST_TIME
      ? { name: boss.casts[castIndex % boss.casts.length], progress: (inCycle - (CAST_EVERY - CAST_TIME)) / CAST_TIME }
      : null
  return { boss, difficulty, health, phase: phaseAt(boss, health), elapsed, enrageIn: Math.max(0, ENRAGE_AFTER - elapsed), casting }
}

/** "1:05": minutes and seconds, as the encounter bar shows them. */
export const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ---------- Objectives: what you're doing, from the zone you're in ----------

export interface ObjectiveStep {
  text: string
  done: boolean
  /** "6 / 10". */
  count?: readonly [number, number]
  /** Where it is, for the minimap's marker. */
  at?: Vec
}

export interface ZoneEvent {
  name: string
  text: string
  /** 0–1. */
  progress: number
  /** Seconds left when the prototype starts; it counts down. */
  endsIn: number
  at: Vec
}

export interface ZoneObjectives {
  zone: string
  /** Progression: the zone's own story, step by step. Open: you've done it, its events keep running. Dungeon: its bosses. */
  kind: 'progression' | 'open' | 'dungeon'
  title: string
  steps: ObjectiveStep[]
  events: ZoneEvent[]
}

const ZONES: Record<string, Omit<ZoneObjectives, 'zone'>> = {
  Ashvale: {
    kind: 'progression',
    title: 'Embers of Ashvale',
    steps: [
      { text: 'Reach the burned mill', done: true },
      { text: "Find the miller's ledger", done: true },
      { text: 'Drive the gobolds from the granary', done: false, count: [6, 10], at: { x: 30, y: 60 } },
      { text: 'Light the beacon on Cinder Hill', done: false, at: { x: -70, y: 110 } },
    ],
    events: [{ name: 'Granary raid', text: 'Gobolds are carrying off the grain', progress: 0.4, endsIn: 250, at: { x: 40, y: 70 } }],
  },
  Greyhollow: {
    kind: 'progression',
    title: 'The quiet hollow',
    steps: [
      { text: 'Follow the cart tracks', done: true },
      { text: 'Search the abandoned camp', done: false, count: [2, 3], at: { x: -25, y: 45 } },
      { text: 'Report to the warden at Greyhollow gate', done: false, at: { x: 60, y: -40 } },
    ],
    events: [],
  },
  'Thornwood Marches': {
    kind: 'open',
    title: 'Zone done · 3 events running',
    steps: [],
    events: [
      { name: 'Feral hunt', text: 'Ferals are loose in the thorns', progress: 0.62, endsIn: 150, at: { x: -40, y: 55 } },
      { name: 'Caster circle', text: 'Break the circle at the Old Stones', progress: 0.2, endsIn: 420, at: { x: 85, y: 30 } },
      { name: 'Supply run', text: 'Guard the wagon to the ford', progress: 0.85, endsIn: 70, at: { x: 10, y: -75 } },
    ],
  },
  'The Sunken Archive': {
    kind: 'open',
    title: 'Zone done · 2 events running',
    steps: [],
    events: [
      { name: 'Rising water', text: 'Seal the flooded stacks', progress: 0.35, endsIn: 310, at: { x: 50, y: 50 } },
      { name: 'Lost pages', text: 'Gather the drifting pages', progress: 0.7, endsIn: 190, at: { x: -55, y: 20 } },
    ],
  },
}

/** The dungeon's steps: its first boss down, the lift ridden, the second boss now. */
function dungeonObjectives(boss: BossState | null): ZoneObjectives {
  const [snikkit, malacarne] = BOSSES
  return {
    zone: DUNGEON,
    kind: 'dungeon',
    title: '1 of 2 bosses',
    steps: [
      { text: `Defeat ${snikkit.name}`, done: true },
      { text: 'Ride the lift down', done: true },
      { text: boss ? `Defeat ${malacarne.name} · ${boss.phase.name}` : `Defeat ${malacarne.name}`, done: false, at: { x: 0, y: 14 } },
    ],
    events: [],
  }
}

/** What the tracker shows in this zone. A zone with no data: nothing running, explore it. */
export function objectivesFor(zone: string, situation: Situation, boss: BossState | null = null): ZoneObjectives {
  if (situation === 'boss') return dungeonObjectives(boss)
  const data = ZONES[zone]
  if (!data) return { zone, kind: 'open', title: 'Nothing running here yet', steps: [{ text: `Explore ${zone}`, done: false }], events: [] }
  return { zone, ...data, steps: data.steps.map((s) => ({ ...s })), events: data.events.map((e) => ({ ...e })) }
}

/** The step you're on: the first one not done. */
export const currentStep = (o: ZoneObjectives): ObjectiveStep | undefined => o.steps.find((s) => !s.done)

/** Where the minimap puts markers: the current step and every event. */
export const objectiveMarkers = (o: ZoneObjectives): Vec[] => [
  ...o.steps.filter((s) => !s.done && s.at).map((s) => s.at as Vec),
  ...o.events.map((e) => e.at),
]

// ---------- A zone's map: woods, water and paths, the same every time for a zone ----------

export interface MapFeature {
  kind: 'wood' | 'water' | 'rock'
  at: Vec
  r: number
}

/** A small seeded random, so a zone's map doesn't change between visits. */
function seeded(text: string): () => number {
  let h = 2166136261
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

export function zoneMap(zone: string): { features: MapFeature[]; paths: Vec[][] } {
  const rnd = seeded(zone)
  const kinds: MapFeature['kind'][] = ['wood', 'wood', 'wood', 'water', 'rock']
  const features = Array.from({ length: 26 }, () => ({
    kind: kinds[Math.floor(rnd() * kinds.length)],
    at: { x: (rnd() - 0.5) * 400, y: (rnd() - 0.5) * 400 },
    r: 8 + rnd() * 26,
  }))
  const paths = Array.from({ length: 3 }, () => {
    const points: Vec[] = [{ x: (rnd() - 0.5) * 60, y: (rnd() - 0.5) * 60 }]
    const angle = rnd() * Math.PI * 2
    for (let i = 1; i < 8; i++) {
      const prev = points[i - 1]
      const a = angle + (rnd() - 0.5) * 0.9
      points.push({ x: prev.x + Math.sin(a) * 30, y: prev.y + Math.cos(a) * 30 })
    }
    return points
  })
  return { features, paths }
}

// ---------- The bag: one bag of 30, sorted into categories, with a search ----------

export type BagCategory = 'Quest' | 'Trinkets' | 'Consumables' | 'Materials' | 'Junk'

export const BAG_CATEGORIES: readonly BagCategory[] = ['Quest', 'Trinkets', 'Consumables', 'Materials', 'Junk']

export interface BagItem {
  id: string
  name: string
  category: BagCategory
  /** Trinkets have a rarity; the rest is plain. */
  rarity?: Rarity
  count: number
  /** One line under the name in a card: item level and stats, or what it's for. */
  detail: string
  color: string
}

const trinket = (t: Trinket, i: number): BagItem => ({
  id: `t${i}`,
  name: trinketName(t),
  category: 'Trinkets',
  rarity: t.rarity,
  count: 1,
  detail: `${RARITY_INFO[t.rarity].label} ${t.slot.toLowerCase()} · item level ${t.itemLevel}`,
  color: RARITY_INFO[t.rarity].color,
})

const plain = (id: string, name: string, category: BagCategory, count: number, detail: string, color: string): BagItem => ({
  id,
  name,
  category,
  count,
  detail,
  color,
})

/** What's in the bag: trinkets as the game drops them (named from their slot and stats), and made-up odds and ends. */
export function sampleBag(level: number): BagItem[] {
  const ilvl = Math.max(5, level * 2)
  const pairs: readonly Trinket['stats'][] = [
    ['haste', 'crit'],
    ['crit', 'critDamage'],
    ['potency', 'haste'],
    ['echo', 'crit'],
    ['haste', 'potency'],
    ['critDamage', 'potency'],
  ]
  const rarities: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'uncommon', 'rare']
  const trinkets = pairs.map((stats, i) => trinket({ slot: TRINKET_SLOTS[(i * 5) % TRINKET_SLOTS.length], rarity: rarities[i], itemLevel: ilvl - i * 3, stats }, i))
  return [
    plain('q1', "Overseer's lift key", 'Quest', 1, 'Opens the lift down to the overseer', '#e7b725'),
    plain('q2', "Miller's ledger", 'Quest', 1, 'Someone in Ashvale wants this back', '#e7b725'),
    ...trinkets,
    plain('c1', 'Healing draught', 'Consumables', 7, 'Heals 30% of your health over 6 sec', '#c0432f'),
    plain('c2', 'Clarity tonic', 'Consumables', 3, 'Restores 20% of your resource', '#5aa9ff'),
    plain('c3', 'Trail bread', 'Consumables', 12, 'Eat out of combat to recover', '#c9a227'),
    plain('m1', 'Feral hide', 'Materials', 9, 'Tough and bristly', '#a07850'),
    plain('m2', 'Gobold scrap', 'Materials', 14, 'Bent iron, still useful', '#9aa0a6'),
    plain('m3', 'Grave dust', 'Materials', 5, 'From the Gravehands', '#b49ad0'),
    plain('j1', 'Broken chain link', 'Junk', 3, 'Sells for a little', '#8a8a8a'),
  ]
}

export interface BagGroup {
  /** "All" when the bag isn't split into categories. */
  category: BagCategory | 'All'
  items: BagItem[]
}

/** The bag on show: items matching the search (name, category or detail, any case), in categories or as one list. */
export function bagView(items: readonly BagItem[], query: string, byCategory: boolean): BagGroup[] {
  const q = query.trim().toLocaleLowerCase()
  const shown = q === '' ? [...items] : items.filter((i) => `${i.name} ${i.category} ${i.detail}`.toLocaleLowerCase().includes(q))
  if (!byCategory) return shown.length > 0 ? [{ category: 'All', items: shown }] : []
  return BAG_CATEGORIES.map((category) => ({ category, items: shown.filter((i) => i.category === category) })).filter((g) => g.items.length > 0)
}

/** Free slots: a stack takes one slot. */
export const freeSlots = (items: readonly BagItem[]) => Math.max(0, BAG_SIZE - items.length)
