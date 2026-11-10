import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import type { ArtifactDef } from '../../talents/types.ts'
import { ARTIFACTS, STARTING_LOADOUT } from '../../trees/index.ts'
import { ArtIcon } from '../ArtIcon.tsx'
import { SEATS, seatOf } from '../labels.ts'
import {
  APPEARANCE_ROWS,
  cycle,
  DEFAULT_APPEARANCE,
  describeAppearance,
  optionOf,
  randomAppearance,
  type Appearance,
  type AppearanceKey,
} from './appearance.ts'
import { CharacterFigure } from './CharacterFigure.tsx'
import { NAME_IDEAS, STARTING_ZONE, type Realm } from './fake.ts'
import type { Mode } from './flow.ts'
import { wrap } from './keys.ts'
import { KeyHints } from './KeyHints.tsx'
import { formatName, NAME_MAX, NAME_MIN, nameProblem, type TakenNames } from './names.ts'
import { useNavKeys } from './useNavKeys.ts'

export interface NewCharacter {
  name: string
  artifact: string
  appearance: Appearance
}

interface Props {
  active: boolean
  mode: Mode
  realm: Realm | null
  /** Names it can't have: your characters' and, online, other players'. */
  taken: TakenNames
  onCreate: (character: NewCharacter) => void
  onCancel: () => void
}

const STEPS = ['Appearance', 'Artifact', 'Name', 'Confirm'] as const

/** Artifacts by seat, two to a row like the builder's picker: tanks, healers, melee, then ranged damage. */
const BY_SEAT: readonly ArtifactDef[] = [...ARTIFACTS].sort((a, b) => SEATS.indexOf(seatOf(a)) - SEATS.indexOf(seatOf(b)))
const ROW = 2

/** Steps through the new character: appearance, starting artifact, name, then a last look before creating it. */
export function CharacterCreate({ active, mode, realm, taken, onCreate, onCancel }: Props) {
  const id = useId()
  const [step, setStep] = useState(0)
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE)
  const [row, setRow] = useState(0)
  // The builder's starting artifact comes first here too.
  const [artifactAt, setArtifactAt] = useState(() =>
    Math.max(
      0,
      BY_SEAT.findIndex((a) => a.id === STARTING_LOADOUT.artifact),
    ),
  )
  const [name, setName] = useState('')
  const [triedName, setTriedName] = useState(false)
  const focusTarget = useRef<HTMLElement | null>(null)
  const artifact = BY_SEAT[artifactAt]
  const problem = nameProblem(name, taken)
  const shown = formatName(name)

  // Each step puts the keyboard where its choices are.
  useEffect(() => {
    if (active) focusTarget.current?.focus({ preventScroll: true })
  }, [active, step])
  // On a short screen the artifact list scrolls: keep the chosen one in sight.
  useEffect(() => {
    if (active && step === 1) focusTarget.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active, step, artifactAt])
  const focusHere = (el: HTMLElement | null) => {
    focusTarget.current = el
  }

  // A step is done once everything before it is: only the name can hold you back.
  const reachable = (s: number) => s <= 2 || problem === null
  const next = () => {
    if (step === 2 && problem) {
      setTriedName(true)
      return
    }
    if (step === STEPS.length - 1) onCreate({ name: shown, artifact: artifact.id, appearance })
    else setStep(step + 1)
  }
  const back = () => (step === 0 ? onCancel() : setStep(step - 1))
  const change = (key: AppearanceKey, by: number) => setAppearance((a) => cycle(a, key, by))
  const moveArtifact = (by: number) => setArtifactAt((i) => wrap(i, by, BY_SEAT.length))

  useNavKeys(active, {
    up: () => (step === 0 ? setRow((r) => wrap(r, -1, APPEARANCE_ROWS.length)) : step === 1 ? moveArtifact(-ROW) : undefined),
    down: () => (step === 0 ? setRow((r) => wrap(r, 1, APPEARANCE_ROWS.length)) : step === 1 ? moveArtifact(ROW) : undefined),
    left: () => (step === 0 ? change(APPEARANCE_ROWS[row].key, -1) : step === 1 ? moveArtifact(-1) : undefined),
    right: () => (step === 0 ? change(APPEARANCE_ROWS[row].key, 1) : step === 1 ? moveArtifact(1) : undefined),
    confirm: next,
    back,
  })

  const randomName = () => {
    const free = NAME_IDEAS.filter((n) => nameProblem(n, taken) === null)
    if (free.length > 0) setName(free[Math.floor(Math.random() * free.length)])
  }

  const submitName = (e: FormEvent) => {
    e.preventDefault()
    next()
  }

  const where =
    mode === 'offline'
      ? 'On this device. The server checks it the next time you go online.'
      : `On your account, playing on ${realm?.name ?? 'your realm'}.`

  return (
    <section className="ui-screen ui-create" aria-labelledby={`${id}-title`}>
      <header className="ui-create__head">
        <h2 id={`${id}-title`} className="ui-heading">
          Create a character
        </h2>
        <ol className="ui-steps">
          {STEPS.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                className="ui-steps__step"
                aria-current={i === step ? 'step' : undefined}
                data-done={i < step || undefined}
                disabled={i === step || !reachable(i)}
                onClick={() => setStep(i)}
              >
                <span className="ui-steps__num">{i < step ? '✓' : i + 1}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>
      </header>

      <div className="ui-create__preview">
        <CharacterFigure appearance={appearance} artifact={artifact} className="ui-create__figure" />
        <span className="tag ui-placeholder">Placeholder art</span>
        <div className="ui-plate ui-plate--small">
          <div className="ui-plate__name">{shown || 'New character'}</div>
          <div className="ui-plate__line">
            Level 1 · {seatOf(artifact)} · {artifact.name}
          </div>
        </div>
      </div>

      <div className="ui-panel ui-create__panel">
        {step === 0 && (
          <>
            <h3 className="ui-subheading">Appearance</h3>
            <p className="ui-note">Placeholder options until the game has character art.</p>
            <div
              ref={focusHere}
              className="ui-looks"
              role="group"
              tabIndex={0}
              aria-label="Appearance: up and down to choose a row, left and right to change it"
            >
              {APPEARANCE_ROWS.map((r, i) => {
                const chosen = optionOf(appearance, r.key)
                return (
                  <div key={r.key} className="ui-look" aria-current={i === row ? 'true' : undefined} onClick={() => setRow(i)}>
                    <span className="ui-look__label">{r.label}</span>
                    <button
                      type="button"
                      className="btn ui-look__step"
                      aria-label={`Previous ${r.label.toLowerCase()}`}
                      onClick={() => change(r.key, -1)}
                    >
                      ‹
                    </button>
                    <span className="ui-look__value">
                      {r.options[0].color ? (
                        <span className="ui-swatches">
                          {r.options.map((o, j) => (
                            <button
                              key={o.label}
                              type="button"
                              className="ui-swatch"
                              style={{ background: o.color }}
                              aria-label={`${r.label}: ${o.label}`}
                              aria-pressed={appearance[r.key] === j}
                              onClick={() => setAppearance((a) => ({ ...a, [r.key]: j }))}
                            />
                          ))}
                        </span>
                      ) : null}
                      <span className="ui-look__name">{chosen.label}</span>
                    </span>
                    <button
                      type="button"
                      className="btn ui-look__step"
                      aria-label={`Next ${r.label.toLowerCase()}`}
                      onClick={() => change(r.key, 1)}
                    >
                      ›
                    </button>
                  </div>
                )
              })}
            </div>
            <button type="button" className="btn ui-randomize" onClick={() => setAppearance(randomAppearance())}>
              Randomize
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <h3 className="ui-subheading">Starting artifact</h3>
            <p className="ui-note">Your artifact sets your role and your first ability, its main attack.</p>
            <div
              ref={focusHere}
              className="ui-list ui-artifacts"
              role="listbox"
              tabIndex={0}
              aria-label="Starting artifact"
              aria-activedescendant={`${id}-${artifact.id}`}
            >
              {SEATS.map((seat) => (
                <div key={seat} className="ui-artifacts__seat" role="group" aria-label={seat}>
                  <div className="picker__group-title">{seat}</div>
                  <div className="ui-artifacts__pair">
                    {BY_SEAT.filter((a) => seatOf(a) === seat).map((a) => (
                      <div
                        key={a.id}
                        id={`${id}-${a.id}`}
                        className="ui-artifact"
                        role="option"
                        aria-selected={a === artifact}
                        onClick={() => setArtifactAt(BY_SEAT.indexOf(a))}
                        onDoubleClick={next}
                      >
                        <ArtIcon label={a.name} tint={a.color} className="ui-artifact__icon" />
                        <span className="ui-artifact__text">
                          <span className="ui-artifact__name">{a.name}</span>
                          <span className="ui-artifact__meta">
                            {a.resource}
                            {a.firstVersion && <span className="tag">First version</span>}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="ui-detail">
              <p className="picker__desc">{artifact.description}</p>
              {artifact.tree && (
                <p className="ui-detail__attack">
                  <b>Main attack: {artifact.tree.ability.name}</b>
                  <span>{[artifact.tree.ability.castTime, artifact.tree.ability.range].filter(Boolean).join(' · ')}</span>
                </p>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <form className="ui-name" onSubmit={submitName} noValidate>
            <h3 className="ui-subheading">Name</h3>
            <label className="ui-field">
              <span className="ui-field__label">Character name</span>
              <input
                ref={focusHere}
                className="ui-input ui-input--name"
                value={name}
                maxLength={NAME_MAX * 2}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={(triedName || name !== '') && problem !== null}
                aria-describedby={`${id}-name-status ${id}-name-rules`}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <p
              id={`${id}-name-status`}
              className={problem && (triedName || name !== '') ? 'ui-error' : 'ui-ok'}
              aria-live="polite"
            >
              {problem && (triedName || name !== '') ? problem : problem ? ' ' : `Shows as ${shown}`}
            </p>
            <ul id={`${id}-name-rules`} className="ui-rules">
              <li>
                One word, {NAME_MIN} to {NAME_MAX} letters
              </li>
              <li>No numbers, spaces or symbols</li>
              <li>No letter three times in a row</li>
              <li>Capital first letter, the rest lower case: we fix that for you</li>
            </ul>
            <button type="button" className="btn" onClick={randomName}>
              Random name
            </button>
          </form>
        )}

        {step === 3 && (
          <>
            <h3 className="ui-subheading">Ready?</h3>
            <dl className="ui-summary">
              <dt>Name</dt>
              <dd>{shown}</dd>
              <dt>Artifact</dt>
              <dd>
                {artifact.name} · {seatOf(artifact)} · {artifact.resource}
              </dd>
              {artifact.tree && (
                <>
                  <dt>Main attack</dt>
                  <dd>{artifact.tree.ability.name}</dd>
                </>
              )}
              <dt>Appearance</dt>
              <dd>{describeAppearance(appearance)}</dd>
              <dt>Starts</dt>
              <dd>Level 1, in {STARTING_ZONE}</dd>
              <dt>Saved</dt>
              <dd>{where}</dd>
            </dl>
          </>
        )}
      </div>

      <footer className="ui-footer ui-create__foot">
        <button type="button" className="btn btn--lg" onClick={back}>
          {step === 0 ? 'Cancel' : 'Back'}
        </button>
        <button
          ref={step === 3 ? focusHere : undefined}
          type="button"
          className="btn btn--lg btn--primary"
          disabled={step === 2 && triedName && problem !== null}
          onClick={next}
        >
          {step === STEPS.length - 1 ? 'Create character' : `Next: ${STEPS[step + 1]}`}
        </button>
        <KeyHints
          hints={
            step === 0
              ? [
                  ['↑ ↓', 'Row'],
                  ['← →', 'Change'],
                  ['Enter', 'Next'],
                  ['Esc', 'Cancel'],
                ]
              : step === 1
                ? [
                    ['Arrows', 'Choose'],
                    ['Enter', 'Next'],
                    ['Esc', 'Back'],
                  ]
                : [
                    ['Enter', step === 3 ? 'Create' : 'Next'],
                    ['Esc', 'Back'],
                  ]
          }
        />
      </footer>
    </section>
  )
}
