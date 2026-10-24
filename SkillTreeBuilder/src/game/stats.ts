import type { CharStat, CharStats } from './types.ts'

/** A level 60 hero with nothing equipped. Health matches the overview's character screen (2,400 + trinkets). */
export const BASE_STATS: CharStats = {
  health: 2400,
  healthPct: 0,
  power: 0,
  haste: 0,
  crit: 5,
  critDamage: 50,
  potency: 0,
  echo: 0,
  minionPower: 0,
  damageReduction: 0,
  dodge: 0,
  healingTaken: 0,
  speed: 0,
  maxResource: 0,
  resourceRegen: 0,
  overhealToResource: 0,
  lowResourceRegen: 0,
  zoneResourceRegen: 0,
}

/** Run speed in yards per second before Speed bonuses (WoW's 7). */
export const RUN_SPEED = 7

/** Global cooldowns never drop below this, however much Haste you have. */
export const MIN_GCD = 0.5

export interface StatInfo {
  /** "@Resource" stands for the artifact's resource name ("Mana"), "@resource" for it in lower case. */
  label: string
  /** Colour from the overview's stat palette, so a stat reads the same everywhere. */
  color: string
  unit: '%' | 'flat' | 'per-sec'
  /** One line for the stat's tooltip; "@resource" works here too. */
  help: string
}

export const STAT_INFO: Record<CharStat, StatInfo> = {
  health: { label: 'Health', color: '#ffffff', unit: 'flat', help: 'Flat. Mostly from trinket item level.' },
  healthPct: {
    label: 'Max health',
    color: '#8fe3a0',
    unit: '%',
    help: 'More maximum health, on top of the flat Health. Group buffs give it to everyone in your group.',
  },
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
  dodge: {
    label: 'Dodge',
    color: '#9fe7ff',
    unit: '%',
    help: 'Chance to avoid a hit completely. Every hit rolls on its own.',
  },
  healingTaken: {
    label: 'Healing received',
    color: '#8fe3a0',
    unit: '%',
    help: 'More healing from every heal, HoT and zone that lands on you.',
  },
  speed: {
    label: 'Speed',
    color: '#c6d0ff',
    unit: '%',
    help: `Faster movement. ${RUN_SPEED} yd per sec at 0%. Never on items.`,
  },
  maxResource: {
    label: '@Resource',
    color: '#5aa9ff',
    unit: 'flat',
    help: 'Most @resource you can hold. Set by the artifact and talents.',
  },
  resourceRegen: {
    label: '@Resource regen',
    color: '#5aa9ff',
    unit: 'per-sec',
    help: '@Resource per second, always on.',
  },
  overhealToResource: {
    label: 'Reservoir',
    color: '#5aa9ff',
    unit: '%',
    help: 'Share of overhealing stored and given back as @resource by your next main attack (80 at most).',
  },
  lowResourceRegen: {
    label: 'Low-@resource regen',
    color: '#5aa9ff',
    unit: '%',
    help: 'Stronger @resource regeneration while below 30% of your maximum.',
  },
  zoneResourceRegen: {
    label: 'Zone @resource regen',
    color: '#5aa9ff',
    unit: 'per-sec',
    help: 'Extra @resource per second while you stand in one of your zones.',
  },
}

/** Fills "@Resource" with the artifact's resource name ("Mana") and "@resource" with it in lower case. */
export const withResource = (text: string, resource: string) =>
  text.replaceAll('@Resource', resource).replaceAll('@resource', resource.toLowerCase())

/** The stat sheet, in sections. The top block shows Power, Health and the resource. */
export const SHEET_SECTIONS: readonly { title: string; stats: readonly CharStat[] }[] = [
  { title: 'Secondary', stats: ['haste', 'crit', 'critDamage', 'potency'] },
  { title: 'Defensive', stats: ['damageReduction', 'dodge', 'healthPct', 'healingTaken'] },
  { title: 'Extra', stats: ['echo', 'minionPower', 'speed', 'overhealToResource', 'lowResourceRegen', 'zoneResourceRegen'] },
]

/** Shown only once a talent or group buff gives them. */
export const TALENT_ONLY: ReadonlySet<CharStat> = new Set<CharStat>([
  'overhealToResource',
  'lowResourceRegen',
  'zoneResourceRegen',
  'healthPct',
  'healingTaken',
])
