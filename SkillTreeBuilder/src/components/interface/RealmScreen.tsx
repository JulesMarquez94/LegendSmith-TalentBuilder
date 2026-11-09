import { useEffect, useId, useRef, useState } from 'react'
import { RECOMMENDED_REALM, REALMS, type Realm } from './fake.ts'
import { wrap } from './keys.ts'
import { KeyHints } from './KeyHints.tsx'
import { useNavKeys } from './useNavKeys.ts'

interface Props {
  active: boolean
  account: string
  /** The realm picked last, which the list starts on. */
  realm: Realm | null
  onPick: (realm: Realm) => void
  onBack: () => void
}

const pingClass = (ping: number) => (ping < 80 ? 'ui-good' : ping < 180 ? 'ui-fair' : 'ui-poor')

/** The realm list: your characters go with you to any of them, so pick the closest. */
export function RealmScreen({ active, account, realm, onPick, onBack }: Props) {
  const id = useId()
  const [cursor, setCursor] = useState(() => Math.max(0, REALMS.indexOf(realm ?? RECOMMENDED_REALM)))
  const list = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (active) list.current?.focus({ preventScroll: true })
  }, [active])
  const step = (by: number) => setCursor((c) => wrap(c, by, REALMS.length))
  useNavKeys(active, { up: () => step(-1), down: () => step(1), confirm: () => onPick(REALMS[cursor]), back: onBack })

  return (
    <section className="ui-screen" aria-labelledby={`${id}-title`}>
      <div className="ui-center">
        <div className="ui-panel ui-realms">
          <h2 id={`${id}-title`} className="ui-heading">
            Choose a realm
          </h2>
          <p className="ui-note">
            Logged in as <b>{account}</b>. Your characters go with you to any realm: pick the one closest to you.
          </p>
          <div className="ui-realms__head" aria-hidden="true">
            <span>Realm</span>
            <span>Region</span>
            <span>Population</span>
            <span>Ping</span>
          </div>
          <div
            ref={list}
            className="ui-list"
            role="listbox"
            tabIndex={0}
            aria-label="Realms"
            aria-activedescendant={`${id}-${REALMS[cursor].id}`}
          >
            {REALMS.map((r, i) => (
              <div
                key={r.id}
                id={`${id}-${r.id}`}
                className="ui-realm"
                role="option"
                aria-selected={i === cursor}
                onClick={() => setCursor(i)}
                onDoubleClick={() => onPick(r)}
              >
                <span className="ui-realm__name">
                  {r.name}
                  {r === RECOMMENDED_REALM && <span className="tag tag--good">Recommended</span>}
                </span>
                <span>{r.region}</span>
                <span className={`ui-pop ui-pop--${r.population.toLowerCase()}`}>{r.population}</span>
                <span className={pingClass(r.ping)}>{r.ping} ms</span>
              </div>
            ))}
          </div>
          <div className="ui-panel__actions">
            <button type="button" className="btn btn--lg" onClick={onBack}>
              Log out
            </button>
            <button type="button" className="btn btn--lg btn--primary" onClick={() => onPick(REALMS[cursor])}>
              Connect to {REALMS[cursor].name}
            </button>
          </div>
        </div>
      </div>
      <div className="ui-footer">
        <KeyHints
          hints={[
            ['↑ ↓', 'Choose'],
            ['Enter', 'Connect'],
            ['Esc', 'Log out'],
          ]}
        />
      </div>
    </section>
  )
}
