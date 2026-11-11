// Placeholder appearance options for character creation, until the game has real character art.
// A character stores the index of each choice, so options can be renamed or recoloured freely.

export interface Appearance {
  body: number
  skin: number
  hair: number
  hairColor: number
}

export type AppearanceKey = keyof Appearance

export interface AppearanceOption {
  label: string
  /** A colour swatch, for the skin and hair colour rows. */
  color?: string
}

export interface AppearanceRow {
  key: AppearanceKey
  label: string
  options: readonly AppearanceOption[]
}

export const APPEARANCE_ROWS: readonly AppearanceRow[] = [
  { key: 'body', label: 'Body', options: [{ label: 'Broad' }, { label: 'Slender' }] },
  {
    key: 'skin',
    label: 'Skin',
    options: [
      { label: 'Fair', color: '#f1d2b6' },
      { label: 'Light', color: '#e0b08c' },
      { label: 'Tan', color: '#c68d63' },
      { label: 'Brown', color: '#9c6a45' },
      { label: 'Dark', color: '#6e4a31' },
      { label: 'Deep', color: '#4a3122' },
    ],
  },
  { key: 'hair', label: 'Hair', options: [{ label: 'Short' }, { label: 'Long' }, { label: 'Topknot' }, { label: 'Shaved' }] },
  {
    key: 'hairColor',
    label: 'Hair colour',
    options: [
      { label: 'Black', color: '#1f1a17' },
      { label: 'Dark brown', color: '#4b3221' },
      { label: 'Chestnut', color: '#8a5a33' },
      { label: 'Blond', color: '#c7a15c' },
      { label: 'Silver', color: '#d9d4c7' },
      { label: 'Red', color: '#a8342b' },
    ],
  },
]

const ROW = Object.fromEntries(APPEARANCE_ROWS.map((r) => [r.key, r])) as Record<AppearanceKey, AppearanceRow>

export const DEFAULT_APPEARANCE: Appearance = { body: 0, skin: 1, hair: 0, hairColor: 1 }

/** The chosen option of one row. */
export const optionOf = (appearance: Appearance, key: AppearanceKey): AppearanceOption => {
  const { options } = ROW[key]
  return options[appearance[key]] ?? options[0]
}

/** Steps one row to its next (+1) or previous (−1) option, wrapping around. */
export function cycle(appearance: Appearance, key: AppearanceKey, by: number): Appearance {
  const n = ROW[key].options.length
  return { ...appearance, [key]: (((appearance[key] + by) % n) + n) % n }
}

/** A random pick on every row. `random` returns [0, 1), like Math.random. */
export function randomAppearance(random: () => number = Math.random): Appearance {
  const pick = (key: AppearanceKey) => Math.floor(random() * ROW[key].options.length)
  return { body: pick('body'), skin: pick('skin'), hair: pick('hair'), hairColor: pick('hairColor') }
}

/** Anything stored that isn't a valid choice (an old save, a removed option) becomes the first option. */
export function cleanAppearance(stored: unknown): Appearance {
  const raw = (stored && typeof stored === 'object' ? stored : {}) as Partial<Record<AppearanceKey, unknown>>
  const valid = (key: AppearanceKey) => {
    const v = raw[key]
    return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < ROW[key].options.length ? v : 0
  }
  return { body: valid('body'), skin: valid('skin'), hair: valid('hair'), hairColor: valid('hairColor') }
}

/** "Broad · Light skin · Long, chestnut hair": one line for the confirm step. */
export function describeAppearance(a: Appearance): string {
  const hair = optionOf(a, 'hair').label
  const color = optionOf(a, 'hairColor').label.toLowerCase()
  return `${optionOf(a, 'body').label} · ${optionOf(a, 'skin').label} skin · ${hair === 'Shaved' ? 'Shaved head' : `${hair}, ${color} hair`}`
}
