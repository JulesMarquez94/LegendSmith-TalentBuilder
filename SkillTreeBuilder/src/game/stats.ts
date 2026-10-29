import type { CharStat, CharStats } from './types.ts'

/**
 * A level 60 hero with nothing equipped. Health matches the overview's character screen (2,400 +
 * trinkets). Health and Power grow with level: see `levelShare` and `levelPower`.
 */
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
  damageDone: 0,
  damageReduction: 0,
  dodge: 0,
  parry: 0,
  healingTaken: 0,
  speed: 0,
  maxResource: 0,
  resourceRegen: 0,
  resourceRegenPct: 0,
  resourceWhenHit: 0,
  resourceOnParry: 0,
  spareChance: 0,
  comboBonus: 0,
  splash: 0,
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
  health: {
    label: 'Health',
    color: '#ffffff',
    unit: 'flat',
    help: 'Flat. From your level (800 at level 1, 2,400 at 60) and trinket item level.',
  },
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
    help:
      'Your base: from your level (+0% at 1, +200% at 60) and trinket item level, nothing else. Every heal, shield ' +
      'and damage number is its base × (1 + Power); talents and other bonuses multiply on top.',
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
  damageDone: {
    label: 'Damage',
    color: '#ff9a5c',
    unit: '%',
    help: 'More damage you deal, multiplying on top of Power. Group buffs give it; it is never Power itself.',
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
  parry: {
    label: 'Parry',
    color: '#d39a5e',
    unit: '%',
    help: "Chance to turn aside an enemy's melee swing, so it does nothing. Never on items: weapons and talents give it.",
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
  resourceRegenPct: {
    label: '@Resource regen bonus',
    color: '#5aa9ff',
    unit: '%',
    help: 'More @resource per second, as a share of your maximum.',
  },
  resourceWhenHit: {
    label: '@Resource when hit',
    color: '#5aa9ff',
    unit: 'flat',
    help: "@Resource you gain each time an enemy's hit lands on you, even one a shield soaks.",
  },
  resourceOnParry: {
    label: '@Resource per parry',
    color: '#5aa9ff',
    unit: 'flat',
    help: '@Resource you gain each time you parry a swing.',
  },
  spareChance: {
    label: 'Spare chance',
    color: '#a6e65a',
    unit: '%',
    help: 'Chance that each minion you sacrifice to pay for an ability survives, and isn’t spent.',
  },
  splash: {
    label: 'Splash',
    color: '#8fd3ff',
    unit: '%',
    help: 'Your ranged single-target hits also hit every enemy within 8 yd of their target for this share of the damage.',
  },
  comboBonus: {
    label: 'Combo bonus',
    color: '#ff7a7a',
    unit: '%',
    help: 'Each step past the first that an ability pays for adds this much on top of its usual 100%.',
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
    unit: '%',
    help: 'Extra @resource per second while you stand in one of your zones, as a share of your maximum.',
  },
}

/** Fills "@Resource" with the artifact's resource name ("Mana") and "@resource" with it in lower case. */
export const withResource = (text: string, resource: string) =>
  text.replaceAll('@Resource', resource).replaceAll('@resource', resource.toLowerCase())

/** The stat sheet, in sections. The top block shows Power, Health and the resource. */
export const SHEET_SECTIONS: readonly { title: string; stats: readonly CharStat[] }[] = [
  { title: 'Secondary', stats: ['haste', 'crit', 'critDamage', 'potency'] },
  { title: 'Defensive', stats: ['damageReduction', 'dodge', 'parry', 'healthPct', 'healingTaken'] },
  {
    title: 'Extra',
    stats: [
      'echo',
      'minionPower',
      'damageDone',
      'speed',
      'comboBonus',
      'splash',
      'resourceRegenPct',
      'resourceWhenHit',
      'resourceOnParry',
      'spareChance',
      'overhealToResource',
      'lowResourceRegen',
      'zoneResourceRegen',
    ],
  },
]

/** Shown only once something gives them: a talent, a group buff or the weapon (the Greatsword's parry). */
export const TALENT_ONLY: ReadonlySet<CharStat> = new Set<CharStat>([
  'parry',
  'resourceWhenHit',
  'resourceOnParry',
  'spareChance',
  'overhealToResource',
  'lowResourceRegen',
  'zoneResourceRegen',
  'resourceRegenPct',
  'comboBonus',
  'splash',
  'healthPct',
  'healingTaken',
  'damageDone',
])
