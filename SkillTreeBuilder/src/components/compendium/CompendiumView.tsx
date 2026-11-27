import { useEffect, useState, type ReactNode } from 'react'
import { CodeSample } from './CodeSample.tsx'
import { CATEGORIES, KNOBS, MECHANICS, type Category, type Mechanic } from './mechanics.ts'
import {
  builtEntries,
  CODE_BY_ID,
  CODES,
  FAMILIES,
  TEMPLATE_OF,
  TEMPLATE_RULES,
  TEMPLATES,
  type Code,
  type CodeId,
  type CodeState,
  type Family,
  type Template,
} from './templates.ts'

/** Where the recordings live: public/compendium, served under the site's base path. */
const media = (file: string) => `${import.meta.env.BASE_URL}compendium/${file}`

const CHECK_LABEL: Record<Mechanic['check'], string> = {
  pass: 'Checked in the game',
  fail: 'Needs work',
  untested: 'Not checked yet',
}

const STATE_LABEL: Record<CodeState, string> = {
  game: 'In the game',
  new: 'New',
  proposal: 'Proposal',
}

type Filter = Category | 'All'
type FamilyFilter = Family | 'All'

/** The compendium's three pages: the mechanics built in the game, the visual codes, and the standard templates. */
type Page = 'mechanics' | 'codes' | 'templates'

const PAGES: { id: Page; label: string; count: number }[] = [
  { id: 'mechanics', label: 'Mechanics', count: MECHANICS.length },
  { id: 'codes', label: 'Codes', count: CODES.length },
  { id: 'templates', label: 'Templates', count: TEMPLATES.length },
]

/** Ways to step from one page to an entry on another. */
interface Links {
  toTemplate: (id: string) => void
  toMechanic: (mechanic: Mechanic) => void
  toCode: (id: CodeId) => void
}

/**
 * The ability compendium: every general boss and enemy mechanic built in the game, with a GIF recorded from the Unity project's
 * arena test level, what it asks of the players, what failing does, its numbers, and whether the arena's self-check passed it.
 * Beside them, the game's visual codes and the standard templates every mechanic is filed under.
 */
export function CompendiumView({ active }: { active: boolean }) {
  const [page, setPage] = useState<Page>('mechanics')
  const [filter, setFilter] = useState<Filter>('All')
  const [family, setFamily] = useState<FamilyFilter>('All')
  const [open, setOpen] = useState<Mechanic | null>(null)
  // The entry to bring into view after a step between pages (a new object each time, so the same one can be shown again).
  const [jump, setJump] = useState<{ id: string } | null>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])

  useEffect(() => {
    if (!jump) return
    const target = document.getElementById(jump.id)
    if (!target) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' })
    target.focus({ preventScroll: true })
    if (!still)
      target.animate([{ outlineColor: 'rgba(231, 183, 37, 1)' }, { outlineColor: 'rgba(231, 183, 37, 0)' }], {
        duration: 1800,
        easing: 'ease-in',
      })
  }, [jump])

  // Nothing loads while another view is showing (the GIFs are heavy).
  if (!active && !open) return null

  const links: Links = {
    toTemplate: (id) => {
      setOpen(null)
      setFamily('All')
      setPage('templates')
      setJump({ id: `tpl-${id}` })
    },
    toMechanic: (mechanic) => {
      setFilter('All')
      setPage('mechanics')
      setJump({ id: `mech-${mechanic.id}` })
    },
    toCode: (id) => {
      setPage('codes')
      setJump({ id: `code-${id}` })
    },
  }

  return (
    <div className="compendium">
      <header className="compendium__top">
        <h1 className="compendium__title">Ability compendium</h1>
        <nav className="tabs compendium__pages" aria-label="Compendium page">
          {PAGES.map((p) => (
            <button key={p.id} type="button" className="tabs__tab" aria-pressed={page === p.id} onClick={() => setPage(p.id)}>
              {p.label}
              <span className="compendium__count">{p.count}</span>
            </button>
          ))}
        </nav>
      </header>

      {page === 'mechanics' && <MechanicsPage filter={filter} onFilter={setFilter} onOpen={setOpen} links={links} />}
      {page === 'codes' && <CodesPage />}
      {page === 'templates' && <TemplatesPage family={family} onFamily={setFamily} links={links} />}

      {open && <MechanicDialog mechanic={open} onClose={() => setOpen(null)} links={links} />}
    </div>
  )
}

function PageHead({ children, stats }: { children: ReactNode; stats: [string, ReactNode][] }) {
  return (
    <header className="compendium__head">
      <div className="compendium__intro">{children}</div>
      <dl className="compendium__stats">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </header>
  )
}

// ---------- Mechanics ----------

function MechanicsPage({
  filter,
  onFilter,
  onOpen,
  links,
}: {
  filter: Filter
  onFilter: (filter: Filter) => void
  onOpen: (mechanic: Mechanic) => void
  links: Links
}) {
  const passed = MECHANICS.filter((m) => m.check === 'pass').length
  const lethal = MECHANICS.filter((m) => m.severity === 'lethal').length
  const shown = CATEGORIES.filter((c) => filter === 'All' || c.id === filter)

  return (
    <>
      <PageHead
        stats={[
          ['Mechanics', MECHANICS.length],
          ['Red (lethal)', lethal],
          ['Checked in the game', `${passed}/${MECHANICS.length}`],
        ]}
      >
        <p>
          Every general boss and enemy mechanic built in the game so far, recorded in the Unity project’s arena test level. In the
          game, press the altar in the arena and pick <strong>Ability test</strong>: a trainer casts the chosen mechanic over and over,
          gathering the spell in its hands while the area fills and letting it go as it lands. Mechanics made for more players bring
          stand-in allies when you are alone. Every sound slot is wired but stays silent until a real recording is chosen for it.
        </p>
        <p>
          Each mechanic is filed under its <strong>template</strong>. The <strong>Codes</strong> page says what every colour and mark
          on the ground means.
        </p>
      </PageHead>

      <section className="compendium__panel" aria-label="How a mechanic is made">
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
      </section>

      <nav className="tabs compendium__filter" aria-label="Category">
        {(['All', ...CATEGORIES.map((c) => c.id)] as Filter[]).map((f) => (
          <button key={f} type="button" className="tabs__tab" aria-pressed={filter === f} onClick={() => onFilter(f)}>
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
              <MechanicCard key={m.id} mechanic={m} onOpen={() => onOpen(m)} links={links} />
            ))}
          </div>
        </section>
      ))}
    </>
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

/** The template a mechanic is filed under, as a link to it. */
function TemplateBadge({ mechanic, links }: { mechanic: Mechanic; links: Links }) {
  const template = TEMPLATE_OF.get(mechanic.id)
  if (!template) return null
  return (
    <button type="button" className="tpl-badge" onClick={() => links.toTemplate(template.id)}>
      Template: <strong>{template.name}</strong>
    </button>
  )
}

function MechanicCard({ mechanic, onOpen, links }: { mechanic: Mechanic; onOpen: () => void; links: Links }) {
  return (
    <article id={`mech-${mechanic.id}`} className={`mech mech--${mechanic.severity}`} tabIndex={-1}>
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
        <TemplateBadge mechanic={mechanic} links={links} />
      </div>
    </article>
  )
}

function MechanicDialog({ mechanic, onClose, links }: { mechanic: Mechanic; onClose: () => void; links: Links }) {
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
          <TemplateBadge mechanic={mechanic} links={links} />
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

// ---------- Codes ----------

function CodesPage() {
  const count = (state: CodeState) => CODES.filter((c) => c.state === state).length
  return (
    <>
      <PageHead
        stats={[
          ['In the game', count('game')],
          ['New', count('new')],
          ['Proposed', count('proposal')],
        ]}
      >
        <p>
          The game’s visual codes: what each colour and mark on the ground tells the players. Every area has a strong border and a
          see-through inside. Its fill grows from the middle to the border as the time runs out (a ring fills from its outside in). A
          soak has a swirl in its middle.
        </p>
        <p>The drawings below are samples, not recordings. Codes still proposed for the boss designs are marked as proposals.</p>
      </PageHead>

      <div className="codes">
        {CODES.map((c) => (
          <CodeCard key={c.id} code={c} />
        ))}
      </div>
    </>
  )
}

function CodeCard({ code }: { code: Code }) {
  // The full status, where it says more than the badge ("New: Jules's rule, 27 Nov 2026" → "Jules's rule, 27 Nov 2026").
  const detail = code.status.replace(/^New:\s*/, '')
  return (
    <article id={`code-${code.id}`} className={`code code--${code.state}`} tabIndex={-1}>
      <div className="code__sample">
        <CodeSample code={code} />
      </div>
      <div className="code__body">
        <header className="code__head">
          <h3 className="mech__name">{code.name}</h3>
          <span className={`code__state code__state--${code.state}`}>{STATE_LABEL[code.state]}</span>
        </header>
        {detail !== STATE_LABEL[code.state] && <p className="code__status">{detail}</p>}
        <p className="mech__summary">{code.look}</p>
        <p className="mech__line">
          <span className="mech__label code__label">Means</span> {code.means}
        </p>
      </div>
    </article>
  )
}

// ---------- Templates ----------

function TemplatesPage({ family, onFamily, links }: { family: FamilyFilter; onFamily: (family: FamilyFilter) => void; links: Links }) {
  const shown = FAMILIES.filter((f) => family === 'All' || f.id === family)
  const proposed = TEMPLATES.reduce((n, t) => n + t.proposed.length, 0)
  const built = TEMPLATES.filter((t) => t.built.length > 0).length

  return (
    <>
      <PageHead
        stats={[
          ['Templates', TEMPLATES.length],
          ['Built in the game', `${built}/${TEMPLATES.length}`],
          ['Proposed boss abilities', proposed],
        ]}
      >
        <p>{TEMPLATE_RULES.templates}</p>
        <p>{TEMPLATE_RULES.reticle}</p>
        <p>
          Under each template, <strong>Built in the arena</strong> links to the recorded mechanics. The boss abilities and frame
          events are proposed for the boss designs, not built yet.
        </p>
      </PageHead>

      <nav className="tabs compendium__filter" aria-label="Family">
        {(['All', ...FAMILIES.map((f) => f.id)] as FamilyFilter[]).map((f) => (
          <button key={f} type="button" className="tabs__tab" aria-pressed={family === f} onClick={() => onFamily(f)}>
            {f === 'All' ? 'All' : FAMILIES.find((x) => x.id === f)?.label}
            <span className="compendium__count">
              {f === 'All' ? TEMPLATES.length : TEMPLATES.filter((t) => t.family === f).length}
            </span>
          </button>
        ))}
      </nav>

      {shown.map((f) => (
        <section key={f.id} className="compendium__section" aria-labelledby={`family-${f.id}`}>
          <h2 id={`family-${f.id}`} className="compendium__h2">
            {f.label}
          </h2>
          <p className="compendium__blurb">{f.who}</p>
          <div className="compendium__grid compendium__grid--templates">
            {TEMPLATES.filter((t) => t.family === f.id).map((t) => (
              <TemplateCard key={t.id} template={t} links={links} />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

function TemplateCard({ template, links }: { template: Template; links: Links }) {
  const built = builtEntries(template)
  return (
    <article id={`tpl-${template.id}`} className="tpl" tabIndex={-1}>
      <header className="mech__head">
        <h3 className="mech__name">{template.name}</h3>
        <span className="tag">{template.id}</span>
      </header>

      {template.codes.length > 0 && (
        <ul className="tpl__codes" aria-label="Codes">
          {template.codes.map((id) => {
            const code = CODE_BY_ID.get(id)
            if (!code) return null
            return (
              <li key={id}>
                <button type="button" className={`code-chip code-chip--${code.state}`} onClick={() => links.toCode(id)}>
                  <CodeSample code={code} size={18} ground={false} />
                  {code.name}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mech__summary">{template.what}</p>

      <div className="tpl__part">
        <h4 className="tpl__h4">Knobs</h4>
        <ul className="tpl__knobs">
          {template.knobs.map((k) => (
            <li key={k}>{k}</li>
          ))}
        </ul>
      </div>
      <p className="mech__line">
        <span className="mech__label tpl__label">Skins</span> {template.skins}
      </p>
      <p className="mech__line">
        <span className="mech__label mech__label--do">Do</span> {template.counter}
      </p>

      <div className="tpl__part">
        <h4 className="tpl__h4">Built in the arena</h4>
        {built.length === 0 ? (
          <p className="tpl__none">Not built yet.</p>
        ) : (
          <ul className="tpl__built">
            {built.map((entry) => (
              <li key={entry.name} className={entry.kind === 'mechanic' ? undefined : 'tpl__built-text'}>
                {entry.kind === 'mechanic' && (
                  <button type="button" className="tpl-built" onClick={() => links.toMechanic(entry.mechanic)}>
                    <span className="tpl-built__thumb">
                      <Recording mechanic={entry.mechanic} />
                    </span>
                    <span className="tpl-built__name">{entry.name}</span>
                  </button>
                )}
                {entry.kind === 'elsewhere' && (
                  <>
                    <button type="button" className="tpl-link" onClick={() => links.toMechanic(entry.mechanic)}>
                      {entry.name}
                    </button>
                    , filed under{' '}
                    <button type="button" className="tpl-link" onClick={() => links.toTemplate(entry.home.id)}>
                      {entry.home.name}
                    </button>
                  </>
                )}
                {entry.kind === 'other' && (
                  <>
                    {entry.name} <span className="tpl__muted">· not in the compendium yet</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="tpl__part tpl__part--proposed">
        <h4 className="tpl__h4">
          Proposed boss abilities <span className="tag">Not built yet</span>
        </h4>
        {template.proposed.length > 0 ? (
          <ul className="tpl__proposed">
            {template.proposed.map((use) => (
              <li key={`${use.boss}-${use.ability}`}>
                <strong>{use.ability}</strong> <span className="tpl__boss">· {use.boss}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tpl__none">{template.events.length > 0 ? 'No boss ability yet.' : 'Not in the boss designs yet.'}</p>
        )}
        {template.events.length > 0 && (
          <p className="tpl__events">
            <span className="tpl__events-label">Used by boss frames:</span>{' '}
            {template.events.map((e, i) => (
              <span key={`${e.frame}-${e.event}`}>
                {i > 0 && '; '}
                <strong>{e.event}</strong> <span className="tpl__boss">· {e.boss}</span>
              </span>
            ))}
          </p>
        )}
      </div>
    </article>
  )
}
