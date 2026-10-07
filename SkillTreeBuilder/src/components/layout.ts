// Tree panel geometry, measured in inches off the deck's tree slide.
// 1 unit = var(--u) in CSS, so the whole panel scales from that one variable.
export const PANEL_WIDTH = 3
export const ICON = 0.4
const PITCH = 0.6
const GRID_LEFT = 0.4
const GRID_TOP = 1.22
const BOTTOM = 0.58

const round = (n: number) => Math.round(n * 1000) / 1000

export const iconX = (col: number) => round(GRID_LEFT + col * PITCH)
export const iconY = (row: number) => round(GRID_TOP + row * PITCH)
export const panelHeight = (rows: number) => round(iconY(rows - 1) + ICON + BOTTOM)

/** A length in panel units, for inline styles. */
export const u = (n: number) => `calc(var(--u) * ${n})`
