import type { PointRules } from './loadout.ts'

// You start at level 1 with only slot 1 (the artifact, on the left mouse button). Levels 2 to 8 each
// open the next slot, the character skill tree last; every level after that gives a talent point.

export const MAX_LEVEL = 60

/** Levels that open slots, one each: slot 1 at level 1 … slot 8 at level 8. */
export const SLOT_LEVELS = 8

/** The level that opens a slot (0-based index). */
export const slotLevel = (index: number) => index + 1

export const isSlotOpen = (index: number, level: number) => level >= slotLevel(index)

/** Talent points at a level: none up to 8, then one a level, 52 at 60. */
export const pointsAt = (level: number) => Math.max(0, Math.min(level, MAX_LEVEL) - SLOT_LEVELS)

/**
 * How much stronger a level 60 hero is than a level 1: three times the Health and three times the
 * damage, healing and shields. Ability numbers, item Power and buffs are written for level 60.
 */
export const LEVEL_GROWTH = 3

/** A level's share of level 60's Health and power: a third at level 1, growing evenly to all of it. */
export const levelShare = (level: number) =>
  (1 + ((LEVEL_GROWTH - 1) * (Math.min(Math.max(level, 1), MAX_LEVEL) - 1)) / (MAX_LEVEL - 1)) / LEVEL_GROWTH

/** The Power a level gives on its own: +0% at level 1, +200% at level 60. */
export const levelPower = (level: number) => Math.round((levelShare(level) * LEVEL_GROWTH - 1) * 1000) / 10

/** The point rules at a level: its points to spend, the same per-tree caps. */
export const rulesAt = (rules: PointRules, level: number): PointRules => ({
  ...rules,
  total: Math.min(rules.total, pointsAt(level)),
})
