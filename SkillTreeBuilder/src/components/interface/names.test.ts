import { describe, expect, it } from 'vitest'
import { formatName, fullName, hasProblem, NAME_MAX, nameProblems, partProblem } from './names.ts'

const none = { yours: [] }

describe('each part of a name', () => {
  it('shows with a capital first letter and the rest lower case, trimmed', () => {
    expect(formatName('  bRYNN ')).toBe('Brynn')
    expect(formatName('élodie')).toBe('Élodie')
    expect(formatName('')).toBe('')
  })

  it('is one word of letters, accented ones too', () => {
    expect(partProblem('Seren')).toBeNull()
    expect(partProblem('  seren  ')).toBeNull()
    expect(partProblem('Zoë')).toBeNull()
    expect(partProblem('')).toBe('Required.')
    expect(partProblem('   ')).toBe('Required.')
    expect(partProblem('Big Bob')).toMatch(/no spaces/)
    expect(partProblem('Bob2')).toMatch(/Letters only/)
    expect(partProblem('Bo-b')).toMatch(/Letters only/)
  })

  it(`is 2 to ${NAME_MAX} letters long`, () => {
    expect(partProblem('A')).toMatch(/Too short/)
    expect(partProblem('Al')).toBeNull()
    expect(partProblem('Abcdefghijkl')).toBeNull()
    expect(partProblem('Abcdefghijklm')).toMatch(/Too long/)
  })

  it("can't have a letter three times in a row, or be a reserved word, whatever the case", () => {
    expect(partProblem('Aaron')).toBeNull()
    expect(partProblem('Aaaron')).toMatch(/three times/)
    expect(partProblem('ADMIN')).toMatch(/reserved/)
    expect(partProblem('Legendsmith')).toMatch(/reserved/)
  })
})

describe('a full name', () => {
  it('is the name and surname as they show, and an old one may have no surname', () => {
    expect(fullName('seren', 'ASHDOWN')).toBe('Seren Ashdown')
    expect(fullName('Seren')).toBe('Seren')
  })

  it('needs both parts to be good, and says which one is not', () => {
    expect(nameProblems('Seren', 'Ashdown', none)).toEqual({ name: null, surname: null, full: null })
    expect(nameProblems('Seren', '', none)).toEqual({ name: null, surname: 'Required.', full: null })
    expect(nameProblems('S', 'Ash down', none)).toMatchObject({
      name: expect.stringMatching(/short/),
      surname: expect.stringMatching(/spaces/),
    })
    expect(hasProblem(nameProblems('', '', none))).toBe(true)
  })

  it("can't be yours already or someone else's, whatever the case, but either part alone can repeat", () => {
    expect(nameProblems('seren', 'ashdown', { yours: ['Seren Ashdown'] }).full).toMatch(/your characters/)
    expect(nameProblems('wren', 'FAIRWEATHER', { yours: [], others: ['Wren Fairweather'] }).full).toMatch(/Someone/)
    expect(hasProblem(nameProblems('Seren', 'Blackwood', { yours: ['Seren Ashdown'] }))).toBe(false)
    expect(hasProblem(nameProblems('Wren', 'Ashdown', { yours: [], others: ['Wren Fairweather'] }))).toBe(false)
  })
})
