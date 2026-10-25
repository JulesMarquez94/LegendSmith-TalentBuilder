import type { ReactNode } from 'react'
import { STAT_INFO } from '../game/stats.ts'
import type { CharStat } from '../game/types.ts'

// One small glyph per gear stat, drawn on a 24×24 grid in the stat's colour. They mark equipped
// trinkets, item cards, the forge's stat buttons and the stat sheet.

const GLYPHS: Partial<Record<CharStat, ReactNode>> = {
  // Haste: a lightning bolt.
  haste: <path d="M13.5 1.5 4 13.5h6.2L9 22.5l10-12.5h-6.4z" />,
  // Critical: a crosshair on its mark.
  crit: (
    <>
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  // Crit damage: a burst.
  critDamage: <path d="m12 1 2.3 7.4 7.2-2.5-4.6 6.1 4.6 6.1-7.2-2.5L12 23l-2.3-7.4-7.2 2.5 4.6-6.1-4.6-6.1 7.2 2.5z" />,
  // Potency: an hourglass, for effects that last longer.
  potency: (
    <>
      <path
        d="M6 2.5h12M6 21.5h12M7.5 2.5c0 4.5 4.5 6.5 4.5 9.5s-4.5 5-4.5 9.5M16.5 2.5c0 4.5-4.5 6.5-4.5 9.5s4.5 5 4.5 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M8.6 20.5c.6-2.4 2.3-3.6 3.4-4.4 1.1.8 2.8 2 3.4 4.4z" />
    </>
  ),
  // Echo: a sound ringing out twice.
  echo: (
    <>
      <circle cx="12" cy="12" r="2.6" />
      <path
        d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.6 4.6a10.5 10.5 0 0 0 0 14.8M19.4 4.6a10.5 10.5 0 0 1 0 14.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  ),
  // Minion power: a skull, for the minions you command.
  minionPower: (
    <path
      fillRule="evenodd"
      d="M12 2C7 2 3.8 5.6 3.8 10.2c0 2.8 1.3 4.9 3.2 6v3.3c0 .6.4 1 1 1h1.6v-2.2h1.6v2.2h1.6v-2.2h1.6v2.2H16c.6 0 1-.4 1-1v-3.3c1.9-1.1 3.2-3.2 3.2-6C20.2 5.6 17 2 12 2zM6.8 10.8a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 1 0-4.4 0zm6 0a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 1 0-4.4 0z"
    />
  ),
}

interface Props {
  stat: CharStat
  size?: number
  /** Take the colour from the surrounding text instead of the stat's own (a pressed chip). */
  plain?: boolean
}

/** A stat's icon, or nothing for stats that don't have one. */
export function StatIcon({ stat, size = 16, plain = false }: Props) {
  const glyph = GLYPHS[stat]
  if (!glyph) return null
  return (
    <svg
      className="stat-icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      style={plain ? undefined : { color: STAT_INFO[stat].color }}
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  )
}
