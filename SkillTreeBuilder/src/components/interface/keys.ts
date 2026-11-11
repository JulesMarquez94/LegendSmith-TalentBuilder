// Keyboard navigation for the interface screens, the way a pad drives them: arrows move, Enter
// confirms, Esc goes back. This file is the pure part (which key does what); useNavKeys listens.

/** What a key asks the screen on show to do. */
export type NavAction = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'delete'

/**
 * Where the key went. A text field (or a dropdown or slider) keeps its arrows and Enter; a button or
 * link keeps Enter, which clicks it; anything else (the page, a list) leaves every key to the screen.
 */
export type KeyTarget = 'text' | 'control' | 'none'

const TEXT_INPUTS = new Set(['text', 'search', 'email', 'number', 'password', 'tel', 'url', 'range'])

/** Sorts a key event's target, from its tag and type, so it also works on plain objects in tests. */
export function keyTarget(target: unknown): KeyTarget {
  if (!target || typeof target !== 'object') return 'none'
  const el = target as { tagName?: unknown; type?: unknown; isContentEditable?: unknown }
  const tag = typeof el.tagName === 'string' ? el.tagName.toUpperCase() : ''
  if (el.isContentEditable === true || tag === 'TEXTAREA' || tag === 'SELECT') return 'text'
  if (tag === 'INPUT') return typeof el.type === 'string' && TEXT_INPUTS.has(el.type) ? 'text' : 'control'
  if (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY') return 'control'
  return 'none'
}

export interface KeyPress {
  key: string
  target: KeyTarget
  /** Ctrl, Alt or Cmd held: those are the browser's shortcuts. */
  modifier: boolean
  /** Held down and repeating. */
  repeat: boolean
  /** A modal dialog is open: it handles its own keys. */
  dialogOpen: boolean
}

const ARROWS: Record<string, NavAction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }

/** The action for a key press, or null to leave it to the browser. */
export function navAction({ key, target, modifier, repeat, dialogOpen }: KeyPress): NavAction | null {
  if (modifier || dialogOpen) return null
  // Esc goes back from anywhere, a text field too. Holding it down doesn't skip back several screens.
  if (key === 'Escape') return repeat ? null : 'back'
  if (target === 'text') return null
  // Arrows repeat while held, to run down a list.
  if (key in ARROWS) return ARROWS[key]
  if (repeat) return null
  if (key === 'Enter') return target === 'none' ? 'confirm' : null
  if (key === 'Delete') return 'delete'
  return null
}

/** Steps an index through a list of `count`, wrapping around at both ends. */
export const wrap = (index: number, by: number, count: number) => (count <= 0 ? 0 : (((index + by) % count) + count) % count)
