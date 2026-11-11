// The front-end screens and how they link: the title, your characters around the campfire (where you
// create one, or pick one and play it offline or online), a log in the first time you go online, then
// into the world.

export type Screen = 'title' | 'select' | 'create' | 'login' | 'loading' | 'world'

/**
 * Offline: solo with AI bots, progress kept on the device. Online: the game puts you in an instance
 * with other players; there's no server to pick.
 */
export type Mode = 'offline' | 'online'

export const SCREEN_LABEL: Record<Screen, string> = {
  title: 'Title',
  select: 'Characters',
  create: 'Create',
  login: 'Log in',
  loading: 'Loading',
  world: 'In the world',
}

/** The screens in the order you meet them (creation and the log in are side trips from the fire). */
export const FLOW: readonly Screen[] = ['title', 'select', 'create', 'login', 'loading', 'world']

/** Where Esc or Back goes from a screen, or null when there's nowhere to go back to. */
export function backFrom(screen: Screen): Screen | null {
  switch (screen) {
    case 'title':
    case 'loading':
      return null
    case 'select':
      return 'title'
    case 'create':
    case 'login':
    case 'world':
      return 'select'
  }
}
