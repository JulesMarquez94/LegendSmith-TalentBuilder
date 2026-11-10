// Character names, checked as you type on the character creation screen. One word of letters, 2 to 12
// long, shown with a capital first letter ("bRYNN" becomes "Brynn"), like most MMOs do it.

export const NAME_MIN = 2
export const NAME_MAX = 12

/** Names nobody can take: the game's own and staff titles, whatever their case. */
const RESERVED = new Set(['legendsmith', 'admin', 'gm', 'gamemaster', 'moderator', 'support', 'system'])

/** How a typed name will show: trimmed, a capital first letter and the rest lower case. */
export function formatName(raw: string): string {
  const name = raw.trim()
  const [first = '', ...rest] = [...name]
  return first.toLocaleUpperCase() + rest.join('').toLocaleLowerCase()
}

/** The names a new character can't have: your own characters' and, online, everyone else's on the server. */
export interface TakenNames {
  yours: readonly string[]
  others?: readonly string[]
}

/** What's wrong with a name, or null when it can be used. Case doesn't matter. */
export function nameProblem(raw: string, { yours, others = [] }: TakenNames): string | null {
  const name = raw.trim()
  if (name === '') return 'Enter a name.'
  if (/\s/u.test(name)) return 'One word only: no spaces.'
  if (!/^\p{L}+$/u.test(name)) return 'Letters only: no numbers, dashes or symbols.'
  const length = [...name].length
  if (length < NAME_MIN) return `Too short: at least ${NAME_MIN} letters.`
  if (length > NAME_MAX) return `Too long: at most ${NAME_MAX} letters.`
  if (/(\p{L})\1\1/iu.test(name)) return 'No letter three times in a row.'
  const key = name.toLocaleLowerCase()
  if (RESERVED.has(key)) return 'That name is reserved.'
  if (yours.some((n) => n.toLocaleLowerCase() === key)) return 'One of your characters already has that name.'
  if (others.some((n) => n.toLocaleLowerCase() === key)) return 'Someone on the server already has that name.'
  return null
}
