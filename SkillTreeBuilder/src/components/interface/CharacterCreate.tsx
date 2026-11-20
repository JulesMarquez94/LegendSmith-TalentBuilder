import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import {
  APPEARANCE_ROWS,
  cycle,
  DEFAULT_APPEARANCE,
  randomAppearance,
  type Appearance,
  type AppearanceKey,
  type AppearanceOption,
} from './appearance.ts'
import { CharacterFigure } from './CharacterFigure.tsx'
import { NAME_IDEAS, SURNAME_IDEAS } from './fake.ts'
import { wrap } from './keys.ts'
import { KeyHints } from './KeyHints.tsx'
import { fullName, hasProblem, NAME_MAX, NAME_MIN, nameProblems, type TakenNames } from './names.ts'
import { RACES, STARTING_POINTS } from './origins.ts'
import type { NewCharacter } from './roster.ts'
import { useNavKeys } from './useNavKeys.ts'

interface Props {
  active: boolean
  /** Full names it can't have: your characters' and other players'. */
  taken: TakenNames
  onCreate: (character: NewCharacter) => void
  onCancel: () => void
}

/** One line of choices: the race, an appearance row, or the starting point. */
interface Row {
  key: 'race' | AppearanceKey | 'origin'
  label: string
  options: readonly AppearanceOption[]
  value: number
  /** Shown beside a choice that has only one option so far. */
  later?: string
}

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

/**
 * Making a character, on one page: race, appearance and starting point, then the name and surname
 * with the Create button under them. A character starts with no artifact, in plain underclothes: it
 * finds one in the game. Race and starting point have one choice each for now.
 */
export function CharacterCreate({ active, taken, onCreate, onCancel }: Props) {
  const id = useId()
  const [raceAt, setRaceAt] = useState(0)
  const [originAt, setOriginAt] = useState(0)
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE)
  const [cursor, setCursor] = useState(0)
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [tried, setTried] = useState(false)
  const choices = useRef<HTMLDivElement>(null)
  const nameField = useRef<HTMLInputElement>(null)
  const surnameField = useRef<HTMLInputElement>(null)
  const race = RACES[raceAt]
  const origin = STARTING_POINTS[originAt]
  const problems = nameProblems(name, surname, taken)
  const shown = fullName(name, surname)

  // Top to bottom, the order the arrows go through them: race and starting point, then appearance.
  const rows: readonly Row[] = [
    { key: 'race', label: 'Race', options: RACES.map((r) => ({ label: r.name })), value: raceAt, later: 'More later' },
    {
      key: 'origin',
      label: 'Starting point',
      options: STARTING_POINTS.map((s) => ({ label: s.name })),
      value: originAt,
      later: 'More later',
    },
    ...APPEARANCE_ROWS.map((r) => ({ key: r.key, label: r.label, options: r.options, value: appearance[r.key] })),
  ]

  useEffect(() => {
    if (active) choices.current?.focus({ preventScroll: true })
  }, [active])

  const change = (row: Row, by: number) => {
    if (row.key === 'race') setRaceAt((i) => wrap(i, by, RACES.length))
    else if (row.key === 'origin') setOriginAt((i) => wrap(i, by, STARTING_POINTS.length))
    else setAppearance((a) => cycle(a, row.key as AppearanceKey, by))
  }
  const choose = (row: Row, index: number) => {
    if (row.key === 'race') setRaceAt(index)
    else if (row.key === 'origin') setOriginAt(index)
    else setAppearance((a) => ({ ...a, [row.key]: index }))
  }

  const create = () => {
    setTried(true)
    if (hasProblem(problems)) {
      // To the first field that needs fixing.
      const field = problems.name ? nameField : surnameField
      field.current?.focus()
      return
    }
    onCreate({ name, surname, race: race.id, origin: origin.id, appearance })
  }

  useNavKeys(active, {
    up: () => setCursor((c) => wrap(c, -1, rows.length)),
    down: () => setCursor((c) => wrap(c, 1, rows.length)),
    left: () => change(rows[cursor], -1),
    right: () => change(rows[cursor], 1),
    // From the choices, Enter goes on to the name; with a good name it creates.
    confirm: () => (hasProblem(problems) ? nameField.current?.focus() : create()),
    back: onCancel,
  })

  const randomName = () => {
    for (let tries = 0; tries < 20; tries++) {
      const n = pick(NAME_IDEAS)
      const s = pick(SURNAME_IDEAS)
      if (!hasProblem(nameProblems(n, s, taken))) {
        setName(n)
        setSurname(s)
        return
      }
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    create()
  }

  const showName = tried || name !== ''
  const showSurname = tried || surname !== ''

  const row = (r: Row, i: number) => {
    const single = r.options.length < 2
    const chosen = r.options[r.value] ?? r.options[0]
    return (
      <div key={r.key} className="ui-look" aria-current={i === cursor ? 'true' : undefined} onClick={() => setCursor(i)}>
        <span className="ui-look__label">{r.label}</span>
        <button
          type="button"
          className="btn ui-look__step"
          aria-label={`Previous ${r.label.toLowerCase()}`}
          disabled={single}
          onClick={() => change(r, -1)}
        >
          ‹
        </button>
        <span className="ui-look__value">
          {chosen.color && (
            <span className="ui-swatches">
              {r.options.map((o, j) => (
                <button
                  key={o.label}
                  type="button"
                  className="ui-swatch"
                  style={{ background: o.color }}
                  aria-label={`${r.label}: ${o.label}`}
                  aria-pressed={r.value === j}
                  onClick={() => choose(r, j)}
                />
              ))}
            </span>
          )}
          <span className="ui-look__name">{chosen.label}</span>
          {single && r.later && <span className="tag">{r.later}</span>}
        </span>
        <button
          type="button"
          className="btn ui-look__step"
          aria-label={`Next ${r.label.toLowerCase()}`}
          disabled={single}
          onClick={() => change(r, 1)}
        >
          ›
        </button>
      </div>
    )
  }

  return (
    <section className="ui-screen ui-create" aria-labelledby={`${id}-title`}>
      <header className="ui-create__head">
        <button type="button" className="btn btn--lg" onClick={onCancel}>
          Back
        </button>
        <h2 id={`${id}-title`} className="ui-heading">
          Create a character
        </h2>
        <KeyHints
          hints={[
            ['↑ ↓', 'Choose'],
            ['← →', 'Change'],
            ['Enter', 'Name, then create'],
            ['Esc', 'Back'],
          ]}
        />
      </header>

      <div className="ui-create__preview">
        <CharacterFigure appearance={appearance} artifact={null} className="ui-create__figure" />
        <span className="tag ui-placeholder">Placeholder art</span>
        <div className="ui-plate ui-plate--small">
          <div className="ui-plate__name">{shown || 'New character'}</div>
          <div className="ui-plate__line">
            {race.name} · Starts in {origin.name} · No artifact: plain underclothes
          </div>
        </div>
      </div>

      <div className="ui-panel ui-create__panel">
        <div
          ref={choices}
          className="ui-looks"
          role="group"
          tabIndex={0}
          aria-label="Race, appearance and starting point: up and down to choose a row, left and right to change it"
        >
          <section className="ui-create__section">
            <h3 className="picker__group-title">Race and starting point</h3>
            {rows.slice(0, 2).map((r, i) => row(r, i))}
            <p className="ui-note ui-create__later">
              One of each for now: orcs and other races, and more starting points, come later.
            </p>
          </section>

          <section className="ui-create__section">
            <div className="ui-create__section-head">
              <h3 className="picker__group-title">Appearance</h3>
              <button type="button" className="btn" onClick={() => setAppearance(randomAppearance())}>
                Randomize
              </button>
            </div>
            {rows.slice(2).map((r, i) => row(r, i + 2))}
          </section>
        </div>

        <form className="ui-create__section ui-name" onSubmit={submit} noValidate>
          <div className="ui-create__section-head">
            <h3 className="picker__group-title">Name</h3>
            <button type="button" className="btn" onClick={randomName}>
              Random name
            </button>
          </div>
          <div className="ui-name__fields">
            <label className="ui-field">
              <span className="ui-field__label">Name</span>
              <input
                ref={nameField}
                className="ui-input ui-input--name"
                value={name}
                maxLength={NAME_MAX * 2}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={showName && problems.name !== null}
                aria-describedby={`${id}-name-error ${id}-rules`}
                onChange={(e) => setName(e.target.value)}
              />
              <span id={`${id}-name-error`} className="ui-error" aria-live="polite">
                {showName && problems.name}
              </span>
            </label>
            <label className="ui-field">
              <span className="ui-field__label">Surname</span>
              <input
                ref={surnameField}
                className="ui-input ui-input--name"
                value={surname}
                maxLength={NAME_MAX * 2}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={showSurname && problems.surname !== null}
                aria-describedby={`${id}-surname-error ${id}-rules`}
                onChange={(e) => setSurname(e.target.value)}
              />
              <span id={`${id}-surname-error`} className="ui-error" aria-live="polite">
                {showSurname && problems.surname}
              </span>
            </label>
          </div>
          <p id={`${id}-rules`} className={problems.full ? 'ui-error' : 'ui-note'} aria-live="polite">
            {problems.full ?? `Each one word of ${NAME_MIN} to ${NAME_MAX} letters. The whole name must be free.`}
          </p>
          <button type="submit" className="btn btn--lg btn--primary ui-create__go">
            Create character
          </button>
        </form>
      </div>
    </section>
  )
}
