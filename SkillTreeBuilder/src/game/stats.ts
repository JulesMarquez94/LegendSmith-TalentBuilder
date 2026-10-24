import type { CharStat, CharStats } from './types.ts'

/** A level 60 hero with nothing equipped. Health matches the overview's character screen (2,400 + trinkets). */
export const BASE_STATS: CharStats = {
  health: 2400,
  power: 0,
  haste: 0,
  crit: 5,
  critDamage: 50,
  potency: 0,
  echo: 0,
  minionPower: 0,
  damageReduction: 0,
  speed: 0,
  maxMana: 0,
  manaRegen: 0,
  overhealToMana: 0,
  lowManaRegen: 0,
  zoneManaRegen: 0,
}

/** Run speed in yards per second before Speed bonuses (WoW's 7). */
export const RUN_SPEED = 7

/** Global cooldowns never drop below this, however much Haste you have. */
export const MIN_GCD = 0.5

export interface StatInfo {
  label: string
  /** Colour from the overview's stat palette, so a stat reads the same everywhere. */
  color: string
  unit: '%' | 'flat' | 'per-sec'
  /** One line for the stat's tooltip. */
  help: string
}

export const STAT_INFO: Record<CharStat, StatInfo> = {
  health: { label: 'Health', color: '#ffffff', unit: 'flat', help: 'Flat. Mostly from trinket item level.' },
  power: {
    label: 'Power',
    color: '#ffffff',
    unit: '%',
    help: 'Raises every heal, shield and damage number. From trinket item level.',
  },
  haste: {
    label: 'Haste',
    color: '#ffd23f',
    unit: '%',
    help: 'Faster casts, global cooldown and ticks. Never shortens a duration, so HoTs and zones fit in more ticks.',
  },
  crit: { label: 'Critical', color: '#ff5c7c', unit: '%', help: 'Chance for any heal, tick or hit to critically strike.' },
  critDamage: {
    label: 'Crit damage',
    color: '#ff9f43',
    unit: '%',
    help: 'How much more a critical strike does. 50% means crits land for 150%.',
  },
  potency: {
    label: 'Potency',
    color: '#3ddcc8',
    unit: '%',
    help: 'Longer HoTs, zones, shields and buffs. Duration × (1 + Potency).',
  },
  echo: { label: 'Echo', color: '#b79cff', unit: '%', help: 'Chance for an ability to be cast a second time for free.' },
  minionPower: {
    label: 'Minion power',
    color: '#a6e65a',
    unit: '%',
    help: 'More damage per active minion. The healer kit has no minions, so it does nothing here.',
  },
  damageReduction: {
    label: 'Damage reduction',
    color: '#00afd7',
    unit: '%',
    help: 'Less damage taken. Never on items: only abilities, talents and buffs.',
  },
  speed: {
    label: 'Speed',
    color: '#c6d0ff',
    unit: '%',
    help: `Faster movement. ${RUN_SPEED} yd per sec at 0%. Never on items.`,
  },
  maxMana: { label: 'Mana', color: '#5aa9ff', unit: 'flat', help: 'Most mana you can hold. Set by the staff and talents.' },
  manaRegen: { label: 'Mana regen', color: '#5aa9ff', unit: 'per-sec', help: 'Mana per second, always on.' },
  overhealToMana: {
    label: 'Reservoir',
    color: '#5aa9ff',
    unit: '%',
    help: 'Share of overhealing stored and given back as mana by your next main attack (100 at most).',
  },
  lowManaRegen: {
    label: 'Low-mana regen',
    color: '#5aa9ff',
    unit: '%',
    help: 'Stronger mana regeneration while below 30% mana.',
  },
  zoneManaRegen: {
    label: 'Zone mana regen',
    color: '#5aa9ff',
    unit: 'per-sec',
    help: 'Extra mana per second while you stand in one of your zones.',
  },
}

/** The stat sheet's order. Stats at 0 that only talents give are hidden by the sheet. */
export const SHEET_ORDER: readonly CharStat[] = [
  'power',
  'haste',
  'crit',
  'critDamage',
  'potency',
  'echo',
  'minionPower',
  'damageReduction',
  'speed',
  'overhealToMana',
  'lowManaRegen',
  'zoneManaRegen',
]
