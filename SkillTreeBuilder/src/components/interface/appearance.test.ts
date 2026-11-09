import { describe, expect, it } from 'vitest'
import {
  APPEARANCE_ROWS,
  cleanAppearance,
  cycle,
  DEFAULT_APPEARANCE,
  describeAppearance,
  randomAppearance,
} from './appearance.ts'

describe('appearance', () => {
  it('cycles each row through its options, wrapping around', () => {
    const hairs = APPEARANCE_ROWS.find((r) => r.key === 'hair')!.options.length
    expect(cycle(DEFAULT_APPEARANCE, 'hair', -1).hair).toBe(hairs - 1)
    expect(cycle({ ...DEFAULT_APPEARANCE, hair: hairs - 1 }, 'hair', 1).hair).toBe(0)
    expect(cycle(DEFAULT_APPEARANCE, 'skin', 1)).toEqual({ ...DEFAULT_APPEARANCE, skin: DEFAULT_APPEARANCE.skin + 1 })
  })

  it('randomizes within every row', () => {
    expect(randomAppearance(() => 0)).toEqual({ body: 0, skin: 0, hair: 0, hairColor: 0 })
    const last = randomAppearance(() => 0.999)
    for (const row of APPEARANCE_ROWS) expect(last[row.key]).toBe(row.options.length - 1)
  })

  it('turns stored junk into the first option', () => {
    expect(cleanAppearance(null)).toEqual({ body: 0, skin: 0, hair: 0, hairColor: 0 })
    expect(cleanAppearance({ body: 1, skin: 1.5, hair: -1, hairColor: 2 })).toEqual({ body: 1, skin: 0, hair: 0, hairColor: 2 })
  })

  it('reads as one line', () => {
    expect(describeAppearance({ body: 1, skin: 0, hair: 1, hairColor: 2 })).toBe('Slender · Fair skin · Long, chestnut hair')
    expect(describeAppearance({ body: 0, skin: 0, hair: 3, hairColor: 2 })).toBe('Broad · Fair skin · Shaved head')
  })
})
