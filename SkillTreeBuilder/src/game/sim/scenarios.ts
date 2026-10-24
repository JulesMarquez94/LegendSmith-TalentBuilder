export interface Vec {
  x: number
  y: number
}

export type AllyRole = 'tank' | 'healer' | 'damage'

export interface AllyTemplate {
  name: string
  role: AllyRole
  maxHp: number
  home: Vec
  /** Damage the bot does to the boss per second. */
  dps: number
}

/** What the boss does. Damage numbers are scaled by the arena's damage slider. */
export type ScenarioEvent =
  /** The boss hits its tank. With `swap`, two tanks trade the boss every `swap` seconds. */
  | { kind: 'melee'; every: number; amount: number; swap?: number }
  /** Everyone takes damage. */
  | { kind: 'pulse'; name: string; every: number; amount: number; first?: number }
  /** A few random non-tanks take a big hit. */
  | { kind: 'spike'; name: string; every: number; amount: number; count: number; first?: number }
  /** Pools under random allies (you included) that hurt anyone standing in them. Bots walk out after a moment. */
  | {
      kind: 'pool'
      name: string
      every: number
      count: number
      radius: number
      dps: number
      duration: number
      /** Seconds of warning before it starts to hurt. */
      warn: number
      first?: number
    }
  /** The party gathers in one spot for a while: good for zones and chains. */
  | { kind: 'stack'; every: number; duration: number; first?: number }
  /** Steady damage on everyone, per second. */
  | { kind: 'drain'; perSec: number }
  /** Another healer in the group (a bot): heals the most injured ally. */
  | { kind: 'healer'; every: number; amount: number }

export interface Scenario {
  id: string
  name: string
  description: string
  party: readonly AllyTemplate[]
  /** Where you start. */
  playerHome: Vec
  boss: { name: string; maxHp: number }
  /** Where the party gathers for `stack` events. */
  stackPoint: Vec
  /** Health everyone starts at, as a fraction. */
  startHealth: number
  /** Allies can't die: handy for watching numbers. */
  noDeaths: boolean
  events: readonly ScenarioEvent[]
}

export const ARENA = { width: 60, height: 40, boss: { x: 30, y: 12 }, bossRadius: 2.5 } as const

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'practice',
    name: 'Practice',
    description:
      'A training dummy and a party that slowly loses health and never dies, with a light pulse every 8 sec. For watching numbers.',
    party: [
      { name: 'Tank', role: 'tank', maxHp: 30000, home: { x: 30, y: 15.5 }, dps: 0 },
      { name: 'Blade', role: 'damage', maxHp: 16000, home: { x: 25.5, y: 15 }, dps: 0 },
      { name: 'Archer', role: 'damage', maxHp: 16000, home: { x: 37, y: 23 }, dps: 0 },
    ],
    playerHome: { x: 30, y: 27 },
    boss: { name: 'Training Dummy', maxHp: Infinity },
    stackPoint: { x: 30, y: 22 },
    startHealth: 0.5,
    noDeaths: true,
    events: [
      { kind: 'drain', perSec: 220 },
      { kind: 'pulse', name: 'Practice pulse', every: 8, amount: 1500, first: 4 },
    ],
  },
  {
    id: 'dungeon',
    name: 'Dungeon boss (4 players)',
    description:
      'You, a tank and two damage dealers. Tank hits, a party-wide pulse every 12 sec, big hits on damage dealers, ' +
      'pools to step out of and a gather every 30 sec.',
    party: [
      { name: 'Tank', role: 'tank', maxHp: 30000, home: { x: 30, y: 15.5 }, dps: 900 },
      { name: 'Blade', role: 'damage', maxHp: 16000, home: { x: 25.5, y: 14.5 }, dps: 2600 },
      { name: 'Archer', role: 'damage', maxHp: 16000, home: { x: 38, y: 24 }, dps: 2600 },
    ],
    playerHome: { x: 30, y: 27 },
    boss: { name: 'Blightfang', maxHp: 520000 },
    stackPoint: { x: 30, y: 22 },
    startHealth: 1,
    noDeaths: false,
    events: [
      { kind: 'melee', every: 1.5, amount: 1800 },
      { kind: 'pulse', name: 'Shadow Pulse', every: 12, amount: 2000, first: 6 },
      { kind: 'spike', name: 'Hex Bolt', every: 7, amount: 3500, count: 1, first: 3 },
      { kind: 'pool', name: 'Blight Pool', every: 14, count: 2, radius: 5, dps: 1200, duration: 7, warn: 1.2, first: 9 },
      { kind: 'stack', every: 30, duration: 8, first: 20 },
    ],
  },
  {
    id: 'raid',
    name: 'Raid boss (8 players)',
    description:
      'Two tanks who trade the boss, a second healer (a bot), four damage dealers and you. Heavier pulses, ' +
      'two big hits at a time, three pools and a gather every 25 sec.',
    party: [
      { name: 'Main tank', role: 'tank', maxHp: 34000, home: { x: 28.8, y: 15.5 }, dps: 900 },
      { name: 'Off tank', role: 'tank', maxHp: 34000, home: { x: 31.2, y: 15.5 }, dps: 900 },
      { name: 'Blade', role: 'damage', maxHp: 18000, home: { x: 25.5, y: 13.5 }, dps: 2600 },
      { name: 'Fist', role: 'damage', maxHp: 18000, home: { x: 34.5, y: 13.5 }, dps: 2600 },
      { name: 'Archer', role: 'damage', maxHp: 18000, home: { x: 21, y: 24 }, dps: 2600 },
      { name: 'Mage', role: 'damage', maxHp: 18000, home: { x: 39, y: 24 }, dps: 2600 },
      { name: 'Other healer', role: 'healer', maxHp: 16000, home: { x: 35, y: 28 }, dps: 0 },
    ],
    playerHome: { x: 26, y: 28 },
    boss: { name: 'The Hollow King', maxHp: 1400000 },
    stackPoint: { x: 30, y: 22 },
    startHealth: 1,
    noDeaths: false,
    events: [
      { kind: 'melee', every: 1.5, amount: 2600, swap: 20 },
      { kind: 'pulse', name: 'Crown of Ash', every: 10, amount: 2800, first: 5 },
      { kind: 'spike', name: 'Grave Lance', every: 6, amount: 4000, count: 2, first: 3 },
      { kind: 'pool', name: 'Hollow Ground', every: 12, count: 3, radius: 6, dps: 1600, duration: 7, warn: 1.2, first: 8 },
      { kind: 'stack', every: 25, duration: 8, first: 15 },
      { kind: 'healer', every: 2, amount: 1600 },
    ],
  },
]
