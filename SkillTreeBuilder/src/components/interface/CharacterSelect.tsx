import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { seatOf } from '../labels.ts'
import { CampScene } from './CampScene.tsx'
import { CharacterFigure, EmptySeat } from './CharacterFigure.tsx'
import { DeleteDialog } from './DeleteDialog.tsx'
import type { Mode } from './flow.ts'
import { KeyHints } from './KeyHints.tsx'
import { artifactOf, characters, seatForNew, selectedCharacter, SLOT_COUNT, type Roster } from './roster.ts'
import { useNavKeys } from './useNavKeys.ts'

interface Props {
  active: boolean
  roster: Roster
  /** The way to play the arrows have on: offline or online. */
  mode: Mode
  /** The account you logged in with this session, or '' before you've played online. */
  account: string
  onSelect: (slot: number) => void
  onStep: (by: number) => void
  onMode: (mode: Mode) => void
  /** Play the selected character, offline or online. */
  onPlay: (mode: Mode) => void
  onCreate: () => void
  onDelete: (slot: number) => void
  onBack: () => void
}

/** The two ways into the game, as the buttons under the fire show them. */
const WAYS: readonly { mode: Mode; label: string; sub: string }[] = [
  { mode: 'offline', label: 'Play offline', sub: 'Solo, with AI bots' },
  { mode: 'online', label: 'Play online', sub: 'Join an instance with other players' },
]

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
 * The selected one stands up. From here you create a character, or take the selected one into the
 * game: offline (solo with AI bots) or online (an instance with other players).
 */
export function CharacterSelect(props: Props) {
  const { active, roster, mode, account, onSelect, onStep, onMode, onPlay, onCreate, onDelete, onBack } = props
  const id = useId()
  const [deleting, setDeleting] = useState(false)
  const seats = useRef<HTMLDivElement>(null)
  const current = selectedCharacter(roster)
  const canCreate = seatForNew(roster) >= 0
  const other: Mode = mode === 'offline' ? 'online' : 'offline'

  useEffect(() => {
    if (active) seats.current?.focus({ preventScroll: true })
  }, [active])

  // Left and right choose a character, up and down offline or online, Enter goes in (or creates, on an empty seat).
  useNavKeys(active, {
    left: () => onStep(-1),
    right: () => onStep(1),
    up: () => onMode(other),
    down: () => onMode(other),
    confirm: () => (current ? onPlay(mode) : canCreate && onCreate()),
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
                onDoubleClick={() => (c ? onPlay(mode) : onCreate())}
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
        <span className="ui-note">
          {characters(roster).length} of {SLOT_COUNT} character slots
          {account && (
            <>
              {' · '}Logged in as <b>{account}</b>
            </>
          )}
        </span>
        <KeyHints
          hints={[
            ['← →', 'Character'],
            ['↑ ↓', 'Offline / online'],
            ['Enter', current ? 'Play' : 'Create'],
            ['Del', 'Delete'],
            ['Esc', 'Back'],
          ]}
        />
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
                  title="Saved on this device: the server checks this progress the next time you play online."
                >
                  Not synced
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
            <div className="camp__line">Create a character to sit here.</div>
          </>
        )}
      </div>

      <footer className="ui-footer camp__foot">
        <button type="button" className="btn btn--lg camp__back" onClick={onBack}>
          Back
        </button>
        <div className="camp__play" role="group" aria-label="Play">
          {WAYS.map((w) => (
            <button
              key={w.mode}
              type="button"
              className={`camp__way ${w.mode === mode ? 'camp__way--on' : ''}`}
              disabled={!current}
              onClick={() => onPlay(w.mode)}
            >
              <b>{w.label}</b>
              <small>{w.sub}</small>
            </button>
          ))}
        </div>
        <div className="camp__manage">
          <button
            type="button"
            className="btn btn--lg"
            disabled={!canCreate}
            title={canCreate ? undefined : `All ${SLOT_COUNT} character slots are taken: delete one to make room.`}
            onClick={onCreate}
          >
            Create character
          </button>
          <button type="button" className="btn btn--lg" disabled={!current} onClick={() => setDeleting(true)}>
            Delete
          </button>
        </div>
      </footer>

      {deleting && current && (
        <DeleteDialog character={current} onDelete={() => onDelete(roster.selected)} onClose={() => setDeleting(false)} />
      )}
    </section>
  )
}
