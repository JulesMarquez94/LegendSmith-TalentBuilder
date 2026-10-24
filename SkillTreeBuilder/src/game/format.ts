import type { CharStat } from './types.ts'
import { STAT_INFO } from './stats.ts'

const trim = (n: number, digits: number) => String(Number(n.toFixed(digits)))

/** 1234.4 → "1,234" */
export const int = (n: number) => Math.round(n).toLocaleString('en-US')

/** Seconds: 1.5 → "1.5", 1.6667 → "1.67", 12 → "12" */
export const sec = (n: number) => trim(n, 2)

/** 12.345 → "12.3" (no % sign) */
export const pct = (n: number) => trim(n, 1)

/** Yards: 8 → "8", 10.5 → "10.5" */
export const yd = (n: number) => trim(n, 1)

/** A stat value with its unit: "+12.6%", "13,800", "10 /sec". */
export function statValue(stat: CharStat, n: number): string {
  const { unit } = STAT_INFO[stat]
  if (unit === '%') return `${pct(n)}%`
  if (unit === 'per-sec') return `${trim(n, 1)} /sec`
  return int(n)
}

/**
 * Per-rank values in the "{a/b/c}" form talent descriptions use: [6, 12, 18] → "{6/12/18}",
 * [1200, 2400] → "{1,200/2,400}".
 */
export const ranks = (values: readonly number[]) =>
  `{${values.map((v) => (Math.abs(v) >= 1000 ? int(v) : trim(v, 2))).join('/')}}`
