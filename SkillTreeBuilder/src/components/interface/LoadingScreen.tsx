import { useState, type CSSProperties } from 'react'
import { seatOf } from '../labels.ts'
import { TIPS, type Realm } from './fake.ts'
import type { Mode } from './flow.ts'
import { artifactOf, type Character } from './roster.ts'

interface Props {
  character: Character
  mode: Mode
  realm: Realm | null
  onDone: () => void
}

/** The loading screen on the way into the world: the zone, a tip, and a bar that fills (a CSS animation). */
export function LoadingScreen({ character, mode, realm, onDone }: Props) {
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)])
  const artifact = artifactOf(character)

  return (
    <section
      className="ui-screen ui-loading"
      aria-label="Loading"
      aria-busy="true"
      style={{ '--tint': artifact.color } as CSSProperties}
    >
      <div className="ui-loading__zone">
        <span className="ui-loading__kicker">
          {mode === 'online' ? `Joining ${realm?.name ?? 'the realm'}` : 'Starting your world, with AI bots'}
        </span>
        <h2 className="ui-loading__name">{character.zone}</h2>
        <span className="ui-note">
          {character.name} · Level {character.level} {seatOf(artifact).toLowerCase()}
        </span>
      </div>
      <div className="ui-loading__foot">
        <p className="ui-loading__tip">
          <b>Tip</b> {tip}
        </p>
        <div className="bar ui-loading__bar" role="progressbar" aria-label="Loading the world">
          <div className="bar__fill ui-loading__fill" onAnimationEnd={onDone} />
        </div>
      </div>
    </section>
  )
}
