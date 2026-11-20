import { describe, expect, it } from 'vitest'
import { raceOf, RACES, startOf, STARTING_POINTS } from './origins.ts'

describe('races and starting points', () => {
  it('have at least one choice each, with different ids', () => {
    for (const list of [RACES, STARTING_POINTS]) {
      expect(list.length).toBeGreaterThan(0)
      expect(new Set(list.map((o) => o.id)).size).toBe(list.length)
    }
  })

  it('start with humans at Wakeyard', () => {
    expect(RACES.map((r) => r.name)).toContain('Human')
    expect(STARTING_POINTS.map((s) => s.name)).toContain('Wakeyard')
  })

  it('fall back to the first choice for an id that is gone', () => {
    expect(raceOf('orc')).toBe(RACES[0])
    expect(startOf('nowhere')).toBe(STARTING_POINTS[0])
    expect(startOf(STARTING_POINTS[0].id)).toBe(STARTING_POINTS[0])
  })
})
