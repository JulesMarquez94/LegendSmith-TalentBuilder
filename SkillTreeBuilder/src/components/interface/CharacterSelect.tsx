import { useEffect, useId, useRef, useState } from 'react'
import { ArtIcon } from '../ArtIcon.tsx'
import { seatOf } from '../labels.ts'
import { CharacterFigure } from './CharacterFigure.tsx'
import { DeleteDialog } from './DeleteDialog.tsx'
import type { Realm } from './fake.ts'
import type { Mode } from './flow.ts'
import { KeyHints } from './KeyHints.tsx'
import { artifactOf, hasRoom, MAX_CHARACTERS, selectedCharacter, type Roster } from './roster.ts'
import { useNavKeys } from './useNavKeys.ts'

interface Props {
  active: boolean
  roster: Roster
  mode: Mode
  realm: Realm | null
  /** A message from the server on arrival (its check of your offline progress). */
  notice: string | null
  onSelect: (id: string) => void
  onStep: (by: number) => void
  onEnter: () => void
  onCreate: () => void
  onDelete: (id: string) => void
  onBack: () => void
}

/** A map pin, before the zone name. */
const Pin = () => (
  <svg className="ui-pin" viewBox="0 0 12 16" aria-hidden="true">
    <path d="M6,0 C2.7,0 0,2.6 0,5.9 C0,10.3 6,16 6,16 C6,16 12,10.3 12,5.9 C12,2.6 9.3,0 6,0 Z M6,8.2 A2.3,2.3 0 1 1 6,3.6 A2.3,2.3 0 1 1 6,8.2 Z" />
  </svg>
)

/** Your characters, the selected one shown big, and the way into the world. */
export function CharacterSelect(props: Props) {
  const { active, roster, mode, realm, notice, onSelect, onStep, onEnter, onCreate, onDelete, onBack } = props
  const id = useId()
  const [deleting, setDeleting] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const create = useRef<HTMLButtonElement>(null)
  const current = selectedCharacter(roster)
  const empty = roster.characters.length === 0
  const room = hasRoom(roster)

  useEffect(() => {
    if (!active) return
    if (empty) create.current?.focus({ preventScroll: true })
    else list.current?.focus({ preventScroll: true })
  }, [active, empty])

  // A long list scrolls: keep the selected character in sight as the arrows move.
  useEffect(() => {
    if (active) list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active, roster.selected])

  useNavKeys(active, {
    up: () => onStep(-1),
    down: () => onStep(1),
    confirm: () => (current ? onEnter() : room && onCreate()),
    delete: () => current && setDeleting(true),
    back: onBack,
  })

  const artifact = current ? artifactOf(current) : null

  return (
    <section className="ui-screen ui-select" aria-label="Character selection">
      <header className="ui-select__head">
        {mode === 'offline' ? (
          <>
            <span className="tag tag--mode">Offline</span>
            <span className="ui-note">Solo with AI bots · progress saved on this device</span>
          </>
        ) : (
          <>
            <span className="tag tag--mode tag--good">Online</span>
            <span className="ui-note">{realm ? `${realm.name} · ${realm.region} · ${realm.ping} ms` : 'Connected'}</span>
          </>
        )}
        {notice && (
          <span className="ui-notice" role="status">
            {notice}
          </span>
        )}
      </header>

      <div className="ui-select__preview">
        {current && artifact ? (
          <>
            <CharacterFigure appearance={current.appearance} artifact={artifact} className="ui-select__figure" />
            <span className="tag ui-placeholder">Placeholder art</span>
            <div className="ui-plate">
              <h2 className="ui-plate__name">{current.name}</h2>
              <div className="ui-plate__line">
                Level {current.level} · {seatOf(artifact)}
              </div>
              <div className="ui-plate__artifact">
                <ArtIcon label={artifact.name} tint={artifact.color} className="ui-plate__icon" />
                <span className="ui-plate__text">
                  <b>{artifact.name}</b>
                  <small>{artifact.resource}</small>
                </span>
              </div>
              <div className="ui-plate__zone">
                <Pin />
                {current.zone}
              </div>
            </div>
          </>
        ) : (
          <div className="ui-empty">
            <h2 className="ui-heading">No characters yet</h2>
            <p className="ui-note">Create one to step into the world.</p>
          </div>
        )}
      </div>

      <aside className="ui-panel ui-select__side" aria-labelledby={`${id}-list`}>
        <div className="ui-select__side-head">
          <h2 id={`${id}-list`} className="ui-subheading">
            Characters
          </h2>
          <span className="ui-note">
            {roster.characters.length} / {MAX_CHARACTERS}
          </span>
        </div>
        {!empty && (
          <div
            ref={list}
            className="ui-list ui-chars"
            role="listbox"
            tabIndex={0}
            aria-labelledby={`${id}-list`}
            aria-activedescendant={current ? `${id}-${current.id}` : undefined}
          >
            {roster.characters.map((c) => {
              const a = artifactOf(c)
              return (
                <div
                  key={c.id}
                  id={`${id}-${c.id}`}
                  className="ui-char"
                  role="option"
                  aria-selected={c.id === roster.selected}
                  onClick={() => onSelect(c.id)}
                  onDoubleClick={onEnter}
                >
                  <ArtIcon label={a.name} tint={a.color} className="ui-char__icon" />
                  <span className="ui-char__text">
                    <span className="ui-char__name">
                      {c.name}
                      {c.unchecked && (
                        <span
                          className="tag tag--wip"
                          title="Played offline: the server checks this progress the next time you go online."
                        >
                          Not checked
                        </span>
                      )}
                    </span>
                    <span className="ui-char__meta">
                      Level {c.level} · {seatOf(a)}
                    </span>
                    <span className="ui-char__zone">{c.zone}</span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <div className="ui-select__side-actions">
          <button
            ref={create}
            type="button"
            className={empty ? 'btn btn--lg btn--primary' : 'btn btn--lg'}
            disabled={!room}
            title={room ? undefined : `All ${MAX_CHARACTERS} character slots are taken.`}
            onClick={onCreate}
          >
            Create new character
          </button>
          <button type="button" className="btn btn--lg" disabled={!current} onClick={() => setDeleting(true)}>
            Delete character
          </button>
        </div>
      </aside>

      <footer className="ui-footer ui-select__foot">
        <button type="button" className="btn btn--lg" onClick={onBack}>
          {mode === 'online' ? 'Change realm' : 'Back'}
        </button>
        <button type="button" className="btn btn--primary ui-enter" disabled={!current} onClick={onEnter}>
          Enter world
        </button>
        <KeyHints
          hints={[
            ['↑ ↓', 'Choose'],
            ['Enter', current ? 'Enter world' : 'Create'],
            ['Del', 'Delete'],
            ['Esc', 'Back'],
          ]}
        />
      </footer>

      {deleting && current && (
        <DeleteDialog character={current} onDelete={() => onDelete(current.id)} onClose={() => setDeleting(false)} />
      )}
    </section>
  )
}
