import { describe, expect, it } from 'vitest'
import { ARTIFACTS } from '../../trees/index.ts'
import { DEFAULT_APPEARANCE } from './appearance.ts'
import { SAMPLE_CHARACTERS, STARTING_ZONE, TAKEN_NAMES } from './fake.ts'
import { nameProblem } from './names.ts'
import {
  MAX_CHARACTERS,
  newCharacter,
  readRoster,
  rosterReducer,
  sampleRoster,
  selectedCharacter,
  uncheckedCount,
  type Character,
  type Roster,
} from './roster.ts'

const make = (name: string, offline = false): Character =>
  newCharacter({ name, artifact: 'spear', appearance: DEFAULT_APPEARANCE, offline })

const roster = (...names: string[]): Roster => {
  const characters = names.map((n) => ({ ...make(n), id: n.toLowerCase() }))
  return { characters, selected: characters[0]?.id ?? null }
}

describe('the sample characters', () => {
  it('have valid, different names and hold real artifacts', () => {
    const names = SAMPLE_CHARACTERS.map((c) => c.name)
    SAMPLE_CHARACTERS.forEach((c, i) => {
      expect(nameProblem(c.name, { yours: names.filter((_, j) => j !== i), others: TAKEN_NAMES })).toBeNull()
      expect(ARTIFACTS.some((a) => a.id === c.artifact)).toBe(true)
    })
  })

  it('fill one seat each', () => {
    const roles = SAMPLE_CHARACTERS.map((c) => ARTIFACTS.find((a) => a.id === c.artifact)!.role)
    expect(new Set(roles)).toEqual(new Set(['tank', 'healer', 'damage']))
  })
})

describe('a new character', () => {
  it('starts at level 1 in the starting zone, its name formatted', () => {
    const c = make('  nYSSA')
    expect(c).toMatchObject({ name: 'Nyssa', level: 1, zone: STARTING_ZONE, artifact: 'spear' })
    expect(c.unchecked).toBeUndefined()
  })

  it("made offline waits for the server's check", () => {
    expect(make('Nyssa', true).unchecked).toBe(true)
  })
})

describe('the character list', () => {
  it('adds a created character at the end and selects it', () => {
    const c = make('Nyssa')
    const next = rosterReducer(roster('Seren', 'Bram'), { type: 'create', character: c })
    expect(next.characters.map((x) => x.name)).toEqual(['Seren', 'Bram', 'Nyssa'])
    expect(selectedCharacter(next)).toBe(c)
  })

  it(`won't take a name twice, or more than ${MAX_CHARACTERS} characters`, () => {
    const start = roster('Seren')
    expect(rosterReducer(start, { type: 'create', character: make('SEREN') })).toBe(start)
    const full = roster(...'Abby Bess Cora Dina Edda Fern Gwen Hope'.split(' '))
    expect(full.characters).toHaveLength(MAX_CHARACTERS)
    expect(rosterReducer(full, { type: 'create', character: make('Iris') })).toBe(full)
  })

  it('after a delete, selects the one below, or above when it was last, or nobody', () => {
    let r = rosterReducer(roster('Seren', 'Bram', 'Vessa'), { type: 'select', id: 'bram' })
    r = rosterReducer(r, { type: 'delete', id: 'bram' })
    expect(r.characters.map((c) => c.name)).toEqual(['Seren', 'Vessa'])
    expect(r.selected).toBe('vessa')
    r = rosterReducer(r, { type: 'delete', id: 'vessa' })
    expect(r.selected).toBe('seren')
    r = rosterReducer(r, { type: 'delete', id: 'seren' })
    expect(r).toEqual({ characters: [], selected: null })
  })

  it('keeps the selection when another character is deleted', () => {
    const r = rosterReducer(roster('Seren', 'Bram'), { type: 'delete', id: 'bram' })
    expect(r.selected).toBe('seren')
  })

  it('ignores an unknown character', () => {
    const r = roster('Seren')
    expect(rosterReducer(r, { type: 'select', id: 'nobody' })).toBe(r)
    expect(rosterReducer(r, { type: 'delete', id: 'nobody' })).toBe(r)
  })

  it('steps through the list with the arrows, wrapping around', () => {
    const r = roster('Seren', 'Bram', 'Vessa')
    const down = rosterReducer(r, { type: 'step', by: 1 })
    expect(down.selected).toBe('bram')
    expect(rosterReducer(r, { type: 'step', by: -1 }).selected).toBe('vessa')
    expect(rosterReducer({ ...r, selected: null }, { type: 'step', by: 1 }).selected).toBe('seren')
    expect(rosterReducer({ ...r, selected: null }, { type: 'step', by: -1 }).selected).toBe('vessa')
    const empty = roster()
    expect(rosterReducer(empty, { type: 'step', by: 1 })).toBe(empty)
  })

  it('marks a character played offline, and the server check clears every mark', () => {
    let r = rosterReducer(roster('Seren', 'Bram'), { type: 'play', id: 'bram', offline: true })
    expect(uncheckedCount(r)).toBe(1)
    expect(rosterReducer(r, { type: 'play', id: 'seren', offline: false })).toBe(r)
    r = rosterReducer(r, { type: 'check' })
    expect(uncheckedCount(r)).toBe(0)
    expect(r.characters.every((c) => !('unchecked' in c))).toBe(true)
    expect(rosterReducer(r, { type: 'check' })).toBe(r)
  })
})

describe('the saved character list', () => {
  it('starts from the samples on a first visit, or when it is unreadable', () => {
    expect(readRoster(null)).toEqual(sampleRoster())
    expect(readRoster('{oops')).toEqual(sampleRoster())
    expect(readRoster('"text"')).toEqual(sampleRoster())
  })

  it('reads back what was saved', () => {
    const r = rosterReducer(sampleRoster(), { type: 'create', character: make('Nyssa', true) })
    expect(readRoster(JSON.stringify(r))).toEqual(r)
  })

  it('stays empty once every character is deleted', () => {
    expect(readRoster(JSON.stringify({ characters: [], selected: null }))).toEqual({ characters: [], selected: null })
  })

  it('drops characters that no longer make sense, and fixes what it can', () => {
    const good = { id: 'a', name: 'Seren', level: 99, artifact: 'spear', zone: '', appearance: { body: 7, skin: 2 } }
    const stored = {
      characters: [
        good,
        { ...good, id: 'b', artifact: 'removed-weapon' },
        { ...good, id: 'c', name: 'Bad Name' },
        { ...good, id: 'd', name: 'SEREN' },
        { ...good, id: 'a', name: 'Other' },
        'junk',
      ],
      selected: 'b',
    }
    expect(readRoster(JSON.stringify(stored))).toEqual({
      characters: [
        {
          id: 'a',
          name: 'Seren',
          level: 60,
          artifact: 'spear',
          zone: STARTING_ZONE,
          appearance: { body: 0, skin: 2, hair: 0, hairColor: 0 },
        },
      ],
      selected: 'a',
    })
  })
})
