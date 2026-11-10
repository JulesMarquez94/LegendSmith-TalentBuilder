import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { KeyHints } from './KeyHints.tsx'
import { useNavKeys } from './useNavKeys.ts'

interface Props {
  active: boolean
  /** The account name used last, filled in. */
  account: string
  onLogin: (account: string) => void
  onBack: () => void
}

/** How long the pretend connection takes. */
const CONNECT_MS = 900

/** A placeholder login: any account name and password work, and nothing is sent anywhere. */
export function LoginScreen({ active, account, onLogin, onBack }: Props) {
  const id = useId()
  const [name, setName] = useState(account)
  const [password, setPassword] = useState('')
  const [tried, setTried] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const first = useRef<HTMLInputElement>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (active) first.current?.focus({ preventScroll: true })
  }, [active])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const nameError = name.trim() === '' ? 'Enter your account name.' : null
  const passwordError = password === '' ? 'Enter your password.' : null

  const cancel = () => {
    window.clearTimeout(timer.current)
    setConnecting(false)
  }
  useNavKeys(active, { back: connecting ? cancel : onBack })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (nameError || passwordError || connecting) return
    setConnecting(true)
    timer.current = window.setTimeout(() => onLogin(name.trim()), CONNECT_MS)
  }

  return (
    <section className="ui-screen" aria-labelledby={`${id}-title`}>
      <div className="ui-center">
        <form className="ui-panel ui-login" onSubmit={submit} noValidate>
          <h2 id={`${id}-title`} className="ui-heading">
            Log in
          </h2>
          <p className="ui-note">
            Prototype: any account name and password work, and nothing is sent anywhere. Don't type a real password.
          </p>
          <label className="ui-field">
            <span className="ui-field__label">Account name</span>
            <input
              ref={first}
              className="ui-input"
              value={name}
              autoComplete="off"
              spellCheck={false}
              disabled={connecting}
              aria-invalid={tried && nameError !== null}
              aria-describedby={tried && nameError ? `${id}-name-error` : undefined}
              onChange={(e) => setName(e.target.value)}
            />
            {tried && nameError && (
              <span id={`${id}-name-error`} className="ui-error">
                {nameError}
              </span>
            )}
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Password</span>
            <input
              className="ui-input"
              type="password"
              value={password}
              autoComplete="off"
              disabled={connecting}
              aria-invalid={tried && passwordError !== null}
              aria-describedby={tried && passwordError ? `${id}-password-error` : undefined}
              onChange={(e) => setPassword(e.target.value)}
            />
            {tried && passwordError && (
              <span id={`${id}-password-error`} className="ui-error">
                {passwordError}
              </span>
            )}
          </label>
          {connecting ? (
            <div className="ui-connecting" role="status">
              <span className="ui-spinner" aria-hidden="true" />
              Connecting…
              <button type="button" className="btn" onClick={cancel}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="ui-panel__actions">
              <button type="button" className="btn btn--lg" onClick={onBack}>
                Back
              </button>
              <button type="submit" className="btn btn--lg btn--primary">
                Log in
              </button>
            </div>
          )}
        </form>
      </div>
      <div className="ui-footer">
        <KeyHints
          hints={[
            ['Enter', 'Log in'],
            ['Esc', connecting ? 'Cancel' : 'Back'],
          ]}
        />
      </div>
    </section>
  )
}
