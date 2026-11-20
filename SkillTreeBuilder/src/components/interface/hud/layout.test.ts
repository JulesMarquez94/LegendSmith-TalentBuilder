import { describe, expect, it } from 'vitest'
import {
  blockAt,
  blockers,
  canPlace,
  clampRect,
  COLS,
  freeSpot,
  fromPreset,
  hide,
  HUD_IDS,
  isShown,
  isValidLayout,
  isWindow,
  moveBy,
  PART,
  PARTS,
  place,
  PRESETS,
  readLayout,
  resizeFrom,
  ROWS,
  show,
  toBlocks,
  type HudLayout,
} from './layout.ts'
import { cleanSettings, defaultSettings, fitsOption, optionsOf, SETTINGS, stepRange, withSetting } from './settings.ts'

describe('the grid', () => {
  it('has the same 32 × 18 blocks at every 16:9 resolution, so a block scales with the screen', () => {
    expect(COLS / ROWS).toBeCloseTo(16 / 9)
    expect(blockAt(1920)).toBe(60)
    expect(blockAt(1280)).toBe(40)
    expect(blockAt(3840)).toBe(120)
  })

  it('has every element once, each with a min no bigger than its max and both on the grid', () => {
    expect(new Set(HUD_IDS).size).toBe(PARTS.length)
    for (const p of PARTS) {
      expect(p.min.w).toBeLessThanOrEqual(p.max.w)
      expect(p.min.h).toBeLessThanOrEqual(p.max.h)
      expect(p.max.w).toBeLessThanOrEqual(COLS)
      expect(p.max.h).toBeLessThanOrEqual(ROWS)
    }
  })

  it('opens the character screen and the bags as windows, and keeps the rest on screen', () => {
    expect(HUD_IDS.filter(isWindow).sort()).toEqual(['bags', 'character'])
  })

  it('says which elements the Unity game has, and which are new', () => {
    const fromUnity = PARTS.filter((p) => p.unity !== null).map((p) => p.id)
    expect(fromUnity).toEqual(['player', 'actions', 'target', 'boss', 'encounter', 'party', 'prompt', 'character'])
    expect(PARTS.filter((p) => p.unity === null).map((p) => p.id)).toEqual(['minimap', 'objectives', 'micro', 'bags'])
  })
})

describe('the presets', () => {
  it.each(PRESETS.map((p) => [p.name, p] as const))('%s fits the grid with nothing overlapping', (_, preset) => {
    const layout = fromPreset(preset)
    expect(isValidLayout(layout)).toBe(true)
    expect(Object.keys(layout.rects).sort()).toEqual([...HUD_IDS].sort())
  })

  it('starts as in Unity, with the minimap 5 × 5 in the top right corner', () => {
    const layout = fromPreset()
    expect(layout.rects.minimap).toEqual({ x: 27, y: 0, w: 5, h: 5 })
    expect(layout.rects.actions.y + layout.rects.actions.h).toBe(ROWS)
    expect(layout.rects.party).toMatchObject({ x: 0, y: 0 })
  })

  it("applies a preset's settings over the defaults", () => {
    const classic = fromPreset(PRESETS.find((p) => p.id === 'classic'))
    expect(classic.settings.player.layout).toBe('stacked')
    expect(classic.settings.minimap.shape).toBe('square')
    expect(classic.settings.minimap.rotation).toBe('north')
    expect(fromPreset().settings.minimap.shape).toBe('circle')
  })
})

describe('placing an element', () => {
  const base = fromPreset()

  it('moves it to a free place', () => {
    const moved = place(base, 'minimap', { x: 27, y: 12, w: 5, h: 5 })
    expect(moved.rects.minimap).toEqual({ x: 27, y: 12, w: 5, h: 5 })
    expect(base.rects.minimap).toEqual({ x: 27, y: 0, w: 5, h: 5 })
  })

  it("won't put it on another element, off the grid or at a size it doesn't allow", () => {
    expect(place(base, 'minimap', { ...base.rects.objectives, w: 5, h: 5 })).toBe(base)
    expect(blockers(base, 'minimap', { x: 26, y: 5, w: 5, h: 5 })).toContain('encounter')
    expect(place(base, 'minimap', { x: 28, y: 0, w: 5, h: 5 })).toBe(base)
    expect(place(base, 'minimap', { x: 27, y: 0, w: 2, h: 2 })).toBe(base)
    expect(place(base, 'minimap', { x: 27.5, y: 0, w: 5, h: 5 })).toBe(base)
  })

  it('lets a window open over the HUD, and nothing is blocked by a window', () => {
    expect(canPlace(base, 'bags', { x: 0, y: 0, w: 9, h: 12 })).toBe(true)
    expect(blockers(base, 'party', base.rects.party)).toEqual([])
    expect(canPlace(base, 'party', { ...base.rects.party, y: 5 })).toBe(true)
  })

  it('ignores hidden elements', () => {
    const noEncounter = hide(base, 'encounter')
    expect(canPlace(noEncounter, 'minimap', { x: 27, y: 5, w: 5, h: 2 + 3 })).toBe(false)
    const free = hide(hide(base, 'encounter'), 'objectives')
    expect(canPlace(free, 'minimap', { x: 27, y: 5, w: 5, h: 5 })).toBe(true)
  })
})

describe('moving and resizing by blocks', () => {
  it('turns a drag in pixels into whole blocks', () => {
    expect(toBlocks(89, 60)).toBe(1)
    expect(toBlocks(91, 60)).toBe(2)
    expect(toBlocks(-29, 60)).toBe(0)
    expect(toBlocks(100, 0)).toBe(0)
    expect(moveBy({ x: 3, y: 4, w: 2, h: 2 }, -1, 2)).toEqual({ x: 2, y: 6, w: 2, h: 2 })
  })

  it('resizes from any corner, the opposite corner staying put', () => {
    const map = { x: 20, y: 6, w: 5, h: 5 }
    expect(resizeFrom(map, 'se', 2, 1, 'minimap')).toEqual({ x: 20, y: 6, w: 7, h: 6 })
    expect(resizeFrom(map, 'nw', -2, -1, 'minimap')).toEqual({ x: 18, y: 5, w: 7, h: 6 })
    expect(resizeFrom(map, 'ne', 1, 1, 'minimap')).toEqual({ x: 20, y: 7, w: 6, h: 4 })
    expect(resizeFrom(map, 'sw', 1, 0, 'minimap')).toEqual({ x: 21, y: 6, w: 4, h: 5 })
  })

  it("stops at the element's min and max and at the grid's edge", () => {
    const map = { x: 20, y: 6, w: 5, h: 5 }
    expect(resizeFrom(map, 'se', -9, -9, 'minimap')).toEqual({ x: 20, y: 6, w: 3, h: 3 })
    expect(resizeFrom(map, 'se', 20, 20, 'minimap')).toEqual({ x: 20, y: 6, w: 9, h: 9 })
    const corner = { x: 28, y: 0, w: 4, h: 4 }
    expect(resizeFrom(corner, 'ne', 5, -5, 'minimap')).toEqual({ x: 28, y: 0, w: 4, h: 4 })
    expect(resizeFrom(corner, 'nw', -9, 0, 'minimap')).toEqual({ x: 23, y: 0, w: 9, h: 4 })
  })

  it('forces a rect onto the grid at an allowed size', () => {
    expect(clampRect('minimap', { x: 40, y: -3, w: 1, h: 20 })).toEqual({ x: 29, y: 0, w: 3, h: 9 })
    expect(clampRect('player', { x: Number.NaN, y: 2.6, w: 8, h: 2 })).toEqual({ x: 0, y: 3, w: 8, h: 2 })
  })
})

describe('turning elements off and on', () => {
  it('hides one, and shows it again where it was', () => {
    const base = fromPreset()
    const off = hide(base, 'minimap')
    expect(isShown(off, 'minimap')).toBe(false)
    expect(hide(off, 'minimap')).toBe(off)
    const on = show(off, 'minimap')
    expect(isShown(on, 'minimap')).toBe(true)
    expect(on.rects.minimap).toEqual(base.rects.minimap)
  })

  it('finds the nearest free place when something took its spot', () => {
    const off = hide(fromPreset(), 'minimap')
    const taken = place(off, 'objectives', { x: 26, y: 0, w: 6, h: 5 })
    const on = show(taken, 'minimap')
    expect(isShown(on, 'minimap')).toBe(true)
    expect(blockers(on, 'minimap', on.rects.minimap)).toEqual([])
    expect(isValidLayout(on)).toBe(true)
    expect(freeSpot(on, 'minimap')).toEqual(on.rects.minimap)
  })
})

describe('the saved layout', () => {
  it('starts from the default with nothing saved, or something unreadable', () => {
    expect(readLayout(null)).toEqual(fromPreset())
    expect(readLayout('{oops')).toEqual(fromPreset())
    expect(readLayout('42')).toEqual(fromPreset())
  })

  it('reads back what was saved', () => {
    let layout = place(fromPreset(), 'minimap', { x: 0, y: 12, w: 4, h: 4 })
    layout = hide(layout, 'micro')
    layout = { ...layout, settings: withSetting(layout.settings, 'minimap', 'rotation', 'turn') }
    expect(readLayout(JSON.stringify(layout))).toEqual(layout)
  })

  it('forces stored places onto the grid, and moves or turns off what overlaps', () => {
    const stored = {
      rects: {
        minimap: { x: 50, y: 0, w: 5, h: 5 },
        objectives: { x: 27, y: 0, w: 5, h: 5 },
        player: { x: 'a', y: 0, w: 8, h: 2 },
      },
      hidden: ['bags', 'nope'],
    }
    const layout = readLayout(JSON.stringify(stored))
    expect(layout.rects.minimap).toEqual({ x: 27, y: 0, w: 5, h: 5 })
    expect(isValidLayout(layout)).toBe(true)
    expect(layout.hidden).toContain('bags')
    expect(layout.hidden).not.toContain('nope')
    // The objectives wanted the minimap's corner: they go back to their own place.
    expect(layout.rects.objectives).toEqual(fromPreset().rects.objectives)
  })

  it('keeps a valid layout valid however it was stored', () => {
    const rects = Object.fromEntries(HUD_IDS.map((id) => [id, { x: 0, y: 0, w: PART[id].min.w, h: PART[id].min.h }]))
    const layout: HudLayout = readLayout(JSON.stringify({ rects }))
    expect(isValidLayout(layout)).toBe(true)
    expect(HUD_IDS.filter((id) => isShown(layout, id) && !isWindow(id)).length).toBeGreaterThan(5)
  })
})

describe('element settings', () => {
  it('has defaults that fit their own options', () => {
    const defaults = defaultSettings() as unknown as Record<string, Record<string, unknown>>
    for (const group of Object.keys(SETTINGS) as (keyof typeof SETTINGS)[])
      for (const [key, option] of optionsOf(group)) expect(fitsOption(option, defaults[group][key]), `${group}.${key}`).toBe(true)
  })

  it("matches the Unity game's tuning where it has the element", () => {
    const s = defaultSettings()
    expect(s.world.distance).toBe(30)
    expect(s.world.maxPlates).toBe(12)
    expect(s.world.plateWidth).toBe(64)
    expect(s.world.fullHealth).toBe(true)
    expect(s.boss.text).toBe('percent')
    expect(s.player.text).toBe('value')
    expect(s.player.layout).toBe('side')
    expect(s.actions.groupBuff).toBe(true)
  })

  it('keeps stored values that fit and drops the rest', () => {
    const clean = cleanSettings({
      minimap: { shape: 'square', radius: 999, rotation: 'sideways', clock: true },
      world: { maxPlates: 4, distance: 33 },
      nope: { x: 1 },
    })
    expect(clean.minimap.shape).toBe('square')
    expect(clean.minimap.clock).toBe(true)
    expect(clean.minimap.radius).toBe(60)
    expect(clean.minimap.rotation).toBe('north')
    expect(clean.world.maxPlates).toBe(4)
    expect(clean.world.distance).toBe(30)
    expect(cleanSettings('junk')).toEqual(defaultSettings())
  })

  it('changes one setting only when the value fits', () => {
    const s = defaultSettings()
    expect(withSetting(s, 'minimap', 'shape', 'square').minimap.shape).toBe('square')
    expect(withSetting(s, 'minimap', 'shape', 'triangle')).toBe(s)
    expect(withSetting(s, 'minimap', 'nope', true)).toBe(s)
  })

  it('zooms the minimap in steps, no further out than 120 m', () => {
    const radius = SETTINGS.minimap.radius
    expect(stepRange(radius, 60, 1)).toBe(70)
    expect(stepRange(radius, 110, 3)).toBe(120)
    expect(stepRange(radius, 40, -5)).toBe(30)
  })
})
