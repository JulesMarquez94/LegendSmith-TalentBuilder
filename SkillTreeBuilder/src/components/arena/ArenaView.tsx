import { useCallback, useEffect, useRef, useState } from 'react'
import type { Kit } from '../../game/resolve.ts'
import { Arena, type ArenaInput } from '../../game/sim/arena.ts'
import { SCENARIOS, type Scenario, type Vec } from '../../game/sim/scenarios.ts'
import { ACTION_SLOTS } from '../../talents/slots.ts'
import type { TreeDef } from '../../talents/types.ts'
import { ActionBar, PartyFrames, PlayerBars } from './ArenaHud.tsx'
import { ArenaMeter } from './ArenaMeter.tsx'
import { drawArena, toYards } from './drawArena.ts'
import { SLOT_KEYS } from './keys.ts'

interface Props {
  kit: Kit
  trees: readonly (TreeDef | null)[]
  /** False while the build view is showing: the fight pauses and stops listening to keys. */
  active: boolean
}

/** The sim runs in fixed steps so it plays the same at any frame rate. */
const STEP = 1 / 60

const SLOT_FOR_CODE: Record<string, number> = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
  Digit5: 4,
  Digit6: 5,
  KeyQ: 2,
  KeyE: 3,
  ShiftLeft: 4,
  ShiftRight: 4,
  KeyF: 5,
}

const MOVE_FOR_CODE: Record<string, Vec> = {
  KeyW: { x: 0, y: -1 },
  ArrowUp: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
}

const TEXT_INPUTS = new Set(['text', 'search', 'email', 'number', 'password', 'tel', 'url'])

/**
 * Only text fields keep keys to themselves. The fight dropdown, slider, checkbox and buttons don't,
 * so the game still gets W A S D after you've used them (and the dropdown can't swallow a D for "Dungeon").
 * A focused slider keeps its arrow keys.
 */
const keepsKey = (e: KeyboardEvent) => {
  const t = e.target
  if (!(t instanceof HTMLElement)) return false
  if (t.isContentEditable || t.tagName === 'TEXTAREA') return true
  if (!(t instanceof HTMLInputElement)) return false
  return TEXT_INPUTS.has(t.type) || (t.type === 'range' && e.code.startsWith('Arrow'))
}

/** Healers start on the practice party; damage dealers on the target dummies. */
const defaultFight = (role: Kit['role']): Scenario =>
  SCENARIOS.find((s) => s.id === (role === 'healer' ? 'practice' : 'dummies')) ?? SCENARIOS[0]

const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

/** A playable test fight for the current build. Gear and talent changes apply live, mid-fight. */
export function ArenaView({ kit, trees, active }: Props) {
  const [damageScale, setDamageScale] = useState(1)
  const [noDeaths, setNoDeaths] = useState<boolean | null>(null)
  const [paused, setPaused] = useState(true)
  const [, setFrame] = useState(0)
  // Build, slider and checkbox changes go into the running fight; only a new fight or a restart replaces it.
  const [arena, setArena] = useState(() => new Arena(kit, defaultFight(kit.role), { damageScale: 1, seed: 1 }))
  // Picking a weapon of another role brings up that role's practice fight.
  const [role, setRole] = useState(kit.role)
  if (kit.role !== role) {
    setRole(kit.role)
    setArena(new Arena(kit, defaultFight(kit.role), { damageScale, seed: arena.options.seed + 1 }))
    setNoDeaths(null)
    setPaused(true)
  }
  const scenario = arena.scenario
  const canvas = useRef<HTMLCanvasElement>(null)
  const pausedRef = useRef(paused)
  const activeRef = useRef(active)
  const keys = useRef(new Set<string>())
  const held = useRef(new Set<number>())
  const aim = useRef<Vec | null>(null)

  // Leaving the arena pauses the fight; coming back shows it paused, with the new build already in.
  if (!active && !paused) setPaused(true)

  useEffect(() => {
    pausedRef.current = paused
    activeRef.current = active
  }, [paused, active])
  useEffect(() => arena.setKit(kit), [arena, kit])
  useEffect(() => arena.setOptions({ damageScale, noDeaths: noDeaths ?? scenario.noDeaths }), [arena, damageScale, noDeaths, scenario])

  // After using a control, hand the keyboard back to the arena so Space and the ability keys go to the game.
  const focusArena = () => canvas.current?.focus({ preventScroll: true })

  const newFight = (next = scenario, deaths = noDeaths) => {
    setArena(new Arena(kit, next, { damageScale, noDeaths: deaths ?? next.noDeaths, seed: Date.now() >>> 0 }))
    setPaused(true)
    focusArena()
  }

  const input = (): ArenaInput => {
    const move = { x: 0, y: 0 }
    for (const code of keys.current) {
      const m = MOVE_FOR_CODE[code]
      if (m) {
        move.x += m.x
        move.y += m.y
      }
    }
    return { move, aim: aim.current, held: held.current }
  }

  // The loop: fixed sim steps, a canvas draw every frame, and the React panels about 20 times a second.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let carry = 0
    let frames = 0
    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000)
      last = now
      if (!pausedRef.current && !arena.ended) {
        carry += dt
        while (carry >= STEP) {
          arena.step(STEP, input())
          carry -= STEP
        }
      }
      // Nothing to draw or re-render while the build view is showing.
      if (activeRef.current) {
        if (canvas.current) drawArena(canvas.current, arena, aim.current)
        if (++frames % 3 === 0) setFrame((f) => f + 1)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [arena])

  const trigger = useCallback(
    (slot: number) => {
      if (pausedRef.current) setPaused(false)
      arena.press(slot)
    },
    [arena],
  )

  useEffect(() => {
    if (!active) return
    const down = (e: KeyboardEvent) => {
      if (keepsKey(e) || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.code === 'Space' || e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault()
        if (!arena.ended) setPaused((p) => !p)
        return
      }
      if (MOVE_FOR_CODE[e.code]) {
        e.preventDefault()
        keys.current.add(e.code)
        return
      }
      const slot = SLOT_FOR_CODE[e.code]
      if (slot === undefined) return
      e.preventDefault()
      if (e.repeat) return
      held.current.add(slot)
      trigger(slot)
    }
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.code)
      const slot = SLOT_FOR_CODE[e.code]
      if (slot !== undefined) held.current.delete(slot)
    }
    const clear = () => {
      keys.current.clear()
      held.current.clear()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      clear()
    }
  }, [arena, trigger, active])

  const restart = () => newFight()

  const boss = arena.boss
  const notice = arena.notice && arena.time - arena.notice.t < 1.6 ? arena.notice.text : null

  return (
    <div className="arena">
      <div className="arena__controls">
        <label className="field">
          <span>Fight</span>
          <select
            value={scenario.id}
            onChange={(e) => {
              setNoDeaths(null)
              newFight(SCENARIOS.find((s) => s.id === e.target.value) ?? SCENARIOS[0], null)
            }}
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--range">
          <span>Boss damage ×{damageScale.toFixed(2).replace(/\.?0+$/, '')}</span>
          <input
            type="range"
            min={0.25}
            max={2}
            step={0.05}
            value={damageScale}
            onChange={(e) => setDamageScale(Number(e.target.value))}
            onPointerUp={focusArena}
          />
        </label>
        <label className="field field--check">
          <input
            type="checkbox"
            checked={noDeaths ?? scenario.noDeaths}
            onChange={(e) => {
              setNoDeaths(e.target.checked)
              focusArena()
            }}
          />
          <span>Nobody dies</span>
        </label>
        <span className="arena__spacer" />
        <button
          type="button"
          className="btn btn--lg"
          disabled={arena.ended !== null}
          onClick={() => {
            setPaused((p) => !p)
            focusArena()
          }}
        >
          {paused ? (arena.time > 0 ? 'Resume' : 'Start') : 'Pause'}
        </button>
        <button type="button" className="btn btn--lg" onClick={restart}>
          Restart
        </button>
      </div>
      <p className="arena__about">{scenario.description}</p>

      <div className="arena__main">
        <div className="arena__stage">
          <div className="arena__boss">
            <span className="arena__boss-name">{boss.name}</span>
            {Number.isFinite(boss.maxHp) ? (
              <div className="bar arena__boss-bar">
                <div className="bar__fill" style={{ width: `${(boss.hp / boss.maxHp) * 100}%`, background: '#c0432f' }} />
                <span className="bar__text">{((boss.hp / boss.maxHp) * 100).toFixed(1)}%</span>
              </div>
            ) : (
              <span className="arena__boss-note">Training dummy: never dies</span>
            )}
            <span className="arena__clock">{clock(arena.time)}</span>
          </div>

          <div className="arena__canvas-wrap">
            <canvas
              ref={canvas}
              className="arena__canvas"
              tabIndex={0}
              aria-label="Arena. Move with W A S D, attack with left click, heal with right click, Q and E."
              onContextMenu={(e) => e.preventDefault()}
              onPointerMove={(e) => (aim.current = toYards(e.currentTarget, e.clientX, e.clientY))}
              onPointerLeave={() => {
                aim.current = null
                held.current.delete(0)
                held.current.delete(1)
              }}
              onPointerDown={(e) => {
                if (e.button !== 0 && e.button !== 2) return
                // Stops text selection, which also stops the browser moving focus here, so do that by hand.
                e.preventDefault()
                e.currentTarget.focus({ preventScroll: true })
                aim.current = toYards(e.currentTarget, e.clientX, e.clientY)
                // The click that starts a paused fight only starts it.
                if (pausedRef.current && !arena.ended) {
                  setPaused(false)
                  return
                }
                const slot = e.button === 0 ? 0 : 1
                held.current.add(slot)
                trigger(slot)
              }}
              onPointerUp={(e) => held.current.delete(e.button === 0 ? 0 : 1)}
            />
            {notice && <div className="arena__notice">{notice}</div>}
            {(paused || arena.ended) && (
              <div className="arena__overlay">
                {arena.ended ? (
                  <>
                    <strong>{arena.ended === 'victory' ? `Victory in ${clock(arena.time)}` : `Wipe at ${clock(arena.time)}`}</strong>
                    <button type="button" className="btn btn--lg" onClick={restart}>
                      Fight again
                    </button>
                  </>
                ) : (
                  <>
                    <strong>{arena.time > 0 ? 'Paused' : 'Ready'}</strong>
                    <span>Click the arena or press an ability key to {arena.time > 0 ? 'resume' : 'start'}.</span>
                  </>
                )}
              </div>
            )}
          </div>

          <PlayerBars arena={arena} />
          <ActionBar arena={arena} trees={trees.slice(0, ACTION_SLOTS)} onUse={trigger} />
          <p className="arena__keys">
            Move with W A S D. {SLOT_KEYS.map((k, i) => `${k} · slot ${i + 1}`).join('   ')}. Number keys 1–6 work too;
            hold a key to keep casting. Space pauses.
          </p>
        </div>

        <div className="arena__side">
          <PartyFrames arena={arena} />
          <ArenaMeter arena={arena} />
          <ol className="log" aria-label="Combat log">
            {arena.log.slice(-10).map((line, i) => (
              <li key={`${line.t}-${i}`} className={`log__line log__line--${line.kind}`}>
                <time>{clock(line.t)}</time> {line.text}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
