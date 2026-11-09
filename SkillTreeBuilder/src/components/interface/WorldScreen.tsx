import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArtIcon } from '../ArtIcon.tsx'
import { seatOf } from '../labels.ts'
import type { Realm } from './fake.ts'
import type { Mode } from './flow.ts'
import { wrap } from './keys.ts'
import { KeyHints } from './KeyHints.tsx'
import { artifactOf, type Character } from './roster.ts'
import { useNavKeys } from './useNavKeys.ts'

interface Props {
  active: boolean
  character: Character
  mode: Mode
  realm: Realm | null
  onLogout: () => void
  onExit: () => void
}

/**
 * Where "Enter world" lands for now: the zone and the character, with the game menu on Esc. The HUD
 * and the world itself come later.
 */
export function WorldScreen({ active, character, mode, realm, onLogout, onExit }: Props) {
  const [menu, setMenu] = useState(false)
  const [cursor, setCursor] = useState(0)
  const items = useRef<(HTMLButtonElement | null)[]>([])
  const open = useRef<HTMLButtonElement>(null)
  const artifact = artifactOf(character)

  const entries: readonly { label: string; act?: () => void }[] = [
    { label: 'Return to game', act: () => setMenu(false) },
    { label: 'Settings' },
    { label: 'Log out', act: onLogout },
    { label: 'Exit to title', act: onExit },
  ]
  // The cursor skips what isn't there yet (Settings).
  const usable = entries.flatMap((e, i) => (e.act ? [i] : []))
  const step = (by: number) => setCursor((c) => usable[wrap(usable.indexOf(c), by, usable.length)])

  useEffect(() => {
    if (!active) return
    if (menu) items.current[cursor]?.focus({ preventScroll: true })
    else open.current?.focus({ preventScroll: true })
  }, [active, menu, cursor])

  useNavKeys(active, {
    back: () => {
      setMenu((m) => !m)
      setCursor(0)
    },
    up: () => menu && step(-1),
    down: () => menu && step(1),
    confirm: () => menu && entries[cursor].act?.(),
  })

  return (
    <section className="ui-screen ui-world" aria-label="In the world" style={{ '--tint': artifact.color } as CSSProperties}>
      <div className="ui-world__who">
        <ArtIcon label={artifact.name} tint={artifact.color} className="ui-world__icon" />
        <span className="ui-world__text">
          <b>{character.name}</b>
          <small>
            Level {character.level} · {seatOf(artifact)}
          </small>
        </span>
      </div>
      <div className="ui-world__where">
        <span className="ui-loading__kicker">{mode === 'online' ? `Online · ${realm?.name ?? ''}` : 'Offline · AI bots'}</span>
        <h2 className="ui-loading__name">{character.zone}</h2>
        <p className="ui-note">Placeholder: the world and the HUD go here.</p>
      </div>
      <div className="ui-footer ui-world__foot">
        <button ref={open} type="button" className="btn btn--lg" onClick={() => setMenu(true)}>
          Game menu
        </button>
        <KeyHints hints={[['Esc', menu ? 'Close menu' : 'Game menu']]} />
      </div>

      {menu && (
        <div className="ui-world__menu" role="dialog" aria-modal="false" aria-label="Game menu">
          <div className="ui-panel ui-gamemenu">
            <h3 className="ui-subheading">Game menu</h3>
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
