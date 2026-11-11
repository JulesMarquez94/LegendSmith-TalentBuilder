import { useEffect, useReducer, useState } from 'react'
import { CharacterCreate, type NewCharacter } from './CharacterCreate.tsx'
import { CharacterSelect } from './CharacterSelect.tsx'
import { TAKEN_NAMES } from './fake.ts'
import { backFrom, FLOW, SCREEN_LABEL, type Mode, type Screen } from './flow.ts'
import { LoadingScreen } from './LoadingScreen.tsx'
import { LoginScreen } from './LoginScreen.tsx'
import {
  characters,
  loadRoster,
  newCharacter,
  rosterReducer,
  sampleRoster,
  saveRoster,
  seatForNew,
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
 * A clickable prototype of the game's front-end screens: the title, then your characters around the
 * campfire, where you create one or take one into the game offline (solo with AI bots) or online (an
 * instance with other players, after a pretend log in the first time). The characters are kept in this
 * browser; nothing else is remembered, so a reload starts at the title like the game.
 */
export function InterfaceView({ active }: Props) {
  const [screen, setScreen] = useState<Screen>('title')
  // The way to play the camp's arrows are on, and then the one you're playing in.
  const [mode, setMode] = useState<Mode>('offline')
  // Logged in this session: Play online then goes straight in.
  const [account, setAccount] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [roster, dispatch] = useReducer(rosterReducer, undefined, loadRoster)
  const current = selectedCharacter(roster)

  useEffect(() => saveRoster(roster), [roster])

  const go = (next: Screen) => {
    setNotice(null)
    setScreen(next)
  }
  const back = () => {
    const to = backFrom(screen)
    if (to) go(to)
  }

  // Into the world. Online, the server first checks the offline progress kept on this device.
  const start = (how: Mode) => {
    if (!current) return go('select')
    setMode(how)
    if (how === 'offline') {
      dispatch({ type: 'play', slot: roster.selected, offline: true })
      return go('loading')
    }
    const checked = uncheckedCount(roster)
    dispatch({ type: 'check' })
    go('loading')
    if (checked > 0) {
      setNotice(
        `The server checked the progress saved on this device (${checked} character${checked === 1 ? '' : 's'}): all good.`,
      )
    }
  }

  // Online needs you logged in, once per session.
  const play = (how: Mode) => {
    setMode(how)
    if (how === 'online' && account === '') go('login')
    else start(how)
  }

  // A new character takes the selected seat when it's empty, or else the first empty one.
  const create = (made: NewCharacter) => {
    const slot = seatForNew(roster)
    if (slot >= 0) dispatch({ type: 'create', slot, character: newCharacter(made) })
    go('select')
  }

  const reset = () => {
    if (!window.confirm('Put the sample characters back and start over at the title? Characters you made are removed.')) return
    dispatch({ type: 'reset', roster: sampleRoster() })
    setMode('offline')
    setAccount('')
    go('title')
  }

  // The loading screen and the world need a character: without one, you're back at the fire.
  const shown: Screen = (screen === 'loading' || screen === 'world') && !current ? 'select' : screen
  // Names are one per player across the game, so the made-up ones other players have are taken too.
  const taken = { yours: characters(roster).map((c) => c.name), others: TAKEN_NAMES }

  return (
    <div className="ui">
      <div className="ui__controls">
        {/* Jumps straight to a screen, for a look. */}
        <nav className="tabs ui-flow" aria-label="Screens">
          {FLOW.filter((s) => s !== 'loading').map((s) => (
            <button
              key={s}
              type="button"
              className="tabs__tab"
              aria-pressed={s === shown || (s === 'world' && shown === 'loading')}
              disabled={((s === 'world' || s === 'login') && !current) || (s === 'create' && seatForNew(roster) < 0)}
              onClick={() => (s === 'world' ? start(mode) : go(s))}
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
        {shown === 'title' && <TitleScreen active={active} onStart={() => go('select')} />}
        {shown === 'select' && (
          <CharacterSelect
            active={active}
            roster={roster}
            mode={mode}
            account={account}
            onSelect={(slot) => dispatch({ type: 'select', slot })}
            onStep={(by) => dispatch({ type: 'step', by })}
            onMode={setMode}
            onPlay={play}
            onCreate={() => go('create')}
            onDelete={(slot) => dispatch({ type: 'delete', slot })}
            onBack={back}
          />
        )}
        {shown === 'create' && <CharacterCreate active={active} taken={taken} onCreate={create} onCancel={back} />}
        {shown === 'login' && (
          <LoginScreen
            active={active}
            account={account}
            onLogin={(name) => {
              setAccount(name)
              start('online')
            }}
            onBack={back}
          />
        )}
        {shown === 'loading' && current && (
          <LoadingScreen character={current} mode={mode} notice={notice} onDone={() => go('world')} />
        )}
        {shown === 'world' && current && (
          <WorldScreen active={active} character={current} mode={mode} onLogout={() => go('select')} onExit={() => go('title')} />
        )}
      </div>
    </div>
  )
}
