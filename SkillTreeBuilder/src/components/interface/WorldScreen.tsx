import { useEffect, useRef, useState } from 'react'
import type { Mode } from './flow.ts'
import { Hud } from './hud/Hud.tsx'
import type { Situation } from './hud/world.ts'
import { wrap } from './keys.ts'
import type { Character } from './roster.ts'
import { useNavKeys } from './useNavKeys.ts'

interface Props {
  active: boolean
  character: Character
  mode: Mode
  /** Out in the zone, or in the mine's boss fight (the strip above the screen switches). */
  situation: Situation
  /** The HUD's edit mode is open. */
  editing: boolean
  onEditing: (editing: boolean) => void
  onLogout: () => void
  onExit: () => void
}

/**
 * In the world: the HUD on its grid over a stand-in for the world, and the game menu on Esc. The menu
 * opens the HUD's edit mode, where each element is moved, sized and set up.
 */
export function WorldScreen({ active, character, mode, situation, editing, onEditing, onLogout, onExit }: Props) {
  const [menu, setMenu] = useState(false)
  const [cursor, setCursor] = useState(0)
  const items = useRef<(HTMLButtonElement | null)[]>([])

  const entries: readonly { label: string; act?: () => void }[] = [
    { label: 'Resume', act: () => setMenu(false) },
    {
      label: 'Edit HUD',
      act: () => {
        setMenu(false)
        onEditing(true)
      },
    },
    { label: 'Settings' },
    { label: 'Log out', act: onLogout },
    { label: 'Exit to title', act: onExit },
  ]
  // The cursor skips what isn't there yet (Settings).
  const usable = entries.flatMap((e, i) => (e.act ? [i] : []))
  const step = (by: number) => setCursor((c) => usable[wrap(usable.indexOf(c), by, usable.length)])

  useEffect(() => {
    if (active && menu) items.current[cursor]?.focus({ preventScroll: true })
  }, [active, menu, cursor])

  // The edit mode takes its own keys (Esc leaves it).
  useNavKeys(active && !editing, {
    back: () => {
      setMenu((m) => !m)
      setCursor(0)
    },
    up: () => menu && step(-1),
    down: () => menu && step(1),
    confirm: () => menu && entries[cursor].act?.(),
  })

  return (
    <section className="ui-screen ui-world" aria-label="In the world">
      <Hud
        running={active}
        active={active && !menu && !editing}
        character={character}
        situation={situation}
        editing={editing}
        onEditDone={() => onEditing(false)}
        onMenu={() => {
          setMenu(true)
          setCursor(0)
        }}
      />

      {menu && (
        <div className="ui-world__menu" role="dialog" aria-modal="false" aria-label="Game menu">
          <div className="ui-panel ui-gamemenu">
            <h3 className="ui-subheading">Game menu</h3>
            <p className="ui-note">{mode === 'online' ? 'Online · in an instance with other players' : 'Offline · AI bots'}</p>
            <div className="ui-menu">
              {entries.map((e, i) => (
                <button
                  key={e.label}
                  ref={(el) => {
                    items.current[i] = el
                  }}
                  type="button"
                  className="ui-menu__item"
                  aria-current={i === cursor ? 'true' : undefined}
                  disabled={!e.act}
                  onFocus={() => setCursor(i)}
                  onClick={e.act}
                >
                  {e.label}
                  {!e.act && <span className="tag">Later</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
