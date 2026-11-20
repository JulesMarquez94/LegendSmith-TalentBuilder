// Each HUD element's own options, as data: the edit mode draws a control for each, the HUD reads the
// values, and stored values are checked against it. Defaults match the Unity game where the element is
// in it (DEF_Nameplates, DEF_BossFrame, the HUD's USS).

import type { HudId } from './layout.ts'
import type { Scheme } from './unity.ts'

export interface ToggleOption {
  type: 'toggle'
  label: string
  default: boolean
}

export interface ChoiceOption<V extends string = string> {
  type: 'choice'
  label: string
  default: V
  choices: readonly (readonly [V, string])[]
}

export interface RangeOption {
  type: 'range'
  label: string
  default: number
  min: number
  max: number
  step: number
  unit: string
}

export type HudOption = ToggleOption | ChoiceOption | RangeOption

const toggle = (label: string, value: boolean): ToggleOption => ({ type: 'toggle', label, default: value })

const choice = <V extends string>(label: string, choices: readonly (readonly [V, string])[], value: V): ChoiceOption<V> => ({
  type: 'choice',
  label,
  default: value,
  choices,
})

const range = (label: string, min: number, max: number, step: number, value: number, unit = ''): RangeOption => ({
  type: 'range',
  label,
  default: value,
  min,
  max,
  step,
  unit,
})

type BarText = 'value' | 'percent' | 'both' | 'none'

/** How a bar writes its numbers. Unity's player and target bars say "850 / 1000", the boss frame "62%". */
const barText = (value: BarText, label = 'Numbers') =>
  choice<BarText>(
    label,
    [
      ['value', '850 / 1000'],
      ['percent', '85%'],
      ['both', 'Both'],
      ['none', 'None'],
    ],
    value,
  )

/** Settings for the floating layer, which isn't on the grid: crosshair, nameplates and combat numbers. */
export type SettingsGroup = HudId | 'world'

export const SETTINGS = {
  player: {
    layout: choice<'side' | 'stacked'>(
      'Bars',
      [
        ['side', 'Side by side'],
        ['stacked', 'Stacked'],
      ],
      'side',
    ),
    text: barText('value'),
    role: toggle('Role and weapon line', true),
    effects: toggle('Buffs and debuffs', true),
    stamina: toggle('Stamina bar (fades when full)', true),
    cast: toggle('Cast bar', true),
    minions: toggle('Minion counters', true),
  },
  actions: {
    prompts: choice<Scheme>(
      'Key prompts',
      [
        ['keyboard', 'Keyboard and mouse'],
        ['gamepad', 'Gamepad'],
      ],
      'keyboard',
    ),
    names: toggle('Ability names', true),
    cooldowns: toggle('Cooldown seconds', true),
    costs: toggle('Costs', false),
    groupBuff: toggle('Group buff tile', true),
    messages: toggle('Failure messages', true),
  },
  target: {
    text: barText('value'),
    effects: toggle('Its buffs and debuffs', true),
  },
  boss: {
    text: barText('percent'),
    ticks: toggle('Phase ticks', true),
    foot: toggle('Phase and enrage', true),
    cast: toggle('Wind-up bar', true),
  },
  encounter: {
    elapsed: toggle('Time since the pull', true),
    enrage: toggle('Enrage countdown', true),
  },
  party: {
    resource: toggle('Resource bars', true),
    roles: toggle('Role letters', true),
    text: barText('none'),
    you: toggle('Your own frame', false),
  },
  prompt: {
    key: toggle('Key prompt', true),
  },
  character: {
    trees: toggle('Trees side', true),
    stats: choice<'all' | 'main'>(
      'Stats',
      [
        ['all', 'Every section'],
        ['main', 'Power, health and resource'],
      ],
      'all',
    ),
  },
  minimap: {
    shape: choice<'circle' | 'square'>(
      'Shape',
      [
        ['circle', 'Circle'],
        ['square', 'Square'],
      ],
      'circle',
    ),
    rotation: choice<'north' | 'turn'>(
      'Rotation',
      [
        ['north', 'North always up'],
        ['turn', 'Turns with you'],
      ],
      'north',
    ),
    // Zoomed out no further than 120 m.
    radius: range('View radius', 30, 120, 10, 60, 'm'),
    cardinals: toggle('Cardinal points', true),
    objectives: toggle('Objective markers', true),
    party: toggle('Group members', true),
    enemies: toggle('Enemies', true),
    zone: toggle('Zone name', true),
    clock: toggle('Clock', false),
  },
  objectives: {
    progress: toggle('Zone progression', true),
    events: toggle('Zone events', true),
    done: toggle('Finished steps', false),
    timers: toggle('Event timers', true),
  },
  micro: {
    keys: toggle('Key labels', true),
    names: toggle('Names', false),
  },
  bags: {
    categories: toggle('Split into categories', true),
    search: toggle('Search box', true),
    rarity: toggle('Rarity borders', true),
  },
  world: {
    crosshair: toggle('Crosshair', true),
    numbers: toggle('Damage and heal numbers', true),
    plates: toggle('Enemy nameplates', true),
    plateName: toggle('Names on plates', true),
    plateLevel: toggle('Levels on plates', true),
    fullHealth: toggle('Plates at full health', true),
    distance: range('Plate distance', 10, 60, 5, 30, 'm'),
    maxPlates: range('Most plates at once', 1, 20, 1, 12),
    plateWidth: range('Plate bar width', 40, 120, 4, 64, 'px'),
  },
} satisfies Record<SettingsGroup, Record<string, HudOption>>

type Schema = typeof SETTINGS

type ValueOf<O> = O extends ToggleOption ? boolean : O extends ChoiceOption<infer V> ? V : number

export type HudSettings = { [G in SettingsGroup]: { [K in keyof Schema[G]]: ValueOf<Schema[G][K]> } }

export type SettingValue = boolean | string | number

/** The options of a group, as a list for the editor. */
export const optionsOf = (group: SettingsGroup): [string, HudOption][] => Object.entries(SETTINGS[group])

export function defaultSettings(): HudSettings {
  return Object.fromEntries(
    Object.entries(SETTINGS).map(([group, options]) => [
      group,
      Object.fromEntries(Object.entries(options).map(([key, option]) => [key, option.default])),
    ]),
  ) as HudSettings
}

/** A value fits its option: a toggle's boolean, one of a choice's values, a number on a range's steps. */
export function fitsOption(option: HudOption, value: unknown): value is SettingValue {
  switch (option.type) {
    case 'toggle':
      return typeof value === 'boolean'
    case 'choice':
      return typeof value === 'string' && option.choices.some(([v]) => v === value)
    case 'range':
      return (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= option.min &&
        value <= option.max &&
        Math.abs((value - option.min) / option.step - Math.round((value - option.min) / option.step)) < 1e-6
      )
  }
}

/** Stored settings, each value kept when it still fits its option and the default otherwise. */
export function cleanSettings(stored: unknown): HudSettings {
  const settings = defaultSettings() as unknown as Record<string, Record<string, SettingValue>>
  if (!stored || typeof stored !== 'object') return settings as unknown as HudSettings
  const raw = stored as Record<string, unknown>
  for (const [group, options] of Object.entries(SETTINGS)) {
    const values = raw[group]
    if (!values || typeof values !== 'object') continue
    for (const [key, option] of Object.entries(options) as [string, HudOption][]) {
      const value = (values as Record<string, unknown>)[key]
      if (fitsOption(option, value)) settings[group][key] = value
    }
  }
  return settings as unknown as HudSettings
}

/** One setting changed, or the same settings when the value doesn't fit the option. */
export function withSetting(settings: HudSettings, group: SettingsGroup, key: string, value: SettingValue): HudSettings {
  const option = (SETTINGS[group] as Record<string, HudOption>)[key]
  if (!option || !fitsOption(option, value)) return settings
  return { ...settings, [group]: { ...settings[group], [key]: value } }
}

/** A range option's value moved by steps, kept inside the range (the minimap's + and − buttons). */
export function stepRange(option: RangeOption, value: number, steps: number): number {
  return Math.min(option.max, Math.max(option.min, value + steps * option.step))
}
