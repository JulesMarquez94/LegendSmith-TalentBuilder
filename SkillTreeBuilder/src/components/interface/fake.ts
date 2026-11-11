// Made-up data for the interface prototype: there's no server or account behind it.

import type { Character } from './roster.ts'

/** Where every new character starts. */
export const STARTING_ZONE = 'Ashvale'

/** Characters to start the prototype with, by seat around the fire: the third seat is left empty. */
export const SAMPLE_SLOTS: readonly (Character | null)[] = [
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
  null,
  {
    id: 'sample-bram',
    name: 'Bram',
    level: 12,
    artifact: 'sword-and-shield',
    zone: 'Greyhollow',
    appearance: { body: 0, skin: 0, hair: 3, hairColor: 1 },
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
