import { useEffect, useState } from 'react'
import { CATEGORIES, COLOURS, KNOBS, MECHANICS, type Category, type Mechanic } from './mechanics.ts'

/** Where the recordings live: public/compendium, served under the site's base path. */
const media = (file: string) => `${import.meta.env.BASE_URL}compendium/${file}`

const CHECK_LABEL: Record<Mechanic['check'], string> = {
  pass: 'Checked in the game',
  fail: 'Needs work',
  untested: 'Not checked yet',
}

type Filter = Category | 'All'

/**
 * The ability compendium: every general boss and enemy mechanic built in the game, with a GIF recorded from the Unity project's
 * arena test level, what it asks of the players, what failing does, its numbers, and whether the arena's self-check passed it.
 */
export function CompendiumView({ active }: { active: boolean }) {
  const [filter, setFilter] = useState<Filter>('All')
  const [open, setOpen] = useState<Mechanic | null>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])

  // Nothing loads while another view is showing (the GIFs are heavy).
  if (!active && !open) return null

  const passed = MECHANICS.filter((m) => m.check === 'pass').length
  const lethal = MECHANICS.filter((m) => m.severity === 'lethal').length
  const shown = CATEGORIES.filter((c) => filter === 'All' || c.id === filter)

  return (
    <div className="compendium">
      <header className="compendium__head">
        <div>
          <h1 className="compendium__title">Ability compendium</h1>
          <p className="compendium__intro">
            Every general boss and enemy mechanic built in the game so far, recorded in the Unity project’s arena test level. In the
            game, press the altar in the arena and pick <strong>Ability test</strong>: a trainer casts the chosen mechanic over and
            over. Mechanics made for more players bring stand-in allies when you are alone.
          </p>
        </div>
        <dl className="compendium__stats">
          <div>
            <dt>Mechanics</dt>
            <dd>{MECHANICS.length}</dd>
          </div>
          <div>
            <dt>Red (lethal)</dt>
            <dd>{lethal}</dd>
          </div>
          <div>
            <dt>Checked in the game</dt>
            <dd>
              {passed}/{MECHANICS.length}
            </dd>
          </div>
        </dl>
      </header>

      <section className="compendium__basics" aria-label="How to read a mechanic">
        <div className="compendium__panel">
          <h2 className="compendium__h3">Colours</h2>
          <ul className="legend">
            {COLOURS.map((c) => (
              <li key={c.name} className="legend__item">
                <span className="legend__swatch" style={{ background: c.hex }} aria-hidden="true" />
                <span>
                  <strong>{c.name}.</strong> {c.text}
                </span>
              </li>
            ))}
          </ul>
          <p className="compendium__note">
            Every area has a strong border and a see-through inside; its fill grows from the middle to the border as the time runs out
            (a ring fills from its outside in). A soak has a swirl in its middle.
          </p>
        </div>
        <div className="compendium__panel">
          <h2 className="compendium__h3">How a mechanic is made</h2>
          <p className="compendium__note">One ability, made of zone steps. Each step sets:</p>
          <dl className="knobs">
            {KNOBS.map((k) => (
              <div key={k.name} className="knobs__item">
                <dt>{k.name}</dt>
                <dd>{k.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <nav className="tabs compendium__filter" aria-label="Category">
        {(['All', ...CATEGORIES.map((c) => c.id)] as Filter[]).map((f) => (
          <button key={f} type="button" className="tabs__tab" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f}
            <span className="compendium__count">
              {f === 'All' ? MECHANICS.length : MECHANICS.filter((m) => m.category === f).length}
            </span>
          </button>
        ))}
      </nav>

      {shown.map((category) => (
        <section key={category.id} className="compendium__section" aria-labelledby={`cat-${category.id}`}>
          <h2 id={`cat-${category.id}`} className="compendium__h2">
            {category.id}
          </h2>
          <p className="compendium__blurb">{category.blurb}</p>
          <div className="compendium__grid">
            {MECHANICS.filter((m) => m.category === category.id).map((m) => (
              <MechanicCard key={m.id} mechanic={m} onOpen={() => setOpen(m)} />
            ))}
          </div>
        </section>
      ))}

      {open && <MechanicDialog mechanic={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function Recording({ mechanic, still }: { mechanic: Mechanic; still?: boolean }) {
  const [missing, setMissing] = useState(false)
  if (missing)
    return (
      <div className="recording recording--missing">
        <span>Recording to come</span>
      </div>
    )
  return (
    <img
      className="recording"
      src={media(`${mechanic.id}.${still ? 'jpg' : 'gif'}`)}
      alt={still ? `${mechanic.name} from the player’s view in the game` : `${mechanic.name} playing in the arena`}
      loading="lazy"
      onError={() => setMissing(true)}
    />
  )
}

function Chips({ mechanic }: { mechanic: Mechanic }) {
  return (
    <div className="chips">
      <span className={`chip chip--${mechanic.severity}`}>{mechanic.severity === 'lethal' ? 'Red: kills' : 'Orange: hurts'}</span>
      {mechanic.kinds.map((k) => (
        <span key={k} className="chip">
          {k}
        </span>
      ))}
      {mechanic.players > 1 && <span className="chip">{mechanic.players} players</span>}
    </div>
  )
}

function MechanicCard({ mechanic, onOpen }: { mechanic: Mechanic; onOpen: () => void }) {
  return (
    <article className={`mech mech--${mechanic.severity}`}>
      <button type="button" className="mech__media" onClick={onOpen} aria-label={`Open ${mechanic.name}`}>
        <Recording mechanic={mechanic} />
      </button>
      <div className="mech__body">
        <header className="mech__head">
          <h3 className="mech__name">{mechanic.name}</h3>
          <span className={`check check--${mechanic.check}`} title={mechanic.checkNote ?? CHECK_LABEL[mechanic.check]}>
            {CHECK_LABEL[mechanic.check]}
          </span>
        </header>
        <Chips mechanic={mechanic} />
        <p className="mech__summary">{mechanic.summary}</p>
        <p className="mech__line">
          <span className="mech__label mech__label--do">Do</span> {mechanic.counter}
        </p>
        <p className="mech__line">
          <span className="mech__label mech__label--fail">Fail</span> {mechanic.failure}
        </p>
      </div>
    </article>
  )
}

function MechanicDialog({ mechanic, onClose }: { mechanic: Mechanic; onClose: () => void }) {
  return (
    <div className="mech-dialog" role="dialog" aria-modal="true" aria-label={mechanic.name} onClick={onClose}>
      <div className="mech-dialog__box" onClick={(e) => e.stopPropagation()}>
        <header className="mech-dialog__head">
          <div>
            <p className="mech-dialog__category">{mechanic.category}</p>
            <h2 className="mech-dialog__name">{mechanic.name}</h2>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="mech-dialog__media">
          <figure>
            <Recording mechanic={mechanic} />
            <figcaption>In the arena, from above</figcaption>
          </figure>
          <figure>
            <Recording mechanic={mechanic} still />
            <figcaption>From the player’s view</figcaption>
          </figure>
        </div>
        <div className="mech-dialog__text">
          <Chips mechanic={mechanic} />
          <p className="mech__summary">{mechanic.summary}</p>
          <p className="mech__line">
            <span className="mech__label mech__label--do">Do</span> {mechanic.counter}
          </p>
          <p className="mech__line">
            <span className="mech__label mech__label--fail">Fail</span> {mechanic.failure}
          </p>
          <h3 className="compendium__h3">In the game</h3>
          <ul className="mech-dialog__numbers">
            {mechanic.numbers.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className={`check check--${mechanic.check}`}>
            {CHECK_LABEL[mechanic.check]}
            {mechanic.checkNote ? `: ${mechanic.checkNote}` : ''}
          </p>
        </div>
      </div>
    </div>
  )
}
