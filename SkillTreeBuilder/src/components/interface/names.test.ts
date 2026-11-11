import { describe, expect, it } from 'vitest'
import { formatName, NAME_MAX, nameProblem } from './names.ts'

const none = { yours: [] }

describe('character names', () => {
  it('show with a capital first letter and the rest lower case, trimmed', () => {
    expect(formatName('  bRYNN ')).toBe('Brynn')
    expect(formatName('élodie')).toBe('Élodie')
    expect(formatName('')).toBe('')
  })

  it('take one word of letters, accented ones too', () => {
    expect(nameProblem('Seren', none)).toBeNull()
    expect(nameProblem('  seren  ', none)).toBeNull()
    expect(nameProblem('Zoë', none)).toBeNull()
    expect(nameProblem('', none)).toBe('Enter a name.')
    expect(nameProblem('   ', none)).toBe('Enter a name.')
    expect(nameProblem('Big Bob', none)).toMatch(/no spaces/)
    expect(nameProblem('Bob2', none)).toMatch(/Letters only/)
    expect(nameProblem('Bo-b', none)).toMatch(/Letters only/)
  })

  it(`are 2 to ${NAME_MAX} letters long`, () => {
    expect(nameProblem('A', none)).toMatch(/Too short/)
    expect(nameProblem('Al', none)).toBeNull()
    expect(nameProblem('Abcdefghijkl', none)).toBeNull()
    expect(nameProblem('Abcdefghijklm', none)).toMatch(/Too long/)
  })

  it("can't have a letter three times in a row, whatever its case", () => {
    expect(nameProblem('Aaron', none)).toBeNull()
    expect(nameProblem('Aaaron', none)).toMatch(/three times/)
    expect(nameProblem('Brynnn', none)).toMatch(/three times/)
  })

  it("can't be reserved, yours already, or (online) someone else's, whatever the case", () => {
    expect(nameProblem('ADMIN', none)).toMatch(/reserved/)
    expect(nameProblem('Legendsmith', none)).toMatch(/reserved/)
    expect(nameProblem('seren', { yours: ['Seren'] })).toMatch(/your characters/)
    expect(nameProblem('wren', { yours: [], others: ['Wren'] })).toMatch(/server/)
    expect(nameProblem('Wren', { yours: [] })).toBeNull()
  })
})
