/**
 * The ability compendium's data: every general boss and enemy mechanic built in the game (the Unity project's zone pattern,
 * 24 Nov 2026), as it plays in the arena test level, where each one loops at the altar (Ability test). The GIFs and pictures in
 * public/compendium are recorded from the game itself by the arena's self-check (-arenatest-trials … -arenatest-record).
 */

export type Category = 'Avoid' | 'Soak' | 'Lingering & moving' | 'Players' | 'DPS'

/** Orange: failing hurts. Red: failing kills. */
export type Severity = 'harmful' | 'lethal'

/** What the arena's self-check made of it in the built game. */
export type Check = 'pass' | 'fail' | 'untested'

export interface Mechanic {
  /** The test's key in the game (Scene_ArenaTest_Trial_<id>): also its GIF and picture names. */
  id: string
  name: string
  category: Category
  severity: Severity
  /** The zone kinds it is made of (Avoid, Soak, Pool, Trap, Moving, Safe, Tether, Ward, Adds). */
  kinds: string[]
  /** Players it is made for (a stand-in ally joins a lone player for the rest). */
  players: number
  /** What happens. */
  summary: string
  /** What players do about it. */
  counter: string
  /** What failing it does. */
  failure: string
  /** Its shape, timing and numbers in the game (level 60: 2400 health). */
  numbers: string[]
  check: Check
  checkNote?: string
}

export const CATEGORIES: { id: Category; blurb: string }[] = [
  { id: 'Avoid', blurb: 'Areas that land once: be out of them when the fill reaches the edge.' },
  { id: 'Soak', blurb: 'Areas that must be stood in: the swirl in the middle shrinks with each player and vanishes once enough are in.' },
  { id: 'Lingering & moving', blurb: 'What stays on the ground or moves over it: never step in, never get touched.' },
  { id: 'Players', blurb: 'Links between players and a player held in the dark: they need the group to move together.' },
  { id: 'DPS', blurb: 'Kill or break it in time: adds that cast, emitters that shield the boss, shields over long casts.' },
]

export const MECHANICS: Mechanic[] = [
  // ---------- Avoid ----------
  {
    id: 'LightningStrike',
    name: 'Lightning Strike',
    category: 'Avoid',
    severity: 'harmful',
    kinds: ['Avoid'],
    players: 1,
    summary: 'A circle appears under the boss’s target; lightning falls when it fills.',
    counter: 'Step out before the fill reaches the border.',
    failure: '900 damage (about a third of your health).',
    numbers: ['Circle, 3 m, on the target', '2.5 s warning', 'Every 4 s', 'Reaches 6 m up: a jump does not dodge it'],
    check: 'pass',
  },
  {
    id: 'Cleave',
    name: 'Cleave',
    category: 'Avoid',
    severity: 'harmful',
    kinds: ['Avoid'],
    players: 1,
    summary: 'A wide cone from the boss toward its target.',
    counter: 'Get behind the boss or to its side.',
    failure: '900 damage.',
    numbers: ['Cone, 18 m long, 90° wide', '2.5 s warning', 'Every 6 s'],
    check: 'pass',
  },
  {
    id: 'ConeDance',
    name: 'Cone Dance',
    category: 'Avoid',
    severity: 'harmful',
    kinds: ['Avoid', 'Sequence'],
    players: 1,
    summary: 'Four 120° cones round the boss, one after another, each a third further round. The next shows while the one before is still filling.',
    counter: 'Read the build-up and plan your path round the boss: always stand where the next cone is not.',
    failure: '900 damage per cone that catches you.',
    numbers: ['4 cones, 22 m, 120° each', 'Each shown 1.5 s after the last, 3.5 s warning', 'Every 11 s'],
    check: 'pass',
  },
  {
    id: 'DonutPulse',
    name: 'Donut Pulse',
    category: 'Avoid',
    severity: 'harmful',
    kinds: ['Avoid', 'Ring', 'Sequence'],
    players: 1,
    summary: 'Rings round the boss come in and out: a ring (the hole is safe), then a circle, then the ring again.',
    counter: 'Into the hole for the ring, out of the circle, back in for the ring.',
    failure: '900 damage per part that catches you.',
    numbers: ['Ring 22 m with a 6 m hole, circle 8 m', '3 s warning each, 2.5 s apart', 'Every 11 s'],
    check: 'pass',
  },
  {
    id: 'DeathBeam',
    name: 'Death Beam',
    category: 'Avoid',
    severity: 'lethal',
    kinds: ['Avoid', 'Line'],
    players: 1,
    summary: 'A band right through the boss toward its target.',
    counter: 'Get out of the band, to the side.',
    failure: 'Death.',
    numbers: ['Line, 40 m long, 6 m wide, through the boss', '3 s warning', 'Every 6 s'],
    check: 'pass',
  },
  {
    id: 'Cataclysm',
    name: 'Cataclysm',
    category: 'Avoid',
    severity: 'lethal',
    kinds: ['Avoid'],
    players: 1,
    summary: 'A big circle round the boss.',
    counter: 'Run out of it.',
    failure: 'Death.',
    numbers: ['Circle, 10 m, round the boss', '4 s warning', 'Every 8 s'],
    check: 'pass',
  },
  {
    id: 'SearingLight',
    name: 'Searing Light',
    category: 'Avoid',
    severity: 'lethal',
    kinds: ['Avoid', 'Safe'],
    players: 1,
    summary: 'The whole platform fills red, with two blue safe spots cut out of it.',
    counter: 'Stand in a blue spot when the red fills.',
    failure: 'Death.',
    numbers: ['Circle, 21 m: the whole platform', 'Two 3 m safe spots, at least 12 m apart', '5 s warning', 'Every 9 s'],
    check: 'pass',
  },

  // ---------- Soak ----------
  {
    id: 'ArcaneMeteor',
    name: 'Arcane Meteor',
    category: 'Soak',
    severity: 'lethal',
    kinds: ['Soak'],
    players: 1,
    summary: 'A meteor is coming down where the energy swirls. It falls from the sky as the circle fills.',
    counter: 'Stand in it: the meteor only hurts the soaker. The swirl vanishes once someone is in.',
    failure: 'Not soaked: it hits the ground and kills everyone.',
    numbers: ['Circle, 4 m, somewhere on the platform', '6 s warning', 'Soaked: 800 to the soaker', 'Every 10 s'],
    check: 'pass',
  },
  {
    id: 'TwinMeteor',
    name: 'Twin Meteor',
    category: 'Soak',
    severity: 'lethal',
    kinds: ['Soak'],
    players: 2,
    summary: 'A meteor that needs two soakers. One player in it only shrinks the swirl; it vanishes when the second steps in.',
    counter: 'Two players stand in it together and share the hit.',
    failure: 'Short of soakers: it kills everyone.',
    numbers: ['Circle, 4.5 m', '7 s warning', 'Soaked: 1600 shared (800 each)', 'Every 10 s'],
    check: 'pass',
  },
  {
    id: 'PlagueOrb',
    name: 'Plague Orb',
    category: 'Soak',
    severity: 'harmful',
    kinds: ['Soak', 'Pool'],
    players: 1,
    summary: 'A swirl to stand in. Left alone, it bursts into a poison pool.',
    counter: 'Soak it for a mild hit.',
    failure: 'A 7 m poison pool stays for 20 s and hurts whoever stands in it.',
    numbers: ['Circle, 3.5 m', '5 s warning', 'Soaked: 500', 'Pool: 250 a second', 'Every 12 s'],
    check: 'pass',
  },

  // ---------- Lingering & moving ----------
  {
    id: 'FirePatch',
    name: 'Fire Patch',
    category: 'Lingering & moving',
    severity: 'harmful',
    kinds: ['Pool'],
    players: 1,
    summary: 'A burning patch is left under the target and builds up over the fight.',
    counter: 'Move out and stay out of the fire.',
    failure: 'Stepping in or staying in burns at once, then every 0.75 s.',
    numbers: ['Circle, 5 m, on the target', '2 s warning, lasts 18 s', '300 a hit', 'Every 6 s (up to three at once)'],
    check: 'pass',
  },
  {
    id: 'BombField',
    name: 'Bomb Field',
    category: 'Lingering & moving',
    severity: 'lethal',
    kinds: ['Trap'],
    players: 1,
    summary: 'Six bombs are set round the platform, each in a red circle.',
    counter: 'Thread your way between them.',
    failure: 'Walking into a circle sets its bomb off and kills you.',
    numbers: ['6 circles, 2.5 m, at least 6 m apart', '2.5 s warning, armed for 20 s', 'Every 22 s'],
    check: 'pass',
  },
  {
    id: 'RollingInferno',
    name: 'Rolling Inferno',
    category: 'Lingering & moving',
    severity: 'harmful',
    kinds: ['Moving'],
    players: 1,
    summary: 'Three orbs of fire roll out from the boss and bounce round the platform.',
    counter: 'Keep away from them as they bounce.',
    failure: 'A touch hits for 400 and leaves you burning (60 a second for 5 s).',
    numbers: ['3 circles, 2 m, 120° apart', 'Roll at 6 m/s for 15 s, bouncing off the edge', 'Every 18 s'],
    check: 'pass',
  },
  {
    id: 'FrostSweep',
    name: 'Frost Sweep',
    category: 'Lingering & moving',
    severity: 'harmful',
    kinds: ['Moving'],
    players: 1,
    summary: 'Two frozen beams turn round the boss like the hands of a clock.',
    counter: 'Keep moving ahead of them, or jump the gap between.',
    failure: 'A touch hits for 250 and freezes you on the spot for 2.5 s.',
    numbers: ['2 lines, 20 m long, 2.5 m wide', 'Turn at 45° a second for 12 s', 'Every 16 s'],
    check: 'pass',
  },

  // ---------- Players ----------
  {
    id: 'SeveringTether',
    name: 'Severing Tether',
    category: 'Players',
    severity: 'lethal',
    kinds: ['Tether'],
    players: 2,
    summary: 'A red link between two players.',
    counter: 'Run away from each other as fast as you can until it snaps.',
    failure: 'Still linked when time runs out: both die.',
    numbers: ['Breaks at 18 m apart', '6 s to break it', 'Every 10 s'],
    check: 'pass',
  },
  {
    id: 'BindingChains',
    name: 'Binding Chains',
    category: 'Players',
    severity: 'harmful',
    kinds: ['Tether', 'Pull'],
    players: 2,
    summary: 'An orange link that slowly pulls the two players together.',
    counter: 'Fight the pull and get apart to break it.',
    failure: 'Both take 900.',
    numbers: ['Breaks at 14 m apart', 'Pulls 0.6 m a second', '8 s to break it', 'Every 12 s'],
    check: 'pass',
  },
  {
    id: 'StarTether',
    name: 'Star Tether',
    category: 'Players',
    severity: 'lethal',
    kinds: ['Tether'],
    players: 4,
    summary: 'One player linked to three others (3 to 1).',
    counter: 'The middle one holds still; the three run out from them in different directions.',
    failure: 'Every link still holding kills both its ends.',
    numbers: ['Breaks at 14 m', '7 s', 'Every 11 s'],
    check: 'pass',
  },
  {
    id: 'SquareTether',
    name: 'Square Tether',
    category: 'Players',
    severity: 'harmful',
    kinds: ['Tether'],
    players: 4,
    summary: 'Four players linked in a square, each to two neighbours.',
    counter: 'Spread to the corners, far from both neighbours.',
    failure: 'Every link still holding hurts both its ends (900).',
    numbers: ['Breaks at 12 m', '7 s', 'Every 11 s'],
    check: 'pass',
  },
  {
    id: 'AloneInTheDark',
    name: 'Alone in the Dark',
    category: 'Players',
    severity: 'lethal',
    kinds: ['Soak', 'Follows a player'],
    players: 2,
    summary: 'A circle closes on one player: they are held on the spot and their screen goes dark. The others see a soak following them.',
    counter: 'Someone else comes and stands in the circle with them: it lets go at once.',
    failure: 'Nobody comes in time: the held player dies.',
    numbers: ['Circle, 3 m, follows the player', '8 s to rescue', 'Every 14 s'],
    check: 'pass',
  },

  // ---------- DPS ----------
  {
    id: 'VoidAcolytes',
    name: 'Void Acolytes',
    category: 'DPS',
    severity: 'lethal',
    kinds: ['Adds', 'Cast'],
    players: 1,
    summary: 'Two acolytes appear and start a Dark Ritual, with a cast bar over their heads.',
    counter: 'Kill both before the bar fills: a dead acolyte’s ritual never lands.',
    failure: 'A finished ritual kills everyone.',
    numbers: ['2 acolytes, 8 000 health each', '12 s ritual, over and over', 'Every 30 s'],
    check: 'pass',
  },
  {
    id: 'CrystalWard',
    name: 'Crystal Ward',
    category: 'DPS',
    severity: 'harmful',
    kinds: ['Ward', 'Emitters'],
    players: 1,
    summary: 'Three crystals channel a shield into the boss. The beams and the shield share one colour, so the link reads at a glance.',
    counter: 'Break every crystal: the boss cannot be hurt while one stands.',
    failure: 'The boss stays out of reach.',
    numbers: ['3 crystals, 12 000 health each, 12 m from the boss', 'The ring round the boss shows what is left', 'Every 40 s'],
    check: 'pass',
  },
  {
    id: 'Annihilation',
    name: 'Annihilation',
    category: 'DPS',
    severity: 'lethal',
    kinds: ['Ward', 'Absorb', 'Cast'],
    players: 1,
    summary: 'A shield goes up and the boss starts a long cast.',
    counter: 'Break the shield: it interrupts the cast. The ring round the boss shows what is left of it.',
    failure: 'The cast ends in a burst that kills everyone.',
    numbers: ['Shield 20 000', '12 s cast', 'Every 25 s'],
    check: 'pass',
  },
  {
    id: 'RisingTorment',
    name: 'Rising Torment',
    category: 'DPS',
    severity: 'harmful',
    kinds: ['Ward', 'Absorb', 'Channel'],
    players: 1,
    summary: 'A shield goes up and the boss channels pulses that hit harder each time.',
    counter: 'Break the shield to stop the channel early.',
    failure: 'Ten pulses from 150, each 35 % harder: left alone, they overwhelm you.',
    numbers: ['Shield 20 000', 'A pulse every second from 3.5 s', 'Every 28 s'],
    check: 'pass',
  },
]

/** The colours a mechanic is drawn in (the game's CombatDef). */
export const COLOURS = [
  { name: 'Orange', hex: '#ff8c0d', text: 'Failing hurts. Not meant to kill on its own.' },
  { name: 'Red', hex: '#f20f0f', text: 'Failing kills.' },
  { name: 'Blue', hex: '#3399ff', text: 'A safe spot inside a zone.' },
  { name: 'Violet', hex: '#b85cff', text: 'A shield on the boss, and the emitters’ beams feeding it.' },
]

/** What every mechanic is made of: one ability, a list of zone steps, each set by these. */
export const KNOBS = [
  { name: 'Shape', text: 'Circle, cone, line or ring (a donut whose hole is safe).' },
  { name: 'Placement', text: 'On the boss, its target, every player, random players, the arena’s middle, scattered, or after the step before; moved and turned from there.' },
  { name: 'Timing', text: 'When it appears and how long it warns; repeats make sequences, each later, turned and moved on.' },
  { name: 'Kind', text: 'Avoid, soak, pool, trap, moving, safe spot, tether, ward, adds.' },
  { name: 'Severity', text: 'Orange or red: how bad failing it is.' },
  { name: 'Consequence', text: 'Any effects: damage, damage over time, a freeze, a hold. A failed soak can leave another step (a poison pool).' },
]
