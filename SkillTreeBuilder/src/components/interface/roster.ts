// The account's characters, as the character selection screen lists them. The prototype keeps them in
// this browser (there's no server), and starts from a few sample characters.

import { MAX_LEVEL } from '../../talents/levels.ts'
import type { ArtifactDef } from '../../talents/types.ts'
import { ARTIFACTS } from '../../trees/index.ts'
import { cleanAppearance, type Appearance } from './appearance.ts'
import { SAMPLE_CHARACTERS, STARTING_ZONE } from './fake.ts'
import { wrap } from './keys.ts'
import { formatName, NAME_MAX } from './names.ts'

export interface Character {
  id: string
  name: string
  level: number
  /** The artifact it holds, an id from `ARTIFACTS`: it sets the role and the abilities. */
  artifact: string
  /** Where it logged out. */
  zone: string
  appearance: Appearance
  /** Played offline since the server last checked its progress. */
  unchecked?: boolean
}

export interface Roster {
  characters: Character[]
  /** The character the selection screen shows, or null when there are none. */
  selected: string | null
}

/** Character slots on an account. */
export const MAX_CHARACTERS = 8

export type RosterAction =
  | { type: 'create'; character: Character }
  | { type: 'delete'; id: string }
  | { type: 'select'; id: string }
  /** The previous (−1) or next (+1) character, wrapping around. */
  | { type: 'step'; by: number }
  /** Entered the world with it: offline, its progress waits for the server's check. */
  | { type: 'play'; id: string; offline: boolean }
  /** Logged in online: the server checked everyone's offline progress. */
  | { type: 'check' }
  | { type: 'reset'; roster: Roster }

export const sampleRoster = (): Roster => ({
  characters: SAMPLE_CHARACTERS.map((c) => ({ ...c, appearance: { ...c.appearance } })),
  selected: SAMPLE_CHARACTERS[0]?.id ?? null,
})

/** Whether another character fits on the account. */
export const hasRoom = (roster: Roster) => roster.characters.length < MAX_CHARACTERS

/** How many characters have offline progress the server hasn't checked yet. */
export const uncheckedCount = (roster: Roster) => roster.characters.filter((c) => c.unchecked).length

export const selectedCharacter = (roster: Roster): Character | null =>
  roster.characters.find((c) => c.id === roster.selected) ?? null

/** A brand new level 1 character in the starting zone. Created offline, the server hasn't seen it yet. */
export function newCharacter(input: { name: string; artifact: string; appearance: Appearance; offline: boolean }): Character {
  const id = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return {
    id,
    name: formatName(input.name),
    level: 1,
    artifact: input.artifact,
    zone: STARTING_ZONE,
    appearance: { ...input.appearance },
    ...(input.offline ? { unchecked: true } : {}),
  }
}

export function rosterReducer(roster: Roster, action: RosterAction): Roster {
  const { characters } = roster
  switch (action.type) {
    case 'create': {
      const key = action.character.name.toLocaleLowerCase()
      if (!hasRoom(roster) || characters.some((c) => c.name.toLocaleLowerCase() === key)) return roster
      return { characters: [...characters, action.character], selected: action.character.id }
    }
    case 'delete': {
      const at = characters.findIndex((c) => c.id === action.id)
      if (at < 0) return roster
      const left = characters.filter((c) => c.id !== action.id)
      // The one below it takes its place in the list, or the one above when it was last.
      const selected = roster.selected !== action.id ? roster.selected : (left[Math.min(at, left.length - 1)]?.id ?? null)
      return { characters: left, selected }
    }
    case 'select':
      return characters.some((c) => c.id === action.id) ? { ...roster, selected: action.id } : roster
    case 'step': {
      if (characters.length === 0) return roster
      const at = characters.findIndex((c) => c.id === roster.selected)
      // With nobody selected, down starts at the top and up at the bottom.
      const next = at < 0 ? (action.by > 0 ? 0 : characters.length - 1) : wrap(at, action.by, characters.length)
      return { ...roster, selected: characters[next].id }
    }
    case 'play':
      if (!action.offline) return roster
      return { ...roster, characters: characters.map((c) => (c.id === action.id ? { ...c, unchecked: true } : c)) }
    case 'check':
      if (uncheckedCount(roster) === 0) return roster
      return {
        ...roster,
        characters: characters.map((c) => {
          const checked = { ...c }
          delete checked.unchecked
          return checked
        }),
      }
    case 'reset':
      return action.roster
  }
}

const ARTIFACT_IDS = new Set(ARTIFACTS.map((a) => a.id))

function cleanCharacter(stored: unknown): Character | null {
  if (!stored || typeof stored !== 'object') return null
  const c = stored as Partial<Record<keyof Character, unknown>>
  if (typeof c.id !== 'string' || c.id === '') return null
  if (typeof c.name !== 'string' || !/^\p{L}+$/u.test(c.name) || [...c.name].length > NAME_MAX) return null
  if (typeof c.artifact !== 'string' || !ARTIFACT_IDS.has(c.artifact)) return null
  const level = typeof c.level === 'number' && Number.isInteger(c.level) ? Math.min(MAX_LEVEL, Math.max(1, c.level)) : 1
  const zone = typeof c.zone === 'string' && c.zone.trim() !== '' ? c.zone.slice(0, 40) : STARTING_ZONE
  return {
    id: c.id,
    name: c.name,
    level,
    artifact: c.artifact,
    zone,
    appearance: cleanAppearance(c.appearance),
    ...(c.unchecked === true ? { unchecked: true } : {}),
  }
}

/**
 * A roster from what this browser stored: the sample characters on a first visit (nothing stored) or
 * when it can't be read, and otherwise every stored character that still makes sense (a removed
 * artifact drops it). An empty list stays empty: you deleted them all.
 */
export function readRoster(stored: string | null): Roster {
  if (stored === null) return sampleRoster()
  let parsed: unknown
  try {
    parsed = JSON.parse(stored)
  } catch {
    return sampleRoster()
  }
  const raw = (parsed && typeof parsed === 'object' ? parsed : {}) as { characters?: unknown; selected?: unknown }
  if (!Array.isArray(raw.characters)) return sampleRoster()
  const characters: Character[] = []
  for (const entry of raw.characters) {
    const c = cleanCharacter(entry)
    const key = c?.name.toLocaleLowerCase()
    if (c && characters.length < MAX_CHARACTERS && !characters.some((o) => o.id === c.id || o.name.toLocaleLowerCase() === key)) {
      characters.push(c)
    }
  }
  const selected = characters.find((c) => c.id === raw.selected)?.id ?? characters[0]?.id ?? null
  return { characters, selected }
}

const KEY = 'legendsmith.interface.v1'

export function loadRoster(): Roster {
  try {
    return readRoster(localStorage.getItem(KEY))
  } catch {
    // Blocked storage: start from the samples, and nothing is remembered.
    return sampleRoster()
  }
}

export function saveRoster(roster: Roster) {
  try {
    localStorage.setItem(KEY, JSON.stringify(roster))
  } catch {
    // Private windows and blocked storage: the prototype works the same, it just won't remember.
  }
}

/** The artifact a character holds (the first one if its artifact was removed since). */
export const artifactOf = (character: Pick<Character, 'artifact'>): ArtifactDef =>
  ARTIFACTS.find((a) => a.id === character.artifact) ?? ARTIFACTS[0]
