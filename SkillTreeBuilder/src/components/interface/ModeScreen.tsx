import { useEffect, useRef, useState } from 'react'
import type { Mode } from './flow.ts'
import { wrap } from './keys.ts'
import { KeyHints } from './KeyHints.tsx'
import { useNavKeys } from './useNavKeys.ts'

interface Props {
  active: boolean
  /** The mode last picked, which the cursor starts on. */
  mode: Mode
  onPick: (mode: Mode) => void
  onBack: () => void
}

const MODES: readonly { id: Mode; title: string; sub: string; points: readonly string[]; action: string }[] = [
  {
    id: 'offline',
    title: 'Offline',
    sub: 'Solo, with AI bots',
    points: [
      'No connection needed',
      'AI bots make up your group',
      'Progress is saved on this device, and the server checks it the next time you go online',
    ],
    action: 'Play offline',
  },
  {
    id: 'online',
    title: 'Online',
    sub: 'The shared world',
    points: ['One world, shared with other players', 'Dungeons and raids together', 'Needs your account and a connection'],
    action: 'Log in',
  },
]

/** One player on a device, or one world with everyone: little icons for the two cards. */
function ModeIcon({ mode }: { mode: Mode }) {
  return (
    <svg className="ui-mode__icon" viewBox="0 0 48 48" aria-hidden="true">
      {mode === 'offline' ? (
        <>
          <rect x={6} y={10} width={36} height={24} rx={3} fill="none" stroke="currentColor" strokeWidth={2.5} />
          <path d="M16,40 L32,40 M24,34 L24,40" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
          <circle cx={24} cy={19} r={4} fill="currentColor" />
          <path d="M16,30 Q24,22 32,30" fill="currentColor" />
        </>
      ) : (
        <>
          <circle cx={24} cy={24} r={17} fill="none" stroke="currentColor" strokeWidth={2.5} />
          <ellipse cx={24} cy={24} rx={7} ry={17} fill="none" stroke="currentColor" strokeWidth={2} />
          <path d="M7,24 L41,24 M10,15 L38,15 M10,33 L38,33" stroke="currentColor" strokeWidth={2} />
        </>
      )}
    </svg>
  )
}

/** Offline (solo with AI bots, saved on the device) or online (the shared world). */
export function ModeScreen({ active, mode, onPick, onBack }: Props) {
  const [cursor, setCursor] = useState(() =>
    Math.max(
      0,
      MODES.findIndex((m) => m.id === mode),
    ),
  )
  const cards = useRef<(HTMLButtonElement | null)[]>([])
  useEffect(() => {
    if (active) cards.current[cursor]?.focus({ preventScroll: true })
  }, [active, cursor])
  const step = (by: number) => setCursor((c) => wrap(c, by, MODES.length))
  useNavKeys(active, {
    left: () => step(-1),
    right: () => step(1),
    up: () => step(-1),
    down: () => step(1),
    confirm: () => onPick(MODES[cursor].id),
    back: onBack,
  })

  return (
    <section className="ui-screen" aria-labelledby="ui-modes-title">
      <div className="ui-center">
        <h2 id="ui-modes-title" className="ui-heading">
          How do you want to play?
        </h2>
        <div className="ui-modes">
          {MODES.map((m, i) => (
            <button
              key={m.id}
              ref={(el) => {
                cards.current[i] = el
              }}
              type="button"
              className="ui-mode"
              aria-current={i === cursor ? 'true' : undefined}
              onFocus={() => setCursor(i)}
              onClick={() => onPick(m.id)}
            >
              <ModeIcon mode={m.id} />
              <span className="ui-mode__title">{m.title}</span>
              <span className="ui-mode__sub">{m.sub}</span>
              <ul className="ui-mode__points">
                {m.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <span className="ui-mode__action">{m.action}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="ui-footer">
        <button type="button" className="btn btn--lg" onClick={onBack}>
          Back
        </button>
        <KeyHints
          hints={[
            ['← →', 'Choose'],
            ['Enter', MODES[cursor].action],
            ['Esc', 'Back'],
          ]}
        />
      </div>
    </section>
  )
}
