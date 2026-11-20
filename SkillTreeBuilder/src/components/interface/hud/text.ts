// Words and numbers the HUD parts write, kept out of the component files.

import type { HudSettings } from './settings.ts'
import { barText, KEYS, type KeyPrompt, type Scheme } from './unity.ts'

type BarTextSetting = HudSettings['player']['text']

/** The numbers on a bar, as its setting asks: "850 / 1000", "85%", both, or none. */
export function barLabel(current: number, max: number, how: BarTextSetting): string {
  const percent = `${max > 0 ? Math.round((Math.max(0, current) / max) * 100) : 0}%`
  switch (how) {
    case 'value':
      return barText(current, max)
    case 'percent':
      return percent
    case 'both':
      return `${barText(current, max)} · ${percent}`
    case 'none':
      return ''
  }
}

export const fill = (current: number, max: number) => `${max > 0 ? Math.max(0, Math.min(1, current / max)) * 100 : 0}%`

export const keyOf = (key: KeyPrompt | null, scheme: Scheme) => (key ? key[scheme] : '')

export type MicroAction = 'character' | 'bags' | 'map' | 'menu'

export const MICRO: readonly { id: MicroAction; name: string; glyph: string; key: KeyPrompt }[] = [
  { id: 'character', name: 'Character', glyph: '☺', key: KEYS.character },
  { id: 'bags', name: 'Bags', glyph: '▣', key: { keyboard: 'B', gamepad: '—' } },
  { id: 'map', name: 'Map', glyph: '◈', key: { keyboard: 'M', gamepad: '—' } },
  { id: 'menu', name: 'Menu', glyph: '≡', key: KEYS.menu },
]

