// Where a new character comes from: its race and its starting point. Each has one choice for now,
// and the creation screen already shows them as choices, so adding one (orcs, another starting
// point) is adding an entry here.

export interface Race {
  id: string
  name: string
}

export interface StartingPoint {
  id: string
  name: string
  /** The zone a character starts in, and so where it logs out until it moves on. */
  zone: string
}

/** Orcs and others come later. */
export const RACES: readonly Race[] = [{ id: 'human', name: 'Human' }]

/** More starting points come later. */
export const STARTING_POINTS: readonly StartingPoint[] = [{ id: 'wakeyard', name: 'Wakeyard', zone: 'Wakeyard' }]

/** A race by id, or the first one when it's unknown (removed since a character was saved). */
export const raceOf = (id: string): Race => RACES.find((r) => r.id === id) ?? RACES[0]

/** A starting point by id, or the first one when it's unknown. */
export const startOf = (id: string): StartingPoint => STARTING_POINTS.find((s) => s.id === id) ?? STARTING_POINTS[0]
