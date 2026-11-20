// The HUD sits on a grid of blocks: 32 across and 18 down on every 16:9 screen, so a block is 60 px at
// 1920 × 1080, 40 px at 1280 × 720 and 120 px at 3840 × 2160, and a layout looks the same at any
// resolution. Every element is a rectangle of whole blocks. The ones always on screen can't overlap;
// windows (the character screen, the bags) open over them. The player moves and sizes them in the
// edit mode, and the layout is a saved setting.

import { cleanSettings, defaultSettings, type HudSettings, type SettingsGroup } from './settings.ts'
import { KEYS, type KeyPrompt } from './unity.ts'

export const COLS = 32
export const ROWS = 18

export type HudId =
  | 'player'
  | 'actions'
  | 'target'
  | 'boss'
  | 'encounter'
  | 'party'
  | 'prompt'
  | 'character'
  | 'minimap'
  | 'objectives'
  | 'micro'
  | 'bags'

export interface Size {
  w: number
  h: number
}

export interface Rect extends Size {
  x: number
  y: number
}

export interface HudPart {
  id: HudId
  name: string
  /** What it shows, for the edit mode. */
  about: string
  /** Where the Unity game has it now, or null when it's new in this prototype. */
  unity: string | null
  min: Size
  max: Size
  /** Opens and closes with a key, over the HUD. */
  window?: KeyPrompt
  /** Only on screen when there's something to show: a target, a boss encounter, something to use. */
  when?: 'target' | 'encounter' | 'interact'
}

export const PARTS: readonly HudPart[] = [
  {
    id: 'player',
    name: 'Player bars',
    about: 'Role and weapon, buffs and debuffs, health and resource, stamina, the cast bar, and counters for your minions.',
    unity: 'HUD · PlayerBars slot, bottom centre',
    min: { w: 6, h: 2 },
    max: { w: 16, h: 5 },
  },
  {
    id: 'actions',
    name: 'Action bar',
    about: 'Your seven slots in control order, the passive group buff last. Taller than wide, it stands on end.',
    unity: 'HUD · ActionBar slot, bottom centre',
    min: { w: 1, h: 1 },
    max: { w: 20, h: 14 },
  },
  {
    id: 'target',
    name: 'Target frame',
    about: 'The enemy your abilities would hit: name, health and its buffs and debuffs.',
    unity: 'Abilities · Target slot, top centre',
    min: { w: 4, h: 1 },
    max: { w: 10, h: 2 },
    when: 'target',
  },
  {
    id: 'boss',
    name: 'Boss frame',
    about: 'Name and difficulty, health with a tick at each phase, the phase, the enrage countdown and the wind-up bar.',
    unity: 'Bosses · Target slot, top centre',
    min: { w: 6, h: 2 },
    max: { w: 18, h: 4 },
    when: 'encounter',
  },
  {
    id: 'encounter',
    name: 'Encounter bar',
    about: 'The running encounter: boss and difficulty, phase, time since the pull and the enrage countdown.',
    unity: 'Bosses · EncounterBar slot, top right',
    min: { w: 4, h: 1 },
    max: { w: 8, h: 3 },
    when: 'encounter',
  },
  {
    id: 'party',
    name: 'Group frames',
    about: 'The other seats of your group: role, name, health and resource.',
    unity: 'Bots · Party slot, top left',
    min: { w: 3, h: 3 },
    max: { w: 10, h: 14 },
  },
  {
    id: 'prompt',
    name: 'Interact prompt',
    about: 'The key, then what it does: release, revive, open.',
    unity: 'Player · Prompt slot, under the centre',
    min: { w: 3, h: 1 },
    max: { w: 8, h: 2 },
    when: 'interact',
  },
  {
    id: 'character',
    name: 'Character screen',
    about: 'Gear around your vitals, the bag, artifact, stats, and your eight slots with their trees.',
    unity: 'HUD · character screen, C / View',
    min: { w: 14, h: 10 },
    max: { w: COLS, h: ROWS },
    window: KEYS.character,
  },
  {
    id: 'minimap',
    name: 'Minimap',
    about: 'The area from above: you, your group, enemies and objectives. Circle or square, north up or turning with you, zoom.',
    unity: null,
    min: { w: 3, h: 3 },
    max: { w: 9, h: 9 },
  },
  {
    id: 'objectives',
    name: 'Objectives',
    about: "No quest log: what you're doing now, from the zone you're in. Its progression, or the events running in it.",
    unity: null,
    min: { w: 4, h: 3 },
    max: { w: 10, h: 12 },
  },
  {
    id: 'micro',
    name: 'Micro menu',
    about: 'Quick buttons for the character screen, the bags, the map and the game menu. Taller than wide, it stands on end.',
    unity: null,
    min: { w: 1, h: 1 },
    max: { w: 12, h: 8 },
  },
  {
    id: 'bags',
    name: 'Bags',
    about: 'One bag of 30 slots that sorts itself into categories, with a search box.',
    unity: null,
    min: { w: 6, h: 6 },
    max: { w: 16, h: 16 },
    window: { keyboard: 'B', gamepad: '—' },
  },
]

export const PART = Object.fromEntries(PARTS.map((p) => [p.id, p])) as Record<HudId, HudPart>

export const HUD_IDS: readonly HudId[] = PARTS.map((p) => p.id)

export const isWindow = (id: HudId) => PART[id].window !== undefined

export interface HudLayout {
  rects: Record<HudId, Rect>
  /** Turned off in the edit mode. */
  hidden: HudId[]
  settings: HudSettings
}

/** A starting layout: where everything goes, and the settings it changes from the defaults. */
export interface HudPreset {
  id: string
  name: string
  about: string
  rects: Record<HudId, Rect>
  settings?: { [G in SettingsGroup]?: Partial<HudSettings[G]> }
}

const r = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })

export const PRESETS: readonly HudPreset[] = [
  {
    id: 'unity',
    name: 'As in Unity',
    about:
      "The game's own places: the group top left, the boss and the target top centre, the bars and slots bottom centre. The new parts fill the right side.",
    rects: {
      party: r(0, 0, 4, 5),
      boss: r(11, 0, 10, 2),
      target: r(13, 2, 6, 1),
      minimap: r(27, 0, 5, 5),
      encounter: r(26, 5, 6, 2),
      objectives: r(26, 7, 6, 5),
      prompt: r(13, 11, 6, 1),
      player: r(11, 14, 10, 3),
      actions: r(12, 17, 8, 1),
      micro: r(27, 17, 5, 1),
      bags: r(22, 3, 9, 12),
      character: r(4, 2, 24, 14),
    },
  },
  {
    id: 'classic',
    name: 'Classic',
    about: 'An older MMO: you and your target top left, the group under you, a big action bar and a square map.',
    rects: {
      player: r(0, 0, 7, 3),
      target: r(7, 0, 6, 1),
      party: r(0, 3, 4, 6),
      boss: r(13, 0, 10, 2),
      minimap: r(27, 0, 5, 5),
      encounter: r(26, 5, 6, 2),
      objectives: r(26, 7, 6, 6),
      prompt: r(13, 12, 6, 1),
      actions: r(11, 16, 10, 2),
      micro: r(24, 17, 8, 1),
      bags: r(22, 4, 9, 12),
      character: r(1, 1, 24, 14),
    },
    settings: {
      player: { layout: 'stacked' },
      party: { text: 'percent', you: true },
      minimap: { shape: 'square' },
      actions: { costs: true },
      micro: { names: true },
    },
  },
]

export const DEFAULT_PRESET = PRESETS[0]

/** A fresh layout from a preset, with the default settings plus the preset's own. */
export function fromPreset(preset: HudPreset = DEFAULT_PRESET): HudLayout {
  const settings = defaultSettings() as unknown as Record<string, Record<string, unknown>>
  for (const [group, values] of Object.entries(preset.settings ?? {})) Object.assign(settings[group], values)
  return {
    rects: Object.fromEntries(HUD_IDS.map((id) => [id, { ...preset.rects[id] }])) as Record<HudId, Rect>,
    hidden: [],
    settings: settings as unknown as HudSettings,
  }
}

export const inBounds = (rect: Rect) =>
  Number.isInteger(rect.x) &&
  Number.isInteger(rect.y) &&
  Number.isInteger(rect.w) &&
  Number.isInteger(rect.h) &&
  rect.x >= 0 &&
  rect.y >= 0 &&
  rect.w >= 1 &&
  rect.h >= 1 &&
  rect.x + rect.w <= COLS &&
  rect.y + rect.h <= ROWS

export const sizeFits = (id: HudId, rect: Size) => {
  const { min, max } = PART[id]
  return rect.w >= min.w && rect.h >= min.h && rect.w <= max.w && rect.h <= max.h
}

export const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

export const isShown = (layout: HudLayout, id: HudId) => !layout.hidden.includes(id)

/** The elements in the way of putting `id` at `rect`: shown, not windows, overlapping it. Windows are never in the way, nor blocked. */
export function blockers(layout: HudLayout, id: HudId, rect: Rect): HudId[] {
  if (isWindow(id)) return []
  return HUD_IDS.filter((other) => other !== id && !isWindow(other) && isShown(layout, other) && overlaps(rect, layout.rects[other]))
}

export const canPlace = (layout: HudLayout, id: HudId, rect: Rect) =>
  inBounds(rect) && sizeFits(id, rect) && blockers(layout, id, rect).length === 0

/** The layout with `id` moved or resized to `rect`, or the same layout when it can't go there. */
export function place(layout: HudLayout, id: HudId, rect: Rect): HudLayout {
  if (!canPlace(layout, id, rect)) return layout
  const now = layout.rects[id]
  if (now.x === rect.x && now.y === rect.y && now.w === rect.w && now.h === rect.h) return layout
  return { ...layout, rects: { ...layout.rects, [id]: { ...rect } } }
}

/** Moved by whole blocks (the arrow keys, a drag). */
export function moveBy(rect: Rect, dx: number, dy: number): Rect {
  return { ...rect, x: rect.x + dx, y: rect.y + dy }
}

export type Corner = 'nw' | 'ne' | 'sw' | 'se'

/**
 * Resized by whole blocks from a corner, the opposite corner staying put. The size stays within the
 * element's min and max and the grid: a drag past them stops at the limit.
 */
export function resizeFrom(rect: Rect, corner: Corner, dx: number, dy: number, id: HudId): Rect {
  const { min, max } = PART[id]
  const west = corner === 'nw' || corner === 'sw'
  const north = corner === 'nw' || corner === 'ne'
  const right = rect.x + rect.w
  const bottom = rect.y + rect.h
  const clampSize = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  // How big it may grow toward each side before leaving the grid.
  const w = clampSize(rect.w + (west ? -dx : dx), min.w, Math.min(max.w, west ? right : COLS - rect.x))
  const h = clampSize(rect.h + (north ? -dy : dy), min.h, Math.min(max.h, north ? bottom : ROWS - rect.y))
  return { x: west ? right - w : rect.x, y: north ? bottom - h : rect.y, w, h }
}

/** Pixels to whole blocks, for a drag. */
export const toBlocks = (px: number, blockPx: number) => (blockPx > 0 ? Math.round(px / blockPx) || 0 : 0)

/** A rect forced onto the grid at a size the element allows. */
export function clampRect(id: HudId, rect: Rect): Rect {
  const { min, max } = PART[id]
  const whole = (v: number, fallback: number) => (Number.isFinite(v) ? Math.round(v) : fallback)
  const w = Math.min(max.w, COLS, Math.max(min.w, whole(rect.w, min.w)))
  const h = Math.min(max.h, ROWS, Math.max(min.h, whole(rect.h, min.h)))
  const x = Math.min(COLS - w, Math.max(0, whole(rect.x, 0)))
  const y = Math.min(ROWS - h, Math.max(0, whole(rect.y, 0)))
  return { x, y, w, h }
}

/** The nearest free place for `id` at its size (fewest blocks away), or null when the grid has none. */
export function freeSpot(layout: HudLayout, id: HudId): Rect | null {
  const at = layout.rects[id]
  let best: Rect | null = null
  let bestDistance = Infinity
  for (let y = 0; y + at.h <= ROWS; y++) {
    for (let x = 0; x + at.w <= COLS; x++) {
      const candidate = { ...at, x, y }
      const distance = Math.abs(x - at.x) + Math.abs(y - at.y)
      if (distance < bestDistance && blockers(layout, id, candidate).length === 0) {
        best = candidate
        bestDistance = distance
      }
    }
  }
  return best
}

export function hide(layout: HudLayout, id: HudId): HudLayout {
  return isShown(layout, id) ? { ...layout, hidden: [...layout.hidden, id] } : layout
}

/** Turned back on where it was, or at the nearest free place if something took its spot; stays off if there's none. */
export function show(layout: HudLayout, id: HudId): HudLayout {
  if (isShown(layout, id)) return layout
  const hidden = layout.hidden.filter((h) => h !== id)
  const shown = { ...layout, hidden }
  if (blockers(shown, id, layout.rects[id]).length === 0) return shown
  const spot = freeSpot(shown, id)
  return spot ? { ...shown, rects: { ...layout.rects, [id]: spot } } : layout
}

/** Every shown element fits the grid at an allowed size, and none of those always on screen overlap. */
export function isValidLayout(layout: HudLayout): boolean {
  return HUD_IDS.every(
    (id) => inBounds(layout.rects[id]) && sizeFits(id, layout.rects[id]) && (!isShown(layout, id) || blockers(layout, id, layout.rects[id]).length === 0),
  )
}

/**
 * A layout from what this browser stored. Each element keeps its stored place when it still fits,
 * forced onto the grid at an allowed size. One that overlaps an element already placed goes back to
 * its default place, or the nearest free one, or is turned off. Anything unreadable: the default layout.
 */
export function readLayout(stored: string | null): HudLayout {
  if (stored === null) return fromPreset()
  let parsed: unknown
  try {
    parsed = JSON.parse(stored)
  } catch {
    return fromPreset()
  }
  if (!parsed || typeof parsed !== 'object') return fromPreset()
  const raw = parsed as { rects?: unknown; hidden?: unknown; settings?: unknown }
  const base = fromPreset()
  const storedRects = (raw.rects && typeof raw.rects === 'object' ? raw.rects : {}) as Record<string, unknown>
  const hidden = Array.isArray(raw.hidden) ? HUD_IDS.filter((id) => (raw.hidden as unknown[]).includes(id)) : []
  let layout: HudLayout = { rects: { ...base.rects }, hidden: [...hidden], settings: cleanSettings(raw.settings) }

  // Every element starts off, then goes on one by one where it can, so overlaps resolve in order.
  const placed: HudLayout = { ...layout, hidden: [...HUD_IDS] }
  layout = placed
  for (const id of HUD_IDS) {
    const s = storedRects[id] as Partial<Rect> | undefined
    const wanted =
      s && typeof s === 'object' ? clampRect(id, { x: Number(s.x), y: Number(s.y), w: Number(s.w), h: Number(s.h) }) : base.rects[id]
    layout = { ...layout, rects: { ...layout.rects, [id]: wanted } }
    if (hidden.includes(id)) continue
    const on = { ...layout, hidden: layout.hidden.filter((h) => h !== id) }
    if (blockers(on, id, wanted).length === 0) {
      layout = on
      continue
    }
    const back = { ...on, rects: { ...on.rects, [id]: { ...base.rects[id] } } }
    if (blockers(back, id, base.rects[id]).length === 0) {
      layout = back
      continue
    }
    const spot = freeSpot(back, id)
    layout = spot ? { ...back, rects: { ...back.rects, [id]: spot } } : layout
  }
  return layout
}

const KEY = 'legendsmith.hud.v1'

export function loadLayout(): HudLayout {
  try {
    return readLayout(localStorage.getItem(KEY))
  } catch {
    return fromPreset()
  }
}

export function saveLayout(layout: HudLayout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(layout))
  } catch {
    // Private windows and blocked storage: the HUD works the same, it just won't remember.
  }
}

/** A block's size in pixels on a screen this wide (the grid is the same everywhere). */
export const blockAt = (screenWidth: number) => screenWidth / COLS

/** Where a rect sits on the grid, in % of the HUD, for an element's style. */
export const rectStyle = (r: Rect) => ({
  left: `${(r.x / COLS) * 100}%`,
  top: `${(r.y / ROWS) * 100}%`,
  width: `${(r.w / COLS) * 100}%`,
  height: `${(r.h / ROWS) * 100}%`,
})
