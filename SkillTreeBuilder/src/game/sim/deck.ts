/**
 * Chances are dealt from a deck, not rolled. A 1% chance is a deck of 100 cards with one winner:
 * every time the chance comes up, a card is drawn and discarded, and once all 100 are gone the deck
 * is shuffled whole again. So a 1% chance comes up exactly once in every 100 tries, a 25% chance 25
 * times, and a streak of bad luck can't last past the end of a deck.
 *
 * Every source of chance (an ability's crits, a talent's proc, your dodge) draws from its own deck.
 * If the chance changes partway through a deck (more crit from a buff), the winners left are
 * recounted from the new chance, less the ones already drawn.
 */
export class Decks {
  private readonly decks = new Map<string, { drawn: number; won: number }>()
  private readonly rng: () => number
  /** Cards in a deck. */
  readonly size: number

  constructor(rng: () => number, size = 100) {
    this.rng = rng
    this.size = size
  }

  /** Draws a card from `key`'s deck: true on a winner. `pct` is the chance, 0–100. */
  draw(key: string, pct: number): boolean {
    if (pct <= 0) return false
    if (pct >= 100) return true
    const deck = this.decks.get(key) ?? { drawn: 0, won: 0 }
    const winnersLeft = Math.max(0, (pct / 100) * this.size - deck.won)
    const win = this.rng() * (this.size - deck.drawn) < winnersLeft
    deck.drawn += 1
    if (win) deck.won += 1
    if (deck.drawn >= this.size) {
      deck.drawn = 0
      deck.won = 0
    }
    this.decks.set(key, deck)
    return win
  }
}
