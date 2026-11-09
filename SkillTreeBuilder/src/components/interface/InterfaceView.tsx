import { useEffect, useReducer, useState } from 'react'
import { CharacterCreate, type NewCharacter } from './CharacterCreate.tsx'
import { CharacterSelect } from './CharacterSelect.tsx'
import { TAKEN_NAMES, type Realm } from './fake.ts'
import { backFrom, flowFor, SCREEN_LABEL, type Mode, type Screen } from './flow.ts'
import { LoadingScreen } from './LoadingScreen.tsx'
import { LoginScreen } from './LoginScreen.tsx'
import { ModeScreen } from './ModeScreen.tsx'
import { RealmScreen } from './RealmScreen.tsx'
import {
  hasRoom,
  loadRoster,
  newCharacter,
  rosterReducer,
  sampleRoster,
  saveRoster,
  selectedCharacter,
  uncheckedCount,
} from './roster.ts'
import { TitleScreen } from './TitleScreen.tsx'
import { WorldScreen } from './WorldScreen.tsx'

interface Props {
  /** False while another view is showing: the screens stop listening to keys. */
  active: boolean
}

/**
 * A clickable prototype of the game's front-end screens: the title, offline or online (a pretend
 * login and realm list), character selection and creation, then a placeholder world. The characters
 * are kept in this browser; nothing else is remembered, so a reload starts at the title like the game.
 */
export function InterfaceView({ active }: Props) {
  const [screen, setScreen] = useState<Screen>('title')
  const [mode, setMode] = useState<Mode>('offline')
  const [account, setAccount] = useState('')
  const [realm, setRealm] = useState<Realm | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [roster, dispatch] = useReducer(rosterReducer, undefined, loadRoster)
  const current = selectedCharacter(roster)

  useEffect(() => saveRoster(roster), [roster])

  const go = (next: Screen) => {
    setNotice(null)
    setScreen(next)
  }
  const back = () => {
    const to = backFrom(screen, mode)
    if (to) go(to)
  }

  const pickMode = (picked: Mode) => {
    setMode(picked)
    go(picked === 'online' ? 'login' : 'select')
  }

  // Online, the server checks the offline progress of every character on arrival.
  const connect = (picked: Realm) => {
    const checked = uncheckedCount(roster)
    dispatch({ type: 'check' })
    setRealm(picked)
    go('select')
    if (checked > 0) {
      setNotice(`The server checked the offline progress of ${checked} character${checked === 1 ? '' : 's'}: all good.`)
    }
  }

  const enterWorld = () => {
    if (!current) return
    dispatch({ type: 'play', id: current.id, offline: mode === 'offline' })
    go('loading')
  }

  const create = (made: NewCharacter) => {
    dispatch({ type: 'create', character: newCharacter({ ...made, offline: mode === 'offline' }) })
    go('select')
  }

  // The strip above the screen jumps straight to one, for a look; the login and realm screens are online's.
  const jump = (to: Screen) => {
    if (to === 'login' || to === 'realm') setMode('online')
    if (to === 'realm' && account === '') setAccount('Player')
    go(to)
  }

  const reset = () => {
    if (!window.confirm('Put the sample characters back and start over at the title? Characters you made are removed.')) return
    dispatch({ type: 'reset', roster: sampleRoster() })
    setMode('offline')
    setAccount('')
    setRealm(null)
    go('title')
  }

  // The loading screen and the world need a character: without one, you're back at the list.
  const shown: Screen = (screen === 'loading' || screen === 'world') && !current ? 'select' : screen
  const taken = { yours: roster.characters.map((c) => c.name), others: mode === 'online' ? TAKEN_NAMES : [] }

  return (
    <div className="ui">
      <div className="ui__controls">
        <nav className="tabs ui-flow" aria-label="Screens">
          {flowFor(mode)
            .filter((s) => s !== 'loading')
            .map((s) => (
              <button
                key={s}
                type="button"
                className="tabs__tab"
                aria-pressed={s === shown || (s === 'world' && shown === 'loading')}
                disabled={(s === 'world' && !current) || (s === 'create' && !hasRoom(roster))}
                onClick={() => jump(s === 'world' ? 'loading' : s)}
              >
                {SCREEN_LABEL[s]}
              </button>
            ))}
        </nav>
        <span className="ui__spacer" />
        <button type="button" className="btn btn--lg" onClick={reset}>
          Reset prototype
        </button>
      </div>
      <p className="ui__about">
        A clickable prototype of the game's first screens, with made-up data: there's no account, server or real login, and your
        characters are kept in this browser. The arrow keys, Enter and Esc work the way a pad will.
      </p>

      <div className={`ui__stage ui__stage--${shown}`}>
        {shown === 'title' && <TitleScreen active={active} onStart={() => go('mode')} />}
        {shown === 'mode' && <ModeScreen active={active} mode={mode} onPick={pickMode} onBack={back} />}
        {shown === 'login' && (
          <LoginScreen
            active={active}
            account={account}
            onLogin={(name) => {
              setAccount(name)
              go('realm')
            }}
            onBack={back}
          />
        )}
        {shown === 'realm' && <RealmScreen active={active} account={account} realm={realm} onPick={connect} onBack={back} />}
        {shown === 'select' && (
          <CharacterSelect
            active={active}
            roster={roster}
            mode={mode}
            realm={realm}
            notice={notice}
            onSelect={(id) => dispatch({ type: 'select', id })}
            onStep={(by) => dispatch({ type: 'step', by })}
            onEnter={enterWorld}
            onCreate={() => go('create')}
            onDelete={(id) => dispatch({ type: 'delete', id })}
            onBack={back}
          />
        )}
        {shown === 'create' && (
          <CharacterCreate active={active} mode={mode} realm={realm} taken={taken} onCreate={create} onCancel={back} />
        )}
        {shown === 'loading' && current && (
          <LoadingScreen character={current} mode={mode} realm={realm} onDone={() => go('world')} />
        )}
        {shown === 'world' && current && (
          <WorldScreen
            active={active}
            character={current}
            mode={mode}
            realm={realm}
            onLogout={() => go('select')}
            onExit={() => go('title')}
          />
        )}
      </div>
    </div>
  )
}
