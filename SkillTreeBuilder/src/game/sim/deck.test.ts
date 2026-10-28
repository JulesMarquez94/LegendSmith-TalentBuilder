import { describe, expect, it } from 'vitest'
import { Decks } from './deck.ts'

/** Wins in `n` draws from one deck at a fixed chance. */
const wins = (decks: Decks, key: string, pct: number, n: number) => {
  let won = 0
  for (let i = 0; i < n; i++) if (decks.draw(key, pct)) won += 1
  return won
}

describe('chance decks', () => {
  it('deal a 1% chance exactly once in every 100 draws', () => {
    const decks = new Decks(Math.random)
    for (let deck = 0; deck < 20; deck++) expect(wins(decks, 'proc', 1, 100)).toBe(1)
  })

  it('deal a 25% chance 25 times in every 100 draws', () => {
    const decks = new Decks(Math.random)
    for (let deck = 0; deck < 20; deck++) expect(wins(decks, 'crit', 25, 100)).toBe(25)
  })

  it('never deal a 0% chance, and always a 100% one', () => {
    const decks = new Decks(Math.random)
    expect(wins(decks, 'none', 0, 100)).toBe(0)
    expect(wins(decks, 'all', 100, 100)).toBe(100)
  })

  it('keep a deck for every source', () => {
    const decks = new Decks(Math.random)
    let a = 0
    let b = 0
    for (let i = 0; i < 100; i++) {
      if (decks.draw('a', 10)) a += 1
      if (decks.draw('b', 30)) b += 1
    }
    expect([a, b]).toEqual([10, 30])
  })

  it('recount the winners left when the chance changes partway through a deck', () => {
    const decks = new Decks(Math.random)
    const first = wins(decks, 'crit', 10, 50)
    // 20% for the rest of the deck: 20 winners in all, less the ones already drawn.
    expect(first + wins(decks, 'crit', 20, 50)).toBe(20)
  })
})
