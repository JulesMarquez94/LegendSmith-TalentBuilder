// Made-up data for the interface prototype: there's no server or account behind it.

import type { Character } from './roster.ts'

export interface Realm {
  id: string
  name: string
  region: string
  population: 'Low' | 'Medium' | 'High'
  /** Round trip from you to the realm, in milliseconds. */
  ping: number
}

export const REALMS: readonly Realm[] = [
  { id: 'emberfall', name: 'Emberfall', region: 'Europe', population: 'High', ping: 38 },
  { id: 'stonewatch', name: 'Stonewatch', region: 'Europe', population: 'Medium', ping: 44 },
  { id: 'thornvale', name: 'Thornvale', region: 'North America', population: 'High', ping: 112 },
  { id: 'ravenmoor', name: 'Ravenmoor', region: 'North America', population: 'Low', ping: 121 },
  { id: 'glimmerdeep', name: 'Glimmerdeep', region: 'Oceania', population: 'Medium', ping: 268 },
]

/** The realm with the lowest ping, tagged "Recommended". */
export const RECOMMENDED_REALM = REALMS.reduce((best, r) => (r.ping < best.ping ? r : best))

/** Where every new character starts. */
export const STARTING_ZONE = 'Ashvale'

/** Characters to start the prototype with, one of each seat at different levels. */
export const SAMPLE_CHARACTERS: readonly Character[] = [
  {
    id: 'sample-seren',
    name: 'Seren',
    level: 60,
    artifact: 'lifewarden-staff',
    zone: 'The Sunken Archive',
    appearance: { body: 1, skin: 1, hair: 1, hairColor: 4 },
  },
  {
    id: 'sample-korrin',
    name: 'Korrin',
    level: 34,
    artifact: 'tome-of-summoning',
    zone: 'Thornwood Marches',
    appearance: { body: 0, skin: 4, hair: 2, hairColor: 0 },
    unchecked: true,
  },
  {
    id: 'sample-vessa',
    name: 'Vessa',
    level: 12,
    artifact: 'twin-daggers',
    zone: 'Greyhollow',
    appearance: { body: 1, skin: 2, hair: 0, hairColor: 5 },
  },
  {
    id: 'sample-bram',
    name: 'Bram',
    level: 1,
    artifact: 'sword-and-shield',
    zone: STARTING_ZONE,
    appearance: { body: 0, skin: 0, hair: 3, hairColor: 1 },
    unchecked: true,
  },
]

/** Names other players already have, so the online name check has something to say no to. */
export const TAKEN_NAMES: readonly string[] = ['Aldric', 'Brynn', 'Kestrel', 'Mireth', 'Tamsin', 'Wren']

/** Names for the "Random name" button. */
export const NAME_IDEAS: readonly string[] = [
  'Aldren',
  'Corvin',
  'Elowen',
  'Fenna',
  'Halvard',
  'Isolde',
  'Joren',
  'Liora',
  'Marek',
  'Nyssa',
  'Orrin',
  'Perrin',
  'Rowan',
  'Sable',
  'Theron',
  'Yara',
]

/** Loading screen tips, from the builder's own rules. */
export const TIPS: readonly string[] = [
  'Every level up to 8 opens a new ability slot. After that, every level gives a talent point.',
  'Spells fit every weapon of their role. Only weapon strikes and shots need a certain weapon.',
  'Combo points pay in steps: an ability that costs 2 spends 4 or 6 if you have them, and hits harder.',
  'An imp whose time runs out leaves, and takes its point of resource with it.',
  'Shields soak damage before it lands, and what they soak counts as healing.',
]
