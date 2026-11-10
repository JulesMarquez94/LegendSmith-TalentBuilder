import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { seatOf } from '../labels.ts'
import { CampScene } from './CampScene.tsx'
import { CharacterFigure, EmptySeat } from './CharacterFigure.tsx'
import { DeleteDialog } from './DeleteDialog.tsx'
import type { Realm } from './fake.ts'
import type { Mode } from './flow.ts'
import { KeyHints } from './KeyHints.tsx'
import { artifactOf, selectedCharacter, type Roster } from './roster.ts'
import { useNavKeys } from './useNavKeys.ts'

interface Props {
  active: boolean
  roster: Roster
  mode: Mode
  realm: Realm | null
  /** A message from the server on arrival (its check of your offline progress). */
  notice: string | null
  onSelect: (slot: number) => void
  onStep: (by: number) => void
  onEnter: () => void
  onCreate: () => void
  onDelete: (slot: number) => void
  onBack: () => void
}

/**
 * The four seats around the fire, left to right: where each one's feet touch the ground (% of the
 * screen) and how big it is there. The two at the back sit further away, so a little smaller.
 */
const SEATS = [
  { x: 17, y: 67, scale: 1 },
  { x: 35.5, y: 57, scale: 0.86 },
  { x: 64.5, y: 57, scale: 0.86 },
  { x: 83, y: 67, scale: 1 },
] as const

/** A map pin, before the zone name. */
const Pin = () => (
  <svg className="ui-pin" viewBox="0 0 12 16" aria-hidden="true">
    <path d="M6,0 C2.7,0 0,2.6 0,5.9 C0,10.3 6,16 6,16 C6,16 12,10.3 12,5.9 C12,2.6 9.3,0 6,0 Z M6,8.2 A2.3,2.3 0 1 1 6,3.6 A2.3,2.3 0 1 1 6,8.2 Z" />
  </svg>
)

/**
 * Your characters, sitting around a campfire in the woods at night: four seats, some of them empty.
 * The selected one stands up. Enter takes it into the world, or makes a character for an empty seat.
 */
export function CharacterSelect(props: Props) {
  const { active, roster, mode, realm, notice, onSelect, onStep, onEnter, onCreate, onDelete, onBack } = props
  const id = useId()
  const [deleting, setDeleting] = useState(false)
  const seats = useRef<HTMLDivElement>(null)
  const current = selectedCharacter(roster)
  const primary = current ? onEnter : onCreate

  useEffect(() => {
    if (active) seats.current?.focus({ preventScroll: true })
  }, [active])

  useNavKeys(active, {
    left: () => onStep(-1),
    right: () => onStep(1),
    up: () => onStep(-1),
    down: () => onStep(1),
    confirm: primary,
    delete: () => current && setDeleting(true),
    back: onBack,
  })

  const artifact = current ? artifactOf(current) : null

  return (
    <section className="ui-screen camp" aria-label="Character selection">
      <div className="camp__world">
        <CampScene />
        <div
          ref={seats}
          className="camp__seats"
          role="listbox"
          tabIndex={0}
          aria-label="Characters around the fire"
          aria-activedescendant={`${id}-seat-${roster.selected}`}
        >
          {roster.slots.map((c, i) => {
            const chosen = i === roster.selected
            const seat = SEATS[i]
            const a = c ? artifactOf(c) : null
            return (
              <div
                key={c?.id ?? `empty-${i}`}
                id={`${id}-seat-${i}`}
                className={`camp__seat ${c ? '' : 'camp__seat--empty'} camp__seat--${c && chosen ? 'stand' : 'sit'}`}
                style={{ '--x': `${seat.x}%`, '--y': `${seat.y}%`, '--scale': seat.scale } as CSSProperties}
                role="option"
                aria-selected={chosen}
                aria-label={c && a ? `${c.name}, level ${c.level} ${seatOf(a).toLowerCase()}` : 'Empty seat'}
                onClick={() => onSelect(i)}
                onDoubleClick={() => (c ? onEnter() : onCreate())}
              >
                {c && a ? (
                  <CharacterFigure
                    appearance={c.appearance}
                    artifact={a}
                    pose={chosen ? 'stand' : 'sit'}
                    className="camp__figure"
                  />
                ) : (
                  <EmptySeat className="camp__figure" />
                )}
                <span className="camp__tag">
                  <b>{c ? c.name : 'Empty seat'}</b>
                  {c && <small>Level {c.level}</small>}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <header className="camp__head">
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

      <div className="camp__plate" aria-live="polite">
        {current && artifact ? (
          <>
            <h2 className="camp__name">{current.name}</h2>
            <div className="camp__line">
              Level {current.level} · {seatOf(artifact)} · {artifact.name}
              {current.unchecked && (
                <span
                  className="tag tag--wip"
                  title="Played offline: the server checks this progress the next time you go online."
                >
                  Not checked
                </span>
              )}
            </div>
            <div className="ui-plate__zone">
              <Pin />
              {current.zone}
            </div>
          </>
        ) : (
          <>
            <h2 className="camp__name">Empty seat</h2>
            <div className="camp__line">Make a character to sit here.</div>
          </>
        )}
      </div>

      <footer className="ui-footer camp__foot">
        <div className="camp__foot-start">
          <button type="button" className="btn btn--lg" onClick={onBack}>
            {mode === 'online' ? 'Change realm' : 'Back'}
          </button>
          <button type="button" className="btn btn--lg" disabled={!current} onClick={() => setDeleting(true)}>
            Delete
          </button>
        </div>
        <button type="button" className="btn btn--primary ui-enter" onClick={primary}>
          {current ? 'Enter world' : 'Create character'}
        </button>
        <KeyHints
          hints={[
            ['← →', 'Choose'],
            ['Enter', current ? 'Enter world' : 'Create'],
            ['Del', 'Delete'],
            ['Esc', 'Back'],
          ]}
        />
      </footer>

      {deleting && current && (
        <DeleteDialog character={current} onDelete={() => onDelete(roster.selected)} onClose={() => setDeleting(false)} />
      )}
    </section>
  )
}
