// The front-end screens and how they link: title, offline or online, (log in and pick a realm,)
// character selection, character creation, then into the world.

export type Screen = 'title' | 'mode' | 'login' | 'realm' | 'select' | 'create' | 'loading' | 'world'

/** Offline: solo with AI bots, progress kept on the device. Online: the shared world. */
export type Mode = 'offline' | 'online'

export const SCREEN_LABEL: Record<Screen, string> = {
  title: 'Title',
  mode: 'Offline or online',
  login: 'Log in',
  realm: 'Realm',
  select: 'Characters',
  create: 'Create',
  loading: 'Loading',
  world: 'In the world',
}

/** The screens a mode goes through, in order (creation is a side trip from selection). */
export const flowFor = (mode: Mode): readonly Screen[] =>
  mode === 'online'
    ? ['title', 'mode', 'login', 'realm', 'select', 'create', 'loading', 'world']
    : ['title', 'mode', 'select', 'create', 'loading', 'world']

/** Where Esc or Back goes from a screen, or null when there's nowhere to go back to. */
export function backFrom(screen: Screen, mode: Mode): Screen | null {
  switch (screen) {
    case 'title':
    case 'loading':
      return null
    case 'mode':
      return 'title'
    case 'login':
      return 'mode'
    // Leaving the realm list logs you out.
    case 'realm':
      return 'login'
    case 'select':
      return mode === 'online' ? 'realm' : 'mode'
    case 'create':
    case 'world':
      return 'select'
  }
}
