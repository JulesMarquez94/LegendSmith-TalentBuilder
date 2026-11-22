// Character names, checked as you type on the character creation screen. A name has two parts, a
// name and a surname, each one word of letters, 2 to 12 long, shown with a capital first letter
// ("bRYNN" becomes "Brynn"). The whole name is what has to be free.

export const NAME_MIN = 2
export const NAME_MAX = 12

/** Words nobody can use as a name or surname: the game's own and staff titles, whatever their case. */
const RESERVED = new Set(['legendsmith', 'admin', 'gm', 'gamemaster', 'moderator', 'support', 'system'])

/** How a typed part will show: trimmed, a capital first letter and the rest lower case. */
export function formatName(raw: string): string {
  const name = raw.trim()
  const [first = '', ...rest] = [...name]
  return first.toLocaleUpperCase() + rest.join('').toLocaleLowerCase()
}

/** "Seren Ashdown": the two parts as they show. An old character may have no surname. */
export const fullName = (name: string, surname = '') => [formatName(name), formatName(surname)].filter(Boolean).join(' ')

/** What's wrong with one part of a name, or null when it can be used. */
export function partProblem(raw: string): string | null {
  const part = raw.trim()
  if (part === '') return 'Required.'
  if (/\s/u.test(part)) return 'One word only: no spaces.'
  if (!/^\p{L}+$/u.test(part)) return 'Letters only: no numbers, dashes or symbols.'
  const length = [...part].length
  if (length < NAME_MIN) return `Too short: at least ${NAME_MIN} letters.`
  if (length > NAME_MAX) return `Too long: at most ${NAME_MAX} letters.`
  if (/(\p{L})\1\1/iu.test(part)) return 'No letter three times in a row.'
  if (RESERVED.has(part.toLocaleLowerCase())) return 'That word is reserved.'
  return null
}

/** The full names a new character can't have: your own characters' and everyone else's in the game. */
export interface TakenNames {
  yours: readonly string[]
  others?: readonly string[]
}

export interface NameProblems {
  name: string | null
  surname: string | null
  /** The whole name is taken. */
  full: string | null
}

export const hasProblem = (p: NameProblems) => p.name !== null || p.surname !== null || p.full !== null

/** What's wrong with a name and surname: each part on its own, then the two together. Case doesn't matter. */
export function nameProblems(name: string, surname: string, { yours, others = [] }: TakenNames): NameProblems {
  const parts = { name: partProblem(name), surname: partProblem(surname) }
  if (parts.name || parts.surname) return { ...parts, full: null }
  const key = fullName(name, surname).toLocaleLowerCase()
  const clash = (list: readonly string[]) => list.some((n) => n.toLocaleLowerCase() === key)
  const full = clash(yours)
    ? 'One of your characters already has this name.'
    : clash(others)
      ? 'Someone in the game already has this name.'
      : null
  return { ...parts, full }
}
