import { describe, expect, it } from 'vitest'
import { ARTIFACTS } from '../../trees/index.ts'
import { DEFAULT_APPEARANCE } from './appearance.ts'
import { SAMPLE_SLOTS, STARTING_ZONE, TAKEN_NAMES } from './fake.ts'
import { nameProblem } from './names.ts'
import {
  characters,
  newCharacter,
  readRoster,
  rosterReducer,
  sampleRoster,
  seatForNew,
  selectedCharacter,
  SLOT_COUNT,
  uncheckedCount,
  type Character,
  type Roster,
} from './roster.ts'

const make = (name: string): Character => newCharacter({ name, artifact: 'spear', appearance: DEFAULT_APPEARANCE })

/** Seats from names, `null` for an empty seat; the first seat is selected. */
const roster = (...names: (string | null)[]): Roster => ({
  slots: Array.from({ length: SLOT_COUNT }, (_, i) => {
    const n = names[i]
    if (!n) return null
    const c: Character = { ...make(n), id: n.toLowerCase() }
    delete c.unchecked
    return c
  }),
  selected: 0,
})

const names = (r: Roster) => r.slots.map((c) => c?.name ?? null)

describe('the sample characters', () => {
  const samples = SAMPLE_SLOTS.filter((c): c is Character => c !== null)

  it('fill some of the four seats, leaving one empty to create in', () => {
    expect(SAMPLE_SLOTS).toHaveLength(SLOT_COUNT)
    expect(SAMPLE_SLOTS).toContain(null)
  })

  it('have valid, different names and hold real artifacts', () => {
    const all = samples.map((c) => c.name)
    samples.forEach((c, i) => {
      expect(nameProblem(c.name, { yours: all.filter((_, j) => j !== i), others: TAKEN_NAMES })).toBeNull()
      expect(ARTIFACTS.some((a) => a.id === c.artifact)).toBe(true)
    })
  })

  it('fill one role each', () => {
    const roles = samples.map((c) => ARTIFACTS.find((a) => a.id === c.artifact)!.role)
    expect(new Set(roles)).toEqual(new Set(['tank', 'healer', 'damage']))
  })
})

describe('a new character', () => {
  it('starts at level 1 in the starting zone, its name formatted', () => {
    expect(make('  nYSSA')).toMatchObject({ name: 'Nyssa', level: 1, zone: STARTING_ZONE, artifact: 'spear' })
  })

  it("is made on the device, so it waits for the server's check until it first plays online", () => {
    expect(make('Nyssa').unchecked).toBe(true)
  })

  it('takes the selected seat when it is empty, or else the first empty one', () => {
    const r = roster('Seren', null, 'Korrin', null)
    expect(seatForNew({ ...r, selected: 3 })).toBe(3)
    expect(seatForNew(r)).toBe(1)
    expect(seatForNew(roster('Seren', 'Bram', 'Korrin', 'Vessa'))).toBe(-1)
  })
})

describe('the seats around the fire', () => {
  it('seat a created character in an empty seat and select it', () => {
    const c = make('Nyssa')
    const next = rosterReducer(roster('Seren', null, 'Bram'), { type: 'create', slot: 1, character: c })
    expect(names(next)).toEqual(['Seren', 'Nyssa', 'Bram', null])
    expect(selectedCharacter(next)).toBe(c)
  })

  it("won't seat anyone in a taken seat, off the circle, or with a name already used", () => {
    const start = roster('Seren', null)
    expect(rosterReducer(start, { type: 'create', slot: 0, character: make('Nyssa') })).toBe(start)
    expect(rosterReducer(start, { type: 'create', slot: SLOT_COUNT, character: make('Nyssa') })).toBe(start)
    expect(rosterReducer(start, { type: 'create', slot: 1, character: make('SEREN') })).toBe(start)
  })

  it('leave an empty seat when a character is deleted, and keep everyone else in place', () => {
    let r = rosterReducer(roster('Seren', 'Bram', 'Vessa'), { type: 'select', slot: 1 })
    r = rosterReducer(r, { type: 'delete', slot: 1 })
    expect(names(r)).toEqual(['Seren', null, 'Vessa', null])
    expect(r.selected).toBe(1)
    expect(selectedCharacter(r)).toBeNull()
    expect(rosterReducer(r, { type: 'delete', slot: 1 })).toBe(r)
  })

  it('step around every seat with the arrows, empty ones too, wrapping around', () => {
    const r = roster('Seren', null, 'Bram')
    expect(rosterReducer(r, { type: 'step', by: 1 }).selected).toBe(1)
    expect(rosterReducer(r, { type: 'step', by: -1 }).selected).toBe(SLOT_COUNT - 1)
    expect(rosterReducer({ ...r, selected: SLOT_COUNT - 1 }, { type: 'step', by: 1 }).selected).toBe(0)
  })

  it('select only a seat on the circle', () => {
    const r = roster('Seren')
    expect(rosterReducer(r, { type: 'select', slot: 2 }).selected).toBe(2)
    expect(rosterReducer(r, { type: 'select', slot: -1 })).toBe(r)
    expect(rosterReducer(r, { type: 'select', slot: SLOT_COUNT })).toBe(r)
  })

  it('mark a character played offline, and the server check clears every mark', () => {
    let r = rosterReducer(roster('Seren', 'Bram'), { type: 'play', slot: 1, offline: true })
    expect(uncheckedCount(r)).toBe(1)
    expect(rosterReducer(r, { type: 'play', slot: 0, offline: false })).toBe(r)
    expect(rosterReducer(r, { type: 'play', slot: 3, offline: true })).toBe(r)
    r = rosterReducer(r, { type: 'check' })
    expect(uncheckedCount(r)).toBe(0)
    expect(characters(r).every((c) => !('unchecked' in c))).toBe(true)
    expect(rosterReducer(r, { type: 'check' })).toBe(r)
  })
})

describe('the saved seats', () => {
  it('start from the samples on a first visit, or when they are unreadable', () => {
    expect(readRoster(null)).toEqual(sampleRoster())
    expect(readRoster('{oops')).toEqual(sampleRoster())
    expect(readRoster('"text"')).toEqual(sampleRoster())
  })

  it('read back what was saved, empty seats included', () => {
    let r = rosterReducer(sampleRoster(), { type: 'create', slot: 2, character: make('Nyssa') })
    r = rosterReducer(r, { type: 'delete', slot: 0 })
    expect(readRoster(JSON.stringify(r))).toEqual(r)
  })

  it('empty the seats of characters that no longer make sense, and fix what they can', () => {
    const good = { id: 'a', name: 'Seren', level: 99, artifact: 'spear', zone: '', appearance: { body: 7, skin: 2 } }
    const stored = {
      slots: [{ ...good, id: 'b', artifact: 'removed-weapon' }, good, { ...good, id: 'c', name: 'SEREN' }, 'junk', good],
      selected: 9,
    }
    expect(readRoster(JSON.stringify(stored))).toEqual({
      slots: [
        null,
        {
          id: 'a',
          name: 'Seren',
          level: 60,
          artifact: 'spear',
          zone: STARTING_ZONE,
          appearance: { body: 0, skin: 2, hair: 0, hairColor: 0 },
        },
        null,
        null,
      ],
      selected: 0,
    })
  })
})
