import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { keyTarget } from '../keys.ts'
import {
  blockers,
  canPlace,
  COLS,
  fromPreset,
  hide,
  isShown,
  isWindow,
  moveBy,
  PART,
  PARTS,
  place,
  PRESETS,
  rectStyle,
  resizeFrom,
  ROWS,
  show,
  toBlocks,
  type Corner,
  type HudId,
  type HudLayout,
  type Rect,
} from './layout.ts'
import { optionsOf, withSetting, type HudOption, type SettingsGroup, type SettingValue } from './settings.ts'
import { REFERENCE, UNITY_SNAPSHOT } from './unity.ts'

export type Selection = HudId | 'world' | null

interface Props {
  layout: HudLayout
  /** The layout as it was when the edit mode opened, for Undo. */
  before: HudLayout
  blockPx: number
  selected: Selection
  onSelect: (selection: Selection) => void
  onLayout: (layout: HudLayout) => void
  onDone: () => void
}

interface Drag {
  id: HudId
  mode: 'move' | Corner
  x: number
  y: number
  start: Rect
  rect: Rect
  moved: boolean
}

const CORNERS: readonly Corner[] = ['nw', 'ne', 'sw', 'se']

/**
 * The HUD's edit mode, over the HUD itself: the 32 × 18 grid, a frame on every element to drag it by
 * whole blocks or size it from a corner, and a panel with the presets, every element (on or off) and
 * the selected one's own settings. Arrows move the selected element a block, Shift and arrows size it,
 * Delete turns it off, Esc lets go of it and then leaves. The layout saves as it changes.
 */
export function HudEditor({ layout, before, blockPx, selected, onSelect, onLayout, onDone }: Props) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const [windows, setWindows] = useState(false)
  const [flip, setFlip] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const latest = useRef({ layout, selected, onLayout, onSelect, onDone })
  useEffect(() => {
    latest.current = { layout, selected, onLayout, onSelect, onDone }
  })

  // Arrows, Shift-arrows, Delete and Esc, on the element selected.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || keyTarget(e.target) === 'text') return
      const { layout: l, selected: s, onLayout: set, onSelect: pick, onDone: done } = latest.current
      if (e.key === 'Escape') {
        e.preventDefault()
        if (s) pick(null)
        else done()
        return
      }
      if (!s || s === 'world') return
      const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
      if (e.key in arrows) {
        e.preventDefault()
        const [dx, dy] = arrows[e.key]
        const now = l.rects[s]
        const rect = e.shiftKey ? resizeFrom(now, 'se', dx, dy, s) : moveBy(now, dx, dy)
        const next = place(l, s, rect)
        const blocked = blockers(l, s, rect)
        setNote(next === l && blocked.length > 0 ? `${PART[blocked[0]].name} is in the way` : null)
        set(next)
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        set(hide(l, s))
        pick(null)
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  const start = (e: ReactPointerEvent, id: HudId, mode: Drag['mode']) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    onSelect(id)
    setNote(null)
    const at = layout.rects[id]
    setDrag({ id, mode, x: e.clientX, y: e.clientY, start: at, rect: at, moved: false })
  }

  const move = (e: ReactPointerEvent) => {
    if (!drag) return
    const dx = toBlocks(e.clientX - drag.x, blockPx)
    const dy = toBlocks(e.clientY - drag.y, blockPx)
    const s = drag.start
    const rect =
      drag.mode === 'move'
        ? { ...s, x: Math.min(COLS - s.w, Math.max(0, s.x + dx)), y: Math.min(ROWS - s.h, Math.max(0, s.y + dy)) }
        : resizeFrom(s, drag.mode, dx, dy, drag.id)
    if (rect.x !== drag.rect.x || rect.y !== drag.rect.y || rect.w !== drag.rect.w || rect.h !== drag.rect.h)
      setDrag({ ...drag, rect, moved: true })
  }

  const end = () => {
    if (!drag) return
    if (drag.moved) {
      const blocked = blockers(layout, drag.id, drag.rect)
      if (canPlace(layout, drag.id, drag.rect)) onLayout(place(layout, drag.id, drag.rect))
      else if (blocked.length > 0) setNote(`${PART[blocked[0]].name} is in the way: it went back`)
    }
    setDrag(null)
  }

  const chosen = selected && selected !== 'world' ? PART[selected] : null
  const chosenRect = chosen ? layout.rects[chosen.id] : null
  // The panel keeps to the side away from the element selected; the button swaps it over.
  const right = (chosenRect ? chosenRect.x + chosenRect.w / 2 < COLS / 2 : false) !== flip
  const group: SettingsGroup | null = selected
  const setSetting = (key: string, value: SettingValue) => group && onLayout({ ...layout, settings: withSetting(layout.settings, group, key, value) })
  const changed = JSON.stringify(layout) !== JSON.stringify(before)

  return (
    <div className="hud-edit" onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <div className="hud-edit__grid" aria-hidden="true" />
      {PARTS.map((part) => {
        const { id } = part
        if (!isShown(layout, id)) return null
        if (isWindow(id) && !windows && selected !== id) return null
        const dragging = drag?.id === id
        const rect = dragging ? drag.rect : layout.rects[id]
        const ok = !dragging || canPlace(layout, id, rect)
        return (
          <div
            key={id}
            className={[
              'hud-edit__frame',
              isWindow(id) && 'hud-edit__frame--window',
              selected === id && 'hud-edit__frame--selected',
              dragging && (ok ? 'hud-edit__frame--ok' : 'hud-edit__frame--blocked'),
              part.unity ? 'hud-edit__frame--unity' : 'hud-edit__frame--new',
            ]
              .filter(Boolean)
              .join(' ')}
            style={rectStyle(rect)}
            onPointerDown={(e) => start(e, id, 'move')}
          >
            <span className="hud-edit__label">
              {part.name}
              <small>
                {rect.w} × {rect.h}
              </small>
            </span>
            {selected === id &&
              CORNERS.map((c) => (
                <span key={c} className={`hud-edit__handle hud-edit__handle--${c}`} onPointerDown={(e) => start(e, id, c)} />
              ))}
          </div>
        )
      })}

      <aside className={right ? 'hud-edit__panel hud-edit__panel--right' : 'hud-edit__panel'} aria-label="Edit HUD">
        <header className="hud-edit__head">
          <b>Edit HUD</b>
          <button type="button" className="hud-edit__flip" onClick={() => setFlip((f) => !f)} title="Move this panel to the other side">
            ⇆
          </button>
        </header>
        <p className="hud-edit__info">
          {COLS} × {ROWS} blocks on every screen: a block is {REFERENCE.width / COLS} px at {REFERENCE.width} × {REFERENCE.height}, and{' '}
          {Math.round(blockPx)} px here. Drag to move, pull a corner to size, arrows to nudge.
        </p>
        <div className="hud-edit__row">
          <span className="hud-edit__caption">Start from</span>
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="hud-edit__chip" title={p.about} onClick={() => onLayout(fromPreset(p))}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="hud-edit__row">
          <button type="button" className="btn" disabled={!changed} onClick={() => onLayout(before)}>
            Undo changes
          </button>
          <button type="button" className="btn btn--primary" onClick={onDone}>
            Done
          </button>
        </div>
        {note && (
          <p className="hud-edit__note" role="status">
            {note}
          </p>
        )}

        {chosen && chosenRect ? (
          <section className="hud-edit__chosen">
            <h4>
              {chosen.name}
              <span className={chosen.unity ? 'tag hud-tag--unity' : 'tag hud-tag--new'}>{chosen.unity ? 'In Unity' : 'New'}</span>
            </h4>
            <p className="hud-edit__about">{chosen.about}</p>
            <p className="hud-edit__where">
              {chosen.unity ? `Unity: ${chosen.unity}. ` : 'Not in the game yet. '}
              Block {chosenRect.x}, {chosenRect.y} · {chosenRect.w} × {chosenRect.h} blocks ({chosenRect.w * (REFERENCE.width / COLS)} ×{' '}
              {chosenRect.h * (REFERENCE.width / COLS)} px at 1080p) · {chosen.min.w} × {chosen.min.h} to {chosen.max.w} × {chosen.max.h}
            </p>
            <Options group={chosen.id} values={layout.settings[chosen.id] as Record<string, SettingValue>} onChange={setSetting} />
            <div className="hud-edit__row">
              <button type="button" className="btn" onClick={() => onSelect(null)}>
                Back to the list
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  onLayout(hide(layout, chosen.id))
                  onSelect(null)
                }}
              >
                Turn off
              </button>
            </div>
          </section>
        ) : selected === 'world' ? (
          <section className="hud-edit__chosen">
            <h4>
              In the world <span className="tag hud-tag--unity">In Unity</span>
            </h4>
            <p className="hud-edit__about">
              Not on the grid: the crosshair in the middle, and what follows enemies around (nameplates over their heads, damage numbers).
              Defaults are the game's DEF_Nameplates.
            </p>
            <Options group="world" values={layout.settings.world as Record<string, SettingValue>} onChange={setSetting} />
            <button type="button" className="btn" onClick={() => onSelect(null)}>
              Back to the list
            </button>
          </section>
        ) : (
          <section className="hud-edit__list">
            <label className="hud-edit__check">
              <input type="checkbox" checked={windows} onChange={(e) => setWindows(e.target.checked)} />
              Show the windows' places
            </label>
            {(['unity', 'new'] as const).map((kind) => (
              <div key={kind}>
                <h4 className="hud-edit__group">
                  {kind === 'unity' ? 'In Unity' : 'New, not in the game yet'}
                  {kind === 'unity' && <small> · {UNITY_SNAPSHOT.repo} {UNITY_SNAPSHOT.commit}</small>}
                </h4>
                <ul>
                  {PARTS.filter((p) => (kind === 'unity') === (p.unity !== null)).map((p) => (
                    <li key={p.id}>
                      <input
                        type="checkbox"
                        aria-label={`Show the ${p.name.toLowerCase()}`}
                        checked={isShown(layout, p.id)}
                        onChange={(e) => {
                          const next = e.target.checked ? show(layout, p.id) : hide(layout, p.id)
                          setNote(e.target.checked && next === layout ? `No room for the ${p.name.toLowerCase()} anywhere` : null)
                          onLayout(next)
                        }}
                      />
                      <button type="button" className="hud-edit__pick" onClick={() => onSelect(p.id)}>
                        {p.name}
                        {p.window && <small>window · {p.window.keyboard}</small>}
                        {p.when && <small>{p.when === 'target' ? 'with a target' : p.when === 'encounter' ? 'in a boss fight' : 'near something to use'}</small>}
                      </button>
                    </li>
                  ))}
                  {kind === 'unity' && (
                    <li>
                      <span className="hud-edit__spacer" />
                      <button type="button" className="hud-edit__pick" onClick={() => onSelect('world')}>
                        Nameplates and crosshair
                        <small>not on the grid</small>
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </section>
        )}
      </aside>
    </div>
  )
}

/** One control per option: a checkbox, a row of choices, or a slider. */
function Options({
  group,
  values,
  onChange,
}: {
  group: SettingsGroup
  values: Record<string, SettingValue>
  onChange: (key: string, value: SettingValue) => void
}) {
  return (
    <div className="hud-edit__options">
      {optionsOf(group).map(([key, option]: [string, HudOption]) => {
        const value = values[key]
        if (option.type === 'toggle')
          return (
            <label key={key} className="hud-edit__check">
              <input type="checkbox" checked={value === true} onChange={(e) => onChange(key, e.target.checked)} />
              {option.label}
            </label>
          )
        if (option.type === 'choice')
          return (
            <div key={key} className="hud-edit__choice">
              <span className="hud-edit__caption">{option.label}</span>
              <span className="hud-edit__chips">
                {option.choices.map(([v, label]) => (
                  <button key={v} type="button" className="hud-edit__chip" aria-pressed={value === v} onClick={() => onChange(key, v)}>
                    {label}
                  </button>
                ))}
              </span>
            </div>
          )
        return (
          <label key={key} className="hud-edit__range">
            <span className="hud-edit__caption">
              {option.label}
              <b>
                {String(value)}
                {option.unit && ` ${option.unit}`}
              </b>
            </span>
            <input
              type="range"
              min={option.min}
              max={option.max}
              step={option.step}
              value={Number(value)}
              onChange={(e) => onChange(key, Number(e.target.value))}
            />
          </label>
        )
      })}
    </div>
  )
}
