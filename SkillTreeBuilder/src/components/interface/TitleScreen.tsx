import { useEffect, useRef } from 'react'
import { useNavKeys } from './useNavKeys.ts'

interface Props {
  active: boolean
  onStart: () => void
}

/** The game's emblem: an anvil under a spark, in the brand gold. */
function Crest() {
  return (
    <svg className="ui-title__crest" viewBox="0 0 64 52" aria-hidden="true">
      <path d="M44,2 L46,7 L51,9 L46,11 L44,16 L42,11 L37,9 L42,7 Z" fill="currentColor" opacity={0.75} />
      <path d="M16,20 L58,20 L58,28 L16,28 Q8,27 3,22 Q9,20 16,20 Z" fill="currentColor" />
      <path d="M24,28 L50,28 L44,38 L30,38 Z" fill="currentColor" />
      <path d="M22,38 L52,38 L58,48 L16,48 Z" fill="currentColor" />
    </svg>
  )
}

/** What the game opens on: the name, and Start. */
export function TitleScreen({ active, onStart }: Props) {
  const start = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (active) start.current?.focus({ preventScroll: true })
  }, [active])
  useNavKeys(active, { confirm: onStart })

  return (
    <section className="ui-screen ui-title" aria-label="Title screen">
      <div className="ui-title__brand">
        <Crest />
        <h1 className="ui-title__logo">LegendSmith</h1>
      </div>
      <div className="ui-menu">
        <button ref={start} type="button" className="ui-menu__item" aria-current="true" onClick={onStart}>
          Start
        </button>
        <button type="button" className="ui-menu__item" disabled>
          Settings <span className="tag">Later</span>
        </button>
      </div>
      <p className="ui-title__press">Press Enter to start</p>
    </section>
  )
}
