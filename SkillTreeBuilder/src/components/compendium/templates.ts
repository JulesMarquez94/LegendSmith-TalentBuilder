/**
 * The game’s visual codes and its standard mechanic templates, ported from the boss journal (docs/boss-journal/data.json,
 * 2026-11-27). The journal is a working file and is not shipped with the site: this is a copy of what the compendium shows.
 *
 * Codes: what each colour and mark on the ground means. Templates: one standard, named mechanic each, with knobs and skins;
 * a new boss picks templates and skins them. Under each template, the boss abilities are proposals for the ten boss designs,
 * not built yet. Colours: the game’s own (CombatDef) where it has one, the journal’s for the rest.
 */

import { MECHANICS, type Mechanic } from './mechanics.ts'

export type CodeId = 'ORANGE' | 'RED' | 'BLUE' | 'SWIRL' | 'VIOLET' | 'LINK' | 'LIME' | 'RETICLE' | 'SKY'

/** In the game, a new rule, or still a proposal. */
export type CodeState = 'game' | 'new' | 'proposal'

export interface Code {
  id: CodeId
  name: string
  colour: string
  /** What it looks like in the game. */
  look: string
  /** What it tells the players. */
  means: string
  /** Where it stands, in words. */
  status: string
  state: CodeState
}

export const CODES: Code[] = [
  {
    id: 'ORANGE',
    name: 'Orange zone',
    colour: '#ff8c0d',
    look: 'A strong orange border with a see-through fill that shows the timing.',
    means: 'Failing hurts. It is not meant to kill on its own.',
    status: 'In the game',
    state: 'game',
  },
  {
    id: 'RED',
    name: 'Red zone',
    colour: '#f20f0f',
    look: 'A strong red border with a see-through fill that shows the timing.',
    means: 'Failing kills.',
    status: 'In the game',
    state: 'game',
  },
  {
    id: 'BLUE',
    name: 'Blue safe spot',
    colour: '#3399ff',
    look: 'A blue area cut out of a filled room.',
    means: 'Safe while everything around it is not.',
    status: 'In the game',
    state: 'game',
  },
  {
    id: 'SWIRL',
    name: 'Gold swirl',
    colour: '#e9c46a',
    look: 'Swirling energy in the middle of an area.',
    means: 'A soak: stand in it. The swirl thins with each soaker and vanishes when there are enough.',
    status: 'In the game',
    state: 'game',
  },
  {
    id: 'VIOLET',
    name: 'Violet ward',
    colour: '#b85cff',
    look: 'A shield on an enemy, the beams feeding it and its cast bar, all one colour.',
    means: 'Break it before the cast ends.',
    status: 'In the game',
    state: 'game',
  },
  {
    id: 'LINK',
    name: 'Pink line',
    colour: '#f2a6c4',
    look: 'A line between two points: players, enemies or the boss.',
    means: 'A tether, beam or line: break it, block it, carry it or keep out of it.',
    status: 'Proposed in the boss deck',
    state: 'proposal',
  },
  {
    id: 'LIME',
    name: 'Lime pool',
    colour: '#b7d84b',
    look: 'A lime-green area.',
    means: 'A choice: a reward and a cost at once.',
    status: 'Proposed in the boss deck',
    state: 'proposal',
  },
  {
    id: 'RETICLE',
    name: 'Target reticle',
    colour: '#f20f0f',
    look: 'A red scope ring with four ticks on the ground under a player. It follows them and closes to a solid ring 1 s before the hit lands.',
    means: 'Something is coming for you: a leap, charge, pounce, lance, thrown flask or a fixating add. Everyone sees whose it is; the zone around it says what to do.',
    status: 'New: Jules’s rule, 27 Nov 2026',
    state: 'new',
  },
  {
    id: 'SKY',
    name: 'Falling shadow',
    colour: '#2a2a33',
    look: 'A dark shadow inside a zone, growing as the hit falls.',
    means: 'It comes from above, so no barrier helps (Jules’s unblockable rule).',
    status: 'Proposal',
    state: 'proposal',
  },
]

export type Family = 'general' | 'tank' | 'healer' | 'dps' | 'group'

/** Who each family of templates is for. */
export const FAMILIES: { id: Family; label: string; who: string }[] = [
  { id: 'general', label: 'General', who: 'Everyone, always. The core of the fight: dodge, move, use the floor.' },
  { id: 'tank', label: 'Tank', who: 'Only the tank can do it: take the hit, hold the facing, stand in the line that would kill the healer, raise the barrier.' },
  { id: 'healer', label: 'Healer', who: 'The healer’s job: steady damage on the whole party to out-heal, heal absorbs, health thresholds.' },
  { id: 'dps', label: 'DPS', who: 'The damage dealers’ job: kill the add that is casting, break the ward, stop the thing walking to the boss.' },
  { id: 'group', label: 'Group', who: 'Everyone together: soak with the marked player, take one tower each, spread, share by colour, rescue, carry.' },
]

/** A boss ability that would use a template: proposed for the boss designs, not built yet. */
export interface ProposedUse {
  ability: string
  boss: string
}

/** An event in a boss’s frame (its fight-long rule) that runs on a template: proposed too, not built yet. */
export interface FrameEvent {
  event: string
  /** The frame’s code in the boss journal. */
  frame: string
  boss: string
}

export interface Template {
  /** Its code in the boss journal. */
  id: string
  name: string
  family: Family
  /** The visual codes it is drawn with. */
  codes: CodeId[]
  what: string
  /** What a boss sets when it uses it. */
  knobs: string[]
  /** How it can look. */
  skins: string
  counter: string
  /** Already in the game: the compendium’s mechanics by name, or other arena pieces (with a note in brackets). */
  built: string[]
  /** Proposed for the boss designs, not built yet. */
  proposed: ProposedUse[]
  /** Frame events that run on it: proposed for the boss designs, not built yet. */
  events: FrameEvent[]
}

export const TEMPLATES: Template[] = [
  {
    id: 'DROP',
    name: 'Drop Circle',
    family: 'general',
    codes: ['ORANGE', 'RED', 'RETICLE', 'SKY'],
    what: 'A circle appears on a spot or a player, fills, then the hit lands.',
    knobs: [
      'Target: the boss’s target, random, farthest, every player, scattered, around the boss',
      'Size, count, warning time',
      'Leap: the boss jumps to it',
      'Severity and consequence',
    ],
    skins: 'Lightning, a leaping golem, a meteor, a falling rock',
    counter: 'Step out; a targeted player carries it away from the party.',
    built: ['Lightning Strike', 'Cataclysm'],
    proposed: [
      { ability: 'Bone Quake', boss: 'The Marrow Engine' },
    ],
    events: [],
  },
  {
    id: 'CONE',
    name: 'Cone',
    family: 'general',
    codes: ['ORANGE', 'RED', 'RETICLE'],
    what: 'A wedge from the boss toward a target, a fixed facing or each player.',
    knobs: [
      'Angle and length',
      'Aim: its target, fixed, at each player',
      'Sequence: several in turn round the boss',
    ],
    skins: 'A cleave, a scythe sweep, sprayed bile, fire breath',
    counter: 'Get out of the wedge; when it aims at you, point it away.',
    built: ['Cleave', 'Cone Dance'],
    proposed: [
      { ability: 'Unstable Stitches', boss: 'Leechmont & Nine' },
      { ability: 'Reaping Arc', boss: 'Abbess Morwen' },
    ],
    events: [],
  },
  {
    id: 'LINE',
    name: 'Line',
    family: 'general',
    codes: ['ORANGE', 'RED'],
    what: 'A band through the boss, or a fan of bands out from it.',
    knobs: [
      'Width and length',
      'Count: one line or a fan',
      'Aim',
    ],
    skins: 'A death beam, claw rakes, lashing roots',
    counter: 'Step to the side, or into the gaps of a fan.',
    built: ['Death Beam'],
    proposed: [
      { ability: 'Rake the Glade', boss: 'Old Gaunt' },
      { ability: 'Thrash', boss: 'Hollowheart' },
    ],
    events: [],
  },
  {
    id: 'DONUT',
    name: 'Donut',
    family: 'general',
    codes: ['ORANGE', 'RED', 'BLUE'],
    what: 'A ring whose hole is safe, often in and out in turn.',
    knobs: [
      'Inner and outer radius',
      'Order: ring, circle, ring',
      'Centre: the boss or a spot',
    ],
    skins: 'Bell rings, frost rings, pulses of void',
    counter: 'Read in or out; move between pulses.',
    built: ['Donut Pulse'],
    proposed: [
      { ability: 'Bell of Mournhaven', boss: 'Hierarch Solenne' },
    ],
    events: [],
  },
  {
    id: 'SWEEP',
    name: 'Sweep',
    family: 'general',
    codes: ['ORANGE', 'RED'],
    what: 'Beams or lines that turn round a centre or ride moving enemies.',
    knobs: [
      'Count and speed',
      'Centre: the boss, or lines tied to moving enemies',
      'Duration',
    ],
    skins: 'Frozen beams, rays of light, sweeping tails',
    counter: 'Walk ahead of the sweep, or find the part it never touches.',
    built: ['Frost Sweep'],
    proposed: [
      { ability: 'Tighten the Knot', boss: 'The Rat King' },
      { ability: 'Rays of Judgement', boss: 'Hierarch Solenne' },
    ],
    events: [],
  },
  {
    id: 'SAFESPOT',
    name: 'Safe Spots',
    family: 'general',
    codes: ['RED', 'ORANGE', 'BLUE'],
    what: 'The room fills; blue spots are carved out of it.',
    knobs: [
      'Count and size',
      'Fixed, drifting or crumbling one by one',
      'Which spot: a riddle’s answer, moonlight, a crust',
    ],
    skins: 'Searing light, an eclipse with moon shafts, salt crusts in burning brine, glyph plates',
    counter: 'Find the blue and stay in it as it moves or crumbles.',
    built: ['Searing Light'],
    proposed: [
      { ability: 'Eclipse', boss: 'Old Gaunt' },
      { ability: 'Riddle of Doors', boss: 'The Bound Apex' },
    ],
    events: [
      { event: 'Brine Rising', frame: 'F03', boss: 'The Brinewidow' },
    ],
  },
  {
    id: 'MARCH',
    name: 'Marching Blasts',
    family: 'general',
    codes: ['ORANGE', 'RED', 'SKY'],
    what: 'Lines of circles that step across the floor, one step at a time.',
    knobs: [
      'Lines, step size and step time',
      'Direction',
      'From above or from below',
    ],
    skins: 'Scythe rain, falling stars, erupting bones',
    counter: 'Step into a spot right after it fires.',
    built: [],
    proposed: [
      { ability: 'Scythe Rain', boss: 'Abbess Morwen' },
    ],
    events: [],
  },
  {
    id: 'PATH',
    name: 'Path Hazard',
    family: 'general',
    codes: ['ORANGE', 'RED'],
    what: 'Something moves along a set path or bounces round the room.',
    knobs: [
      'Path: fixed rails or bouncing',
      'Speed, count',
      'Warning before it passes',
    ],
    skins: 'Rolling fire orbs, ore carts, a rotating pillar',
    counter: 'Leave the path before it comes; time your crossing.',
    built: ['Rolling Inferno'],
    proposed: [
      { ability: 'Ore Cart', boss: 'The Marrow Engine' },
    ],
    events: [],
  },
  {
    id: 'LASTING',
    name: 'Lasting Ground',
    family: 'general',
    codes: ['ORANGE', 'RED', 'LINK'],
    what: 'Patches, traps or lines that stay on the floor for a long time or for good.',
    knobs: [
      'Shape: patch, trap circle, line between two points',
      'How long it stays and what removes it',
      'Consequence on touch: damage, root, trip',
    ],
    skins: 'Fire patches, bombs, webs, knotted tails',
    counter: 'Path around it; use what removes it.',
    built: ['Fire Patch', 'Bomb Field'],
    proposed: [
      { ability: 'Knotted Tails', boss: 'The Rat King' },
      { ability: 'Webline', boss: 'The Brinewidow' },
    ],
    events: [],
  },
  {
    id: 'CREEP',
    name: 'Closing Edge',
    family: 'general',
    codes: ['RED'],
    what: 'The edge of the room creeps or steps inward.',
    knobs: [
      'Speed or steps',
      'What pushes it back',
      'Whether it ever returns',
    ],
    skins: 'Creeping frost, the lime White, walls that think',
    counter: 'Keep inside the line; do what pushes it back.',
    built: ['Creeping Frost (Rime Lich)'],
    proposed: [
      { ability: 'The White', boss: 'Hollowheart' },
    ],
    events: [
      { event: 'Walls That Think', frame: 'F10', boss: 'Ossia' },
    ],
  },
  {
    id: 'CHARGE',
    name: 'Baited Charge',
    family: 'general',
    codes: ['RED', 'RETICLE', 'LINK'],
    what: 'A line from the boss through a marked player; the boss charges along it.',
    knobs: [
      'Warning time and width',
      'What the charge does on the way: tears webs, stops at stones',
      'Who is marked',
    ],
    skins: 'A spider’s skitter, a bull’s rush, a ghost’s dash',
    counter: 'The marked player aims it, then steps out.',
    built: [],
    proposed: [
      { ability: 'Skitter', boss: 'The Brinewidow' },
    ],
    events: [],
  },
  {
    id: 'SHOVE',
    name: 'Forced Move',
    family: 'general',
    codes: ['RETICLE', 'ORANGE', 'RED'],
    what: 'A pull or a knockback that moves players, toward danger or away from safety.',
    knobs: [
      'Pull or push, from a point or along a direction',
      'Strength and duration',
      'Everyone, or picked players (who get the reticle)',
      'What waits at the end: a wave, the edge, a red zone',
    ],
    skins: 'An undertow, a gale, a gravity well, a shockwave',
    counter: 'Walk against it, or stand where it carries you somewhere safe.',
    built: ['Binding Chains (its slow pull)'],
    proposed: [],
    events: [
      { event: 'Undertow', frame: 'F07', boss: 'Abbess Morwen' },
    ],
  },
  {
    id: 'RISK',
    name: 'Risk Pool',
    family: 'general',
    codes: ['LIME', 'RETICLE'],
    what: 'A zone that gives a reward and a cost at once.',
    knobs: [
      'Reward and cost',
      'Stacks and duration',
      'How often',
    ],
    skins: 'Mutagen puddles, a hag’s lantern',
    counter: 'Take it when the reward is worth it; skip it before a big hit.',
    built: [],
    proposed: [
      { ability: 'Mutagen', boss: 'Leechmont & Nine' },
    ],
    events: [
      { event: 'Hag’s Bargain', frame: 'F09', boss: 'Hollowheart' },
    ],
  },
  {
    id: 'FLIP',
    name: 'Flip Tell',
    family: 'general',
    codes: ['RED'],
    what: 'A visible and audible tell that turns the usual answer around.',
    knobs: [
      'The tell: eyes, a bell, a colour',
      'What flips: the safe spot, in and out',
    ],
    skins: 'A liar’s toll, a mirror flash',
    counter: 'Watch for the tell, then do the opposite.',
    built: [],
    proposed: [
      { ability: 'Liar’s Toll', boss: 'The Bound Apex' },
    ],
    events: [],
  },
  {
    id: 'HEATMAP',
    name: 'Learned Floor',
    family: 'general',
    codes: ['RED'],
    what: 'The boss remembers where most of the party stood and turns that spot red.',
    knobs: [
      'Sectors',
      'How many it remembers',
    ],
    skins: 'Ossia’s bone sectors',
    counter: 'Never solve two mechanics in the same place.',
    built: [],
    proposed: [
      { ability: 'Learned Response', boss: 'Ossia' },
    ],
    events: [],
  },
  {
    id: 'MIRROR',
    name: 'Mirror Kit',
    family: 'general',
    codes: ['LIME'],
    what: 'The boss copies the spell family the party uses most and turns it on them.',
    knobs: [
      'Families it can copy',
      'How often and how long',
    ],
    skins: 'Ossia’s stolen family',
    counter: 'Change your rotation to starve the copy.',
    built: [],
    proposed: [
      { ability: 'Stolen Family', boss: 'Ossia' },
    ],
    events: [],
  },
  {
    id: 'DEVICE',
    name: 'Room Device',
    family: 'general',
    codes: [],
    what: 'A bell, lever or brazier in the room that anyone can use: it answers the boss (a stun, a stacking buff cleared, cover opened), then recharges.',
    knobs: [
      'What it answers: a stun, a cleared buff, cover',
      'Recharge time',
      'The cost of using it: the user gets the reticle, a debuff',
    ],
    skins: 'An alarm bell, a winch lever, a brazier, a sluice gate',
    counter: 'Someone free uses it at the right moment.',
    built: [],
    proposed: [{ ability: 'Frenzy and the Bell', boss: 'The Unrung (first dungeon)' }],
    events: [],
  },
  {
    id: 'TANKHIT',
    name: 'Facing Strike',
    family: 'tank',
    codes: ['ORANGE', 'RED'],
    what: 'A heavy cone or circle on the tank that also hits anyone else inside.',
    knobs: [
      'Shape and size',
      'Damage to the tank, to others',
      'Open version when there is no tank',
    ],
    skins: 'A grinding fist, a hateful slam, a tail swipe',
    counter: 'The tank faces it away or holds the boss at the wall.',
    built: [],
    proposed: [
      { ability: 'Grinding Fist', boss: 'The Marrow Engine' },
      { ability: 'Hateful Slam', boss: 'Leechmont & Nine' },
    ],
    events: [],
  },
  {
    id: 'TANKSTACK',
    name: 'Stacking Strike',
    family: 'tank',
    codes: [],
    what: 'Blows stack a debuff on the tank until something clears it.',
    knobs: [
      'Debuff: bleed, poison, less healing',
      'Clear: a cooldown, a taunt swap, standing on a spot',
      'Cap when there is no tank',
    ],
    skins: 'Gnaw, venom, doubt',
    counter: 'A cooldown at the cue, a swap, or the clearing spot.',
    built: [],
    proposed: [
      { ability: 'Gnaw', boss: 'The Rat King' },
      { ability: 'Venom Fang', boss: 'The Brinewidow' },
      { ability: 'Weight of Doubt', boss: 'The Bound Apex' },
    ],
    events: [],
  },
  {
    id: 'GUARD',
    name: 'Guarded Line',
    family: 'tank',
    codes: ['RED', 'RETICLE', 'LINK'],
    what: 'A red line from the boss to the healer. The first body in it takes the hit: only a tank survives, and a barrier blocks it.',
    knobs: [
      'Target: the healer, else the farthest player',
      'Warning time and width',
      'What a barrier or a stone does: block, daze',
    ],
    skins: 'A pounce, a bone lance, a sniper bolt, a shadow spear',
    counter: 'The tank steps into the line or walls it.',
    built: ['Intercept (Rime Lich)', 'Barrier shadow test'],
    proposed: [
      { ability: 'Hunter’s Mark', boss: 'Old Gaunt' },
      { ability: 'Marrow Lance', boss: 'Ossia' },
    ],
    events: [],
  },
  {
    id: 'WAVE',
    name: 'Barrier Wave',
    family: 'tank',
    codes: ['RED'],
    what: 'A wall of something crosses the arena and kills. Only cover or the tank’s Aegis or Stone Wall stops it.',
    knobs: [
      'Skin and colour',
      'Direction, speed and width',
      'Waves per phase and the gap between them',
      'Cover: ruins, pillars, the tank’s barrier; whether cover crumbles',
    ],
    skins: 'Sea, light, ice, fire, shadow energy',
    counter: 'The tank raises the barrier before it arrives; everyone shelters behind it.',
    built: ['Barrier lab (magma tide)'],
    proposed: [
      { ability: 'Tidewall', boss: 'Abbess Morwen' },
      { ability: 'Cleansing Light', boss: 'Hierarch Solenne' },
    ],
    events: [],
  },
  {
    id: 'PEEL',
    name: 'Peel',
    family: 'tank',
    codes: ['RETICLE'],
    what: 'An add fixates on the healer or the player doing the job; the tank must pick it up.',
    knobs: [
      'Who it fixates',
      'How hard it hits',
      'Open version: slow enough to kite',
    ],
    skins: 'A bog brute, a hound pack, a bone golem',
    counter: 'The tank taunts it and holds it away.',
    built: [],
    proposed: [
      { ability: 'Bog Brute', boss: 'Hollowheart' },
    ],
    events: [],
  },
  {
    id: 'ADDS',
    name: 'Add Wave',
    family: 'tank',
    codes: [],
    what: 'Adds join at health marks or on a timer; the tank gathers them while the others cleave them down.',
    knobs: [
      'When: health marks or a timer',
      'How many (by party size), how tough',
      'Where they come from: holes, chains, the dark',
      'Open version: slow enough to kite',
    ],
    skins: 'A gobold wave, freed ferals, rats from the racks, bone constructs',
    counter: 'The tank picks them up and holds them in the cleave.',
    built: ['Gobold Wave (Snikkit, in the game)', 'Unchain a Feral (Malacarne, in the game)'],
    proposed: [],
    events: [],
  },
  {
    id: 'PULSE',
    name: 'Party Pulse',
    family: 'healer',
    codes: [],
    what: 'Steady damage on the whole party that the healer has to out-heal.',
    knobs: [
      'Ticks and duration',
      'Grows with something: webs, walls',
      'A line: players under it feed the boss',
      'Only inside an area, or only during a cast',
    ],
    skins: 'Furnace heat, fever, a drone, a choir, a drain',
    counter: 'Healers out-heal it; group heals at the peaks.',
    built: [],
    proposed: [
      { ability: 'Furnace Heat', boss: 'The Marrow Engine' },
      { ability: 'Fever', boss: 'The Rat King' },
      { ability: 'Strangling Damp', boss: 'The Brinewidow' },
      { ability: 'Wolfsbane Howl', boss: 'Old Gaunt' },
      { ability: 'Questioning', boss: 'The Bound Apex' },
      { ability: 'Bloodletting', boss: 'Leechmont & Nine' },
      { ability: 'Drowning Hymn', boss: 'Abbess Morwen' },
      { ability: 'Lich’s Silence', boss: 'Hierarch Solenne' },
      { ability: 'Grinding Drone', boss: 'Ossia' },
    ],
    events: [],
  },
  {
    id: 'ABSORB',
    name: 'Heal Absorb',
    family: 'healer',
    codes: [],
    what: 'A crust on players that eats healing before health returns.',
    knobs: [
      'Size',
      'Time to break it and what happens if not',
    ],
    skins: 'Lime crust, frost rime, necrotic rot',
    counter: 'Healers break the crusts in time.',
    built: [],
    proposed: [
      { ability: 'Lime Bloom', boss: 'Hollowheart' },
    ],
    events: [],
  },
  {
    id: 'CASTER',
    name: 'Caster Add',
    family: 'dps',
    codes: ['VIOLET'],
    what: 'An add with a cast bar over its head. Kill it before the bar fills.',
    knobs: [
      'Count, health and cast time',
      'What finishing does: haste, adds, a sealed glyph, a stun, a heal',
      'Where it stands',
    ],
    skins: 'Acolytes, a gobold tinker, baying hounds, wisps, votaries, egg sacs',
    counter: 'Switch to it and kill it in time.',
    built: ['Void Acolytes'],
    proposed: [
      { ability: 'Gobold Tinker', boss: 'The Marrow Engine' },
      { ability: 'Egg Sacs', boss: 'The Brinewidow' },
      { ability: 'Bay at the Moon', boss: 'Old Gaunt' },
      { ability: 'Unanswered', boss: 'The Bound Apex' },
      { ability: 'Bell of the Deep', boss: 'Abbess Morwen' },
      { ability: 'Choir Votaries', boss: 'Hierarch Solenne' },
      { ability: 'Lime Husks', boss: 'Hollowheart' },
    ],
    events: [],
  },
  {
    id: 'WARD',
    name: 'Ward Break',
    family: 'dps',
    codes: ['VIOLET'],
    what: 'A shield on an enemy or the boss; breaking it stops the cast or ends the immunity.',
    knobs: [
      'Shield size',
      'Source: itself or emitters channelling it',
      'What failing does: adds, a burst, a channel that grows',
    ],
    skins: 'Crystal emitters, a squealing rat’s ward, bone emitters',
    counter: 'Burst the shield or the emitters.',
    built: ['Crystal Ward', 'Annihilation', 'Rising Torment'],
    proposed: [
      { ability: 'Squeal', boss: 'The Rat King' },
      { ability: 'Ward Emitters', boss: 'Ossia' },
    ],
    events: [
      { event: 'Reach for the Outside', frame: 'F10', boss: 'Ossia' },
    ],
  },
  {
    id: 'RUNNER',
    name: 'Runner Add',
    family: 'dps',
    codes: [],
    what: 'Adds that walk to the boss; each one that arrives heals or rebuilds it.',
    knobs: [
      'Count and speed',
      'What arriving does',
      'Can they be slowed',
    ],
    skins: 'A crawling arm, gobold bone-carriers',
    counter: 'Kill or slow them on the way.',
    built: [],
    proposed: [
      { ability: 'Spare Parts', boss: 'Leechmont & Nine' },
    ],
    events: [
      { event: 'Bone-carriers', frame: 'F01', boss: 'The Marrow Engine' },
    ],
  },
  {
    id: 'THIEF',
    name: 'Thief Run',
    family: 'dps',
    codes: ['RETICLE'],
    what: 'An enemy grabs something (a buff, a relic) and flees; hit it enough times before it gets away. The robbed player gets the reticle.',
    knobs: [
      'What it takes and from whom',
      'How long it runs and how fast',
      'Hits to catch it; what keeping it does',
      'Open version: no faster than a player',
    ],
    skins: 'A gobold with a stolen buff, a rat with a relic, a wisp with a spark',
    counter: 'The damage dealers chase it down and hit it before it escapes.',
    built: ['Sticky Fingers (Snikkit, in the game)'],
    proposed: [],
    events: [],
  },
  {
    id: 'SHARE',
    name: 'Shared Soak',
    family: 'group',
    codes: ['SWIRL', 'RETICLE'],
    what: 'A soak on a player: the damage is split between everyone inside.',
    knobs: [
      'Damage set by party size',
      'Fail: the target dies, a pool, a drag',
    ],
    skins: 'A meteor, a feeding leap, a drowned bell',
    counter: 'Everyone runs in on the marked player.',
    built: ['Arcane Meteor', 'Twin Meteor', 'Damage share (Rime Lich)'],
    proposed: [
      { ability: 'Feeding Leap', boss: 'Old Gaunt' },
      { ability: 'Tolling Weight', boss: 'Abbess Morwen' },
    ],
    events: [],
  },
  {
    id: 'TOWER',
    name: 'Towers',
    family: 'group',
    codes: ['SWIRL'],
    what: 'Several soaks at once, one per player.',
    knobs: [
      'Count per player',
      'Time to fill',
      'Fail: a pool, an add',
    ],
    skins: 'Plague orbs, bone piles',
    counter: 'Each player takes a different one.',
    built: ['Plague Orb'],
    proposed: [
      { ability: 'Bone Piles', boss: 'The Marrow Engine' },
    ],
    events: [],
  },
  {
    id: 'SPREAD',
    name: 'Spread',
    family: 'group',
    codes: ['ORANGE', 'RETICLE'],
    what: 'Marked players burst after a few seconds; overlapping bursts hurt.',
    knobs: [
      'Marks: half the party, every player',
      'Burst size',
      'Leftovers: pools',
    ],
    skins: 'Plague fleas, frost bombs',
    counter: 'Spread out and drop the leftovers at the wall.',
    built: [],
    proposed: [
      { ability: 'Plague Fleas', boss: 'The Rat King' },
    ],
    events: [],
  },
  {
    id: 'MATCH',
    name: 'Match Marks',
    family: 'group',
    codes: ['LINK'],
    what: 'Each player gets a mark with a rule: stand on your glyph, share with your colour.',
    knobs: [
      'Kinds of mark',
      'The rule: match, pair, avoid the other',
    ],
    skins: 'Glyphs, gold and violet',
    counter: 'Read your mark and follow its rule.',
    built: [],
    proposed: [
      { ability: 'Mirrored Truth', boss: 'The Bound Apex' },
      { ability: 'Hymn and Hush', boss: 'Hierarch Solenne' },
    ],
    events: [],
  },
  {
    id: 'TETHER',
    name: 'Tether',
    family: 'group',
    codes: ['LINK', 'RED', 'ORANGE'],
    what: 'Links between players to break by distance or keep, sometimes pulling.',
    knobs: [
      'Shape: two, three-to-one, triangle, square',
      'Break distance, pull',
    ],
    skins: 'Severing links, binding chains',
    counter: 'Run apart to break it, or move together.',
    built: ['Severing Tether', 'Binding Chains', 'Star Tether', 'Square Tether'],
    proposed: [],
    events: [],
  },
  {
    id: 'RESCUE',
    name: 'Rescue',
    family: 'group',
    codes: ['SWIRL'],
    what: 'A player is held; another stands with them to free them.',
    knobs: [
      'Hold time',
      'Rescue time',
      'Solo: break free by dodging',
    ],
    skins: 'Alone in the dark, a cocoon, a whisper',
    counter: 'The nearest free player goes.',
    built: ['Alone in the Dark'],
    proposed: [
      { ability: 'Cocoon', boss: 'The Brinewidow' },
      { ability: 'Whisper', boss: 'Ossia' },
    ],
    events: [],
  },
  {
    id: 'BLOCK',
    name: 'Beam Block',
    family: 'group',
    codes: ['LINK'],
    what: 'A beam feeds the boss; a body in it blocks it and takes stacking damage, so players take turns.',
    knobs: [
      'What the beam gives',
      'Damage per stack, how fast stacks fall off',
      'Barriers block it too',
    ],
    skins: 'A transfusion, a frost beam',
    counter: 'Take turns in the beam.',
    built: ['Intercept (Rime Lich)'],
    proposed: [
      { ability: 'Transfusion', boss: 'Leechmont & Nine' },
    ],
    events: [],
  },
  {
    id: 'CARRY',
    name: 'Carry',
    family: 'group',
    codes: [],
    what: 'Pick something up at a source and bring it to a target.',
    knobs: [
      'Source, target, amount per run',
    ],
    skins: 'Sap to the roots, light to a brazier',
    counter: 'Free hands run between mechanics.',
    built: [],
    proposed: [
      { ability: 'Sap Wells', boss: 'Hollowheart' },
    ],
    events: [],
  },
  {
    id: 'RELAY',
    name: 'Beam Relay',
    family: 'group',
    codes: ['LINK'],
    what: 'Players line up so a beam passes through them to a target.',
    knobs: [
      'Players in the line',
      'Target',
      'What a miss does',
    ],
    skins: 'Solenne’s prisms',
    counter: 'Line up between the source and the target.',
    built: [],
    proposed: [],
    events: [
      { event: 'Rite of Alignment', frame: 'F08', boss: 'Hierarch Solenne' },
    ],
  },
]

/** The journal’s rules for templates and for the target reticle. */
export const TEMPLATE_RULES = {
  templates: 'Mechanics are templates: one standard, named mechanic with knobs (size, timing, target, severity) and a skin (sea, light, ice, fire, shadow). A new boss picks templates and skins them; it does not invent new code.',
  reticle: 'Any ability that picks a player, to hit them, chase them or move them, shows the red target reticle under that player from the moment it picks them until it lands. The zone around it says what to do.',
}

// ---------- How the templates meet the compendium's mechanics ----------

export const CODE_BY_ID: ReadonlyMap<CodeId, Code> = new Map(CODES.map((c) => [c.id, c]))

/** A built name without its note: "Binding Chains (its slow pull)" is Binding Chains. */
const bare = (name: string) => name.replace(/\s*\(.*\)$/, '')

/**
 * Each arena mechanic's one template, so a mechanic sits under one template only: the first that lists it by its own name,
 * else the first that lists it with a note. Binding Chains is Tether's; Forced Move lists only its slow pull.
 */
export const TEMPLATE_OF: ReadonlyMap<string, Template> = new Map(
  MECHANICS.flatMap((m) => {
    const home =
      TEMPLATES.find((t) => t.built.includes(m.name)) ?? TEMPLATES.find((t) => t.built.some((name) => bare(name) === m.name))
    return home ? [[m.id, home] as const] : []
  }),
)

/** A built name read against the compendium: its own mechanic, one filed under another template, or not recorded here yet. */
export type BuiltEntry =
  | { kind: 'mechanic'; name: string; mechanic: Mechanic }
  | { kind: 'elsewhere'; name: string; mechanic: Mechanic; home: Template }
  | { kind: 'other'; name: string }

export function builtEntries(template: Template): BuiltEntry[] {
  return template.built.map((name): BuiltEntry => {
    const mechanic = MECHANICS.find((m) => m.name === bare(name))
    const home = mechanic && TEMPLATE_OF.get(mechanic.id)
    if (!mechanic || !home) return { kind: 'other', name }
    return home === template ? { kind: 'mechanic', name, mechanic } : { kind: 'elsewhere', name, mechanic, home }
  })
}
