// The account's characters: four seats around the campfire on the character screen, each holding a
// character or empty. A character keeps its seat, so deleting one leaves a gap rather than moving the
// others. The prototype keeps them in this browser (there's no server), and starts from a few samples.

import { MAX_LEVEL } from '../../talents/levels.ts'
import type { ArtifactDef } from '../../talents/types.ts'
import { ARTIFACTS } from '../../trees/index.ts'
import { seatOf } from '../labels.ts'
import { cleanAppearance, type Appearance } from './appearance.ts'
import { SAMPLE_SLOTS } from './fake.ts'
import { wrap } from './keys.ts'
import { formatName, fullName, NAME_MAX } from './names.ts'
import { raceOf, RACES, startOf, STARTING_POINTS } from './origins.ts'

export interface Character {
  id: string
  name: string
  surname: string
  /** A race id from `RACES`. */
  race: string
  /** The starting point it began at, an id from `STARTING_POINTS`. */
  origin: string
  level: number
  /**
   * The artifact it holds, an id from `ARTIFACTS`: it sets the role and the abilities. A new
   * character starts with none, in plain underclothes, and finds one in the game.
   */
  artifact: string | null
  /** Where it logged out. */
  zone: string
  appearance: Appearance
  /** Played offline since the server last checked its progress. */
  unchecked?: boolean
}

/** Character slots on an account: the seats around the fire. */
export const SLOT_COUNT = 4

export type Slot = Character | null

export interface Roster {
  /** Always `SLOT_COUNT` long. */
  slots: Slot[]
  /** The seat the character screen has selected, empty or not. */
  selected: number
}

export type RosterAction =
  /** Seats a new character in an empty slot. */
  | { type: 'create'; character: Character; slot: number }
  | { type: 'delete'; slot: number }
  | { type: 'select'; slot: number }
  /** The previous (−1) or next (+1) seat, wrapping around. */
  | { type: 'step'; by: number }
  /** Entered the world with it: offline, its progress waits for the server's check. */
  | { type: 'play'; slot: number; offline: boolean }
  /** Logged in online: the server checked everyone's offline progress. */
  | { type: 'check' }
  | { type: 'reset'; roster: Roster }

export const sampleRoster = (): Roster => ({
  slots: Array.from({ length: SLOT_COUNT }, (_, i) => {
    const c = SAMPLE_SLOTS[i]
    return c ? { ...c, appearance: { ...c.appearance } } : null
  }),
  selected: 0,
})

export const characters = (roster: Roster): Character[] => roster.slots.filter((c): c is Character => c !== null)

/** "Seren Ashdown". */
export const nameOf = (c: Pick<Character, 'name' | 'surname'>) => fullName(c.name, c.surname)

/** The character in the selected seat, or null when it's empty. */
export const selectedCharacter = (roster: Roster): Character | null => roster.slots[roster.selected] ?? null

/** The seat a new character goes to: the selected one when it's empty, or else the first empty one (−1: all taken). */
export const seatForNew = (roster: Roster): number =>
  roster.slots[roster.selected] === null ? roster.selected : roster.slots.indexOf(null)

/** How many characters have offline progress the server hasn't checked yet. */
export const uncheckedCount = (roster: Roster) => characters(roster).filter((c) => c.unchecked).length

export interface NewCharacter {
  name: string
  surname: string
  race: string
  origin: string
  appearance: Appearance
}

/**
 * A brand new level 1 character at its starting point, with no artifact. It's made on this device,
 * before you choose to play offline or online, so the server first sees (and checks) it the first
 * time you play online.
 */
export function newCharacter(input: NewCharacter): Character {
  const id = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return {
    id,
    name: formatName(input.name),
    surname: formatName(input.surname),
    race: raceOf(input.race).id,
    origin: startOf(input.origin).id,
    level: 1,
    artifact: null,
    zone: startOf(input.origin).zone,
    appearance: { ...input.appearance },
    unchecked: true,
  }
}

const inRange = (slot: number) => Number.isInteger(slot) && slot >= 0 && slot < SLOT_COUNT

const withSlot = (roster: Roster, slot: number, value: Slot): Roster => ({
  ...roster,
  slots: roster.slots.map((c, i) => (i === slot ? value : c)),
})

export function rosterReducer(roster: Roster, action: RosterAction): Roster {
  switch (action.type) {
    case 'create': {
      const { character, slot } = action
      const key = nameOf(character).toLocaleLowerCase()
      if (!inRange(slot) || roster.slots[slot] !== null) return roster
      if (characters(roster).some((c) => nameOf(c).toLocaleLowerCase() === key)) return roster
      return { ...withSlot(roster, slot, character), selected: slot }
    }
    case 'delete':
      return inRange(action.slot) && roster.slots[action.slot] !== null ? withSlot(roster, action.slot, null) : roster
    case 'select':
      return inRange(action.slot) && action.slot !== roster.selected ? { ...roster, selected: action.slot } : roster
    case 'step':
      return { ...roster, selected: wrap(roster.selected, action.by, SLOT_COUNT) }
    case 'play': {
      const c = roster.slots[action.slot]
      if (!action.offline || !c || c.unchecked) return roster
      return withSlot(roster, action.slot, { ...c, unchecked: true })
    }
    case 'check':
      if (uncheckedCount(roster) === 0) return roster
      return {
        ...roster,
        slots: roster.slots.map((c) => {
          if (!c) return null
          const checked = { ...c }
          delete checked.unchecked
          return checked
        }),
      }
    case 'reset':
      return action.roster
  }
}

/** The artifact a character holds, or null while it has none. */
export const artifactOf = (character: Pick<Character, 'artifact'>): ArtifactDef | null =>
  ARTIFACTS.find((a) => a.id === character.artifact) ?? null

/** "Healer · Lifewarden Staff", or "No artifact yet" for a character that hasn't found one. */
export function kitLabel(character: Pick<Character, 'artifact'>): string {
  const artifact = artifactOf(character)
  return artifact ? `${seatOf(artifact)} · ${artifact.name}` : 'No artifact yet'
}

/** The colour screens tint with: the artifact's, or a plain warm one without. */
export const colorOf = (character: Pick<Character, 'artifact'>): string => artifactOf(character)?.color ?? '#b9a27a'

const ARTIFACT_IDS = new Set(ARTIFACTS.map((a) => a.id))

function cleanCharacter(stored: unknown): Character | null {
  if (!stored || typeof stored !== 'object') return null
  const c = stored as Partial<Record<keyof Character, unknown>>
  if (typeof c.id !== 'string' || c.id === '') return null
  const word = (v: unknown): v is string => typeof v === 'string' && /^\p{L}+$/u.test(v) && [...v].length <= NAME_MAX
  if (!word(c.name)) return null
  const level = typeof c.level === 'number' && Number.isInteger(c.level) ? Math.min(MAX_LEVEL, Math.max(1, c.level)) : 1
  const origin = typeof c.origin === 'string' && STARTING_POINTS.some((s) => s.id === c.origin) ? c.origin : STARTING_POINTS[0].id
  const zone = typeof c.zone === 'string' && c.zone.trim() !== '' ? c.zone.slice(0, 40) : startOf(origin).zone
  return {
    id: c.id,
    name: c.name,
    surname: word(c.surname) ? c.surname : '',
    race: typeof c.race === 'string' && RACES.some((r) => r.id === c.race) ? c.race : RACES[0].id,
    origin,
    level,
    // An artifact removed since it was saved is gone: the character holds none.
    artifact: typeof c.artifact === 'string' && ARTIFACT_IDS.has(c.artifact) ? c.artifact : null,
    zone,
    appearance: cleanAppearance(c.appearance),
    ...(c.unchecked === true ? { unchecked: true } : {}),
  }
}

/**
 * A roster from what this browser stored: the samples on a first visit (nothing stored) or when it
 * can't be read, and otherwise every stored character that still makes sense (one with a bad name
 * empties its seat). Empty seats stay empty: you deleted those characters.
 */
export function readRoster(stored: string | null): Roster {
  if (stored === null) return sampleRoster()
  let parsed: unknown
  try {
    parsed = JSON.parse(stored)
  } catch {
    return sampleRoster()
  }
  const raw = (parsed && typeof parsed === 'object' ? parsed : {}) as { slots?: unknown; selected?: unknown }
  if (!Array.isArray(raw.slots)) return sampleRoster()
  const slots: Slot[] = []
  for (let i = 0; i < SLOT_COUNT; i++) {
    const c = cleanCharacter(raw.slots[i])
    const key = c && nameOf(c).toLocaleLowerCase()
    const clash = c !== null && slots.some((o) => o !== null && (o.id === c.id || nameOf(o).toLocaleLowerCase() === key))
    slots.push(clash ? null : c)
  }
  const selected = typeof raw.selected === 'number' && inRange(raw.selected) ? raw.selected : 0
  return { slots, selected }
}

// v3: two-part names, races and starting points; characters saved before start over from the samples.
const KEY = 'legendsmith.interface.v3'

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
