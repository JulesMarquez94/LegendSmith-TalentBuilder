import { statValue } from '../game/format.ts'
import type { CharStat, CharStats, ResolvedAbility } from '../game/types.ts'
import type { TreeDef } from '../talents/types.ts'
import { apply, aura, buff, cooldown, group, more, plus, proc, shield, stat, talent } from './authoring.ts'

// Group buffs, for the buff slot: one per character, chosen by role. Each is passive and gives you
// and everyone in your group its stats. Most talents add group stats (the buff's own, plus one
// related stat), so a point here helps the whole group. The rest aim at families (healing, shields,
// DoTs, mobility…) and tags like the ultimate's 'cooldown' slot, so they lift whatever you slotted.

const groupBuff = { kind: 'buff', columns: 4, pointsPerRow: 2 } as const
const healerBuff = { ...groupBuff, role: 'healer' } as const
const damageBuff = { ...groupBuff, role: 'damage' } as const
const tankBuff = { ...groupBuff, role: 'tank' } as const

/** The aura's own value for a stat, with its unit: "8%". */
const auraValue = (a: ResolvedAbility, s: CharStat) => statValue(s, a.effects[0].stats?.[s] ?? 0)

/** A short buff on you and your whole group, for procs. */
const rally = (id: string, name: string, duration: number, stats: Partial<CharStats>) =>
  buff({ id, name, duration, stats, group: true })

// ---------- Vitality Aura: more maximum health ----------

export const vitalityAura: TreeDef = {
  ...healerBuff,
  id: 'vitality-aura',
  color: '#7fd98a',
  ability: {
    name: 'Vitality Aura',
    castTime: 'Passive',
    range: 'Group',
    description: 'Passive. You and your group have more maximum health.',
  },
  spec: {
    effects: [aura({ healthPct: 8 })],
    text: (a) => `Passive. You and your group have ${auraValue(a, 'healthPct')} more maximum health.`,
  },
  talents: [
    talent({
      id: 'swelling-heart',
      name: 'Swelling Heart',
      row: 0,
      col: 0,
      per: [2, 4, 6],
      text: 'You and your group have {}% more maximum health.',
      does: (v) => [group('healthPct', v)],
    }),
    talent({
      id: 'warm-blood',
      name: 'Warm Blood',
      row: 0,
      col: 1,
      per: [1, 2, 3],
      text: 'You and your group receive {}% more healing.',
      does: (v) => [group('healingTaken', v)],
    }),
    talent({
      id: 'enduring-care',
      name: 'Enduring Care',
      row: 0,
      col: 3,
      per: [3, 6],
      text: 'Your heal-over-time effects, zones, shields and buffs last {}% longer.',
      does: (v) => [stat('potency', v)],
    }),
    talent({
      id: 'thread-of-life',
      name: 'Thread of Life',
      row: 1,
      col: 0,
      requires: 'swelling-heart',
      per: [6, 12],
      text: 'Your heals heal {}% more on allies below 50% health.',
      does: (v) => [more('amount', 'healing', v, { targetBelow: 50 })],
    }),
    talent({
      id: 'steady-pulse',
      name: 'Steady Pulse',
      row: 1,
      col: 2,
      per: [4, 8, 12],
      text: 'Your heal-over-time effects heal {}% more.',
      does: (v) => [more('amount', 'hot', v)],
    }),
    talent({
      id: 'rallying-beat',
      name: 'Rallying Beat',
      row: 2,
      col: 1,
      per: [15, 30],
      text: 'Your critical heals have a {}% chance to make you and your group take 5% less damage for 6 sec.',
      does: (v) => [
        proc('crit', 'healing', [rally('rallying-beat', 'Rallying Beat', 6, { damageReduction: 5 })], { chance: v }),
      ],
    }),
    talent({
      id: 'living-ward',
      name: 'Living Ward',
      row: 2,
      col: 3,
      per: [10, 20],
      text: 'Your shields absorb {}% more.',
      does: (v) => [more('amount', 'shield', v)],
    }),
    talent({
      id: 'racing-heart',
      name: 'Racing Heart',
      row: 3,
      col: 1,
      requires: 'rallying-beat',
      text: 'When you heal an ally below 30% health, you and your group receive 10% more healing for 4 sec.',
      does: () => [
        proc('heal', 'healing', [rally('racing-heart', 'Racing Heart', 4, { healingTaken: 10 })], {
          when: { targetBelow: 30 },
        }),
      ],
    }),
  ],
}

// ---------- Mending Grace: more healing received ----------

export const mendingGrace: TreeDef = {
  ...healerBuff,
  id: 'mending-grace',
  color: '#f2d16b',
  ability: {
    name: 'Mending Grace',
    castTime: 'Passive',
    range: 'Group',
    description: 'Passive. You and your group receive more healing.',
  },
  spec: {
    effects: [aura({ healingTaken: 8 })],
    text: (a) => `Passive. You and your group receive ${auraValue(a, 'healingTaken')} more healing.`,
  },
  talents: [
    talent({
      id: 'open-arms',
      name: 'Open Arms',
      row: 0,
      col: 0,
      per: [2, 4, 6],
      text: 'You and your group receive {}% more healing.',
      does: (v) => [group('healingTaken', v)],
    }),
    talent({
      id: 'gentle-touch',
      name: 'Gentle Touch',
      row: 0,
      col: 1,
      per: [4, 8, 12],
      text: 'Your direct heals heal {}% more.',
      does: (v) => [more('amount', 'direct-heal', v)],
    }),
    talent({
      id: 'quiet-breath',
      name: 'Quiet Breath',
      row: 0,
      col: 3,
      per: [0.1, 0.2],
      text: 'You regenerate {}% of your maximum @resource more per sec.',
      does: (v) => [stat('resourceRegenPct', v)],
    }),
    talent({
      id: 'sturdy-kin',
      name: 'Sturdy Kin',
      row: 1,
      col: 0,
      requires: 'open-arms',
      per: [1, 2, 3],
      text: 'You and your group have {}% more maximum health.',
      does: (v) => [group('healthPct', v)],
    }),
    talent({
      id: 'keen-mercy',
      name: 'Keen Mercy',
      row: 1,
      col: 2,
      per: [2, 4],
      text: 'Your heals have +{}% critical chance.',
      does: (v) => [plus('critChance', 'healing', v)],
    }),
    talent({
      id: 'swift-mercy',
      name: 'Swift Mercy',
      row: 2,
      col: 0,
      per: [5, 10],
      text: 'When you heal an ally below 35% health, you have +{}% haste for 4 sec.',
      does: (v) => [
        proc('heal', 'healing', [buff({ id: 'swift-mercy', name: 'Swift Mercy', duration: 4, stats: { haste: v } })], {
          when: { targetBelow: 35 },
        }),
      ],
    }),
    talent({
      id: 'bright-mercy',
      name: 'Bright Mercy',
      row: 2,
      col: 2,
      requires: 'keen-mercy',
      per: [10, 20],
      text: 'Your heals have +{}% crit damage.',
      does: (v) => [plus('critDamage', 'healing', v)],
    }),
    talent({
      id: 'overflowing-grace',
      name: 'Overflowing Grace',
      row: 3,
      col: 2,
      requires: 'bright-mercy',
      text: 'When you critically heal, you and your group receive 8% more healing for 4 sec.',
      does: () => [proc('crit', 'healing', [rally('overflowing-grace', 'Overflowing Grace', 4, { healingTaken: 8 })])],
    }),
  ],
}

// ---------- War Cadence: haste ----------

export const warCadence: TreeDef = {
  ...damageBuff,
  id: 'war-cadence',
  color: '#ff7a45',
  ability: {
    name: 'War Cadence',
    castTime: 'Passive',
    range: 'Group',
    description: 'Passive. You and your group act faster.',
  },
  spec: {
    effects: [aura({ haste: 5 })],
    text: (a) => `Passive. You and your group have +${auraValue(a, 'haste')} haste.`,
  },
  talents: [
    talent({
      id: 'marching-step',
      name: 'Marching Step',
      row: 0,
      col: 0,
      per: [3, 6],
      text: 'You and your group move {}% faster.',
      does: (v) => [group('speed', v)],
    }),
    talent({
      id: 'drumbeat',
      name: 'Drumbeat',
      row: 0,
      col: 1,
      per: [1, 2, 3],
      text: 'You and your group have +{}% haste.',
      does: (v) => [group('haste', v)],
    }),
    talent({
      id: 'echoing-drums',
      name: 'Echoing Drums',
      row: 0,
      col: 2,
      per: [2, 4],
      text: 'Your abilities have +{}% chance to be cast a second time for free.',
      does: (v) => [stat('echo', v)],
    }),
    talent({
      id: 'hurried-ruin',
      name: 'Hurried Ruin',
      row: 1,
      col: 0,
      per: [5, 10, 15],
      text: 'Your damage-over-time effects tick {}% faster.',
      does: (v) => [more('tickRate', 'dot', v)],
    }),
    talent({
      id: 'relentless-tempo',
      name: 'Relentless Tempo',
      row: 1,
      col: 2,
      per: [4, 8],
      text: "Your damage abilities' cooldowns are {}% shorter.",
      does: (v) => [more('cooldown', 'damage', -v)],
    }),
    talent({
      id: 'tight-rhythm',
      name: 'Tight Rhythm',
      row: 1,
      col: 3,
      per: [0.05, 0.1],
      text: "Your damage abilities' global cooldown is {} sec shorter.",
      does: (v) => [plus('gcd', 'damage', -v)],
    }),
    talent({
      id: 'tempo-surge',
      name: 'Tempo Surge',
      row: 2,
      col: 1,
      requires: 'drumbeat',
      per: [5, 10, 15],
      text: 'Your critical hits have a {}% chance to give you and your group +5% haste for 5 sec.',
      does: (v) => [proc('crit', 'damage', [rally('tempo-surge', 'Tempo Surge', 5, { haste: 5 })], { chance: v })],
    }),
    talent({
      id: 'breakneck',
      name: 'Breakneck',
      row: 3,
      col: 2,
      requires: 'relentless-tempo',
      text: "Each critical hit takes 0.3 sec off your ultimate's cooldown.",
      does: () => [proc('crit', 'damage', [cooldown('cooldown', 0.3)])],
    }),
  ],
}

// ---------- Keen Edge: critical chance ----------

export const keenEdge: TreeDef = {
  ...damageBuff,
  id: 'keen-edge',
  color: '#ff4d5e',
  ability: {
    name: 'Keen Edge',
    castTime: 'Passive',
    range: 'Group',
    description: 'Passive. You and your group strike critically more often.',
  },
  spec: {
    effects: [aura({ crit: 5 })],
    text: (a) => `Passive. You and your group have +${auraValue(a, 'crit')} critical chance.`,
  },
  talents: [
    talent({
      id: 'honed-edge',
      name: 'Honed Edge',
      row: 0,
      col: 0,
      per: [1, 2, 3],
      text: 'You and your group have +{}% critical chance.',
      does: (v) => [group('crit', v)],
    }),
    talent({
      id: 'needle-point',
      name: 'Needle Point',
      row: 0,
      col: 1,
      per: [2, 4, 6],
      text: 'Your direct damage has +{}% critical chance.',
      does: (v) => [plus('critChance', 'direct-damage', v)],
    }),
    talent({
      id: 'festering-cuts',
      name: 'Festering Cuts',
      row: 0,
      col: 3,
      per: [2, 4],
      text: 'Your damage-over-time effects have +{}% critical chance.',
      does: (v) => [plus('critChance', 'dot', v)],
    }),
    talent({
      id: 'cutting-depth',
      name: 'Cutting Depth',
      row: 1,
      col: 0,
      requires: 'honed-edge',
      per: [4, 8, 12],
      text: 'You and your group have +{}% crit damage.',
      does: (v) => [group('critDamage', v)],
    }),
    talent({
      id: 'wide-swathe',
      name: 'Wide Swathe',
      row: 1,
      col: 2,
      per: [3, 6],
      text: 'Your area damage has +{}% critical chance.',
      does: (v) => [plus('critChance', 'aoe', v)],
    }),
    talent({
      id: 'laid-open',
      name: 'Laid Open',
      row: 2,
      col: 1,
      per: [5, 10],
      text: 'Your critical hits have a {}% chance to give you and your group +4% critical chance for 5 sec.',
      does: (v) => [proc('crit', 'damage', [rally('laid-open', 'Laid Open', 5, { crit: 4 })], { chance: v })],
    }),
    talent({
      id: 'calm-hand',
      name: 'Calm Hand',
      row: 2,
      col: 3,
      per: [5, 10],
      text: 'You have +{}% crit damage.',
      does: (v) => [stat('critDamage', v)],
    }),
    talent({
      id: 'deep-incision',
      name: 'Deep Incision',
      row: 3,
      col: 3,
      requires: 'calm-hand',
      text: 'When your direct damage critically hits, your damage-over-time effects on the target deal 2 sec worth of damage at once.',
      does: () => [proc('crit', 'direct-damage', [{ do: 'pulse', match: 'dot', seconds: 2 }])],
    }),
  ],
}

// ---------- Sharpened Will: power ----------

export const sharpenedWill: TreeDef = {
  ...damageBuff,
  id: 'sharpened-will',
  color: '#ffa53d',
  ability: {
    name: 'Sharpened Will',
    castTime: 'Passive',
    range: 'Group',
    description: 'Passive. You and your group hit, heal and shield harder.',
  },
  spec: {
    effects: [aura({ power: 6 })],
    text: (a) =>
      `Passive. You and your group have +${auraValue(a, 'power')} power: every hit, heal and shield lands harder.`,
  },
  talents: [
    talent({
      id: 'steeled-mind',
      name: 'Steeled Mind',
      row: 0,
      col: 1,
      per: [1, 2, 3],
      text: 'You and your group have +{}% power.',
      does: (v) => [group('power', v)],
    }),
    talent({
      id: 'focused-breath',
      name: 'Focused Breath',
      row: 0,
      col: 2,
      per: [1, 2, 3],
      text: 'You and your group have +{}% haste.',
      does: (v) => [group('haste', v)],
    }),
    talent({
      id: 'unwavering-focus',
      name: 'Unwavering Focus',
      row: 0,
      col: 3,
      per: [3, 6],
      text: 'Your damage-over-time effects, zones, shields and buffs last {}% longer.',
      does: (v) => [stat('potency', v)],
    }),
    talent({
      id: 'commanding-will',
      name: 'Commanding Will',
      row: 1,
      col: 0,
      per: [5, 10],
      text: 'Your direct damage deals {}% more.',
      does: (v) => [more('amount', 'direct-damage', v)],
    }),
    talent({
      id: 'honed-intent',
      name: 'Honed Intent',
      row: 1,
      col: 1,
      requires: 'steeled-mind',
      per: [3, 6, 9],
      text: 'Your damage is {}% higher.',
      does: (v) => [more('amount', 'damage', v)],
    }),
    talent({
      id: 'broad-intent',
      name: 'Broad Intent',
      row: 2,
      col: 0,
      per: [5, 10],
      text: 'Your area damage is {}% higher.',
      does: (v) => [more('amount', 'aoe', v)],
    }),
    talent({
      id: 'gathered-will',
      name: 'Gathered Will',
      row: 2,
      col: 2,
      per: [15, 30],
      text: 'Every 4th damage ability you cast makes your next one deal {}% more damage.',
      does: (v) => [
        proc(
          'cast',
          'damage',
          [
            buff({
              id: 'gathered-will',
              name: 'Gathered Will',
              duration: 10,
              mods: [more('amount', 'damage', v)],
              consumeOn: 'damage',
            }),
          ],
          { every: 4 },
        ),
      ],
    }),
    talent({
      id: 'shared-resolve',
      name: 'Shared Resolve',
      row: 3,
      col: 1,
      requires: 'honed-intent',
      text: 'When you cast your ultimate, you and your group have +10% power for 10 sec.',
      does: () => [proc('cast', 'cooldown', [rally('shared-resolve', 'Shared Resolve', 10, { power: 10 })])],
    }),
  ],
}

// ---------- Stoneskin: damage reduction ----------

export const stoneskin: TreeDef = {
  ...tankBuff,
  id: 'stoneskin',
  color: '#8a9bb0',
  ability: {
    name: 'Stoneskin',
    castTime: 'Passive',
    range: 'Group',
    description: 'Passive. You and your group take less damage.',
  },
  spec: {
    effects: [aura({ damageReduction: 5 })],
    text: (a) => `Passive. You and your group take ${auraValue(a, 'damageReduction')} less damage.`,
  },
  talents: [
    talent({
      id: 'granite-hide',
      name: 'Granite Hide',
      row: 0,
      col: 1,
      per: [1, 2, 3],
      text: 'You and your group take {}% less damage.',
      does: (v) => [group('damageReduction', v)],
    }),
    talent({
      id: 'bedrock',
      name: 'Bedrock',
      row: 0,
      col: 2,
      per: [1, 2, 3],
      text: 'You and your group have {}% more maximum health.',
      does: (v) => [group('healthPct', v)],
    }),
    talent({
      id: 'packed-earth',
      name: 'Packed Earth',
      row: 1,
      col: 0,
      per: [200, 400, 600],
      text: 'You have {} more health.',
      does: (v) => [stat('health', v)],
    }),
    talent({
      id: 'unyielding-core',
      name: 'Unyielding Core',
      row: 1,
      col: 1,
      requires: 'granite-hide',
      per: [2, 4],
      text: 'You take {}% less damage.',
      does: (v) => [stat('damageReduction', v)],
    }),
    talent({
      id: 'layered-plates',
      name: 'Layered Plates',
      row: 1,
      col: 3,
      per: [10, 20],
      text: 'Your shields absorb {}% more.',
      does: (v) => [more('amount', 'shield', v)],
    }),
    talent({
      id: 'rock-shell',
      name: 'Rock Shell',
      row: 2,
      col: 0,
      per: [10, 20],
      text: 'Your hits have a {}% chance to shield you for 400 for 6 sec.',
      does: (v) => [proc('hit', 'damage', [apply(shield(400, 6, 'self', { name: 'Rock Shell' }))], { chance: v })],
    }),
    talent({
      id: 'lasting-stone',
      name: 'Lasting Stone',
      row: 2,
      col: 2,
      per: [2, 4],
      text: 'Your shields last {} sec longer.',
      does: (v) => [plus('duration', 'shield', v)],
    }),
    talent({
      id: 'living-rampart',
      name: 'Living Rampart',
      row: 3,
      col: 1,
      requires: 'unyielding-core',
      text: 'When you cast your ultimate, you and your group take 10% less damage for 8 sec.',
      does: () => [proc('cast', 'cooldown', [rally('living-rampart', 'Living Rampart', 8, { damageReduction: 10 })])],
    }),
  ],
}

// ---------- Evasion Drill: dodge ----------

export const evasionDrill: TreeDef = {
  ...tankBuff,
  id: 'evasion-drill',
  color: '#5ab4e6',
  ability: {
    name: 'Evasion Drill',
    castTime: 'Passive',
    range: 'Group',
    description: 'Passive. You and your group dodge more hits.',
  },
  spec: {
    effects: [aura({ dodge: 4 })],
    text: (a) => `Passive. You and your group have +${auraValue(a, 'dodge')} dodge: the chance to avoid a hit completely.`,
  },
  talents: [
    talent({
      id: 'sidestep-practice',
      name: 'Sidestep Practice',
      row: 0,
      col: 0,
      per: [1, 2, 3],
      text: 'You and your group have +{}% dodge.',
      does: (v) => [group('dodge', v)],
    }),
    talent({
      id: 'nimble-ranks',
      name: 'Nimble Ranks',
      row: 0,
      col: 2,
      per: [3, 6, 9],
      text: 'You and your group move {}% faster.',
      does: (v) => [group('speed', v)],
    }),
    talent({
      id: 'practiced-feet',
      name: 'Practiced Feet',
      row: 0,
      col: 3,
      per: [2, 4, 6],
      text: 'You have +{}% dodge.',
      does: (v) => [stat('dodge', v)],
    }),
    talent({
      id: 'drilled-reflexes',
      name: 'Drilled Reflexes',
      row: 1,
      col: 1,
      per: [1, 2],
      text: 'Your mobility ability recharges {} sec faster.',
      does: (v) => [plus('cooldown', 'mobility', -v)],
    }),
    talent({
      id: 'counterstep',
      name: 'Counterstep',
      row: 1,
      col: 3,
      requires: 'practiced-feet',
      per: [5, 10],
      text: 'After you use your mobility ability, you and your group have +{}% dodge for 4 sec.',
      does: (v) => [proc('cast', 'mobility', [rally('counterstep', 'Counterstep', 4, { dodge: v })])],
    }),
    talent({
      id: 'read-the-feint',
      name: 'Read the Feint',
      row: 2,
      col: 0,
      per: [1, 2],
      text: 'Your critical hits give you +{}% dodge for 8 sec, stacking up to 3 times.',
      does: (v) => [
        proc('crit', 'damage', [
          buff({ id: 'read-the-feint', name: 'Read the Feint', duration: 8, maxStacks: 3, stats: { dodge: v } }),
        ]),
      ],
    }),
    talent({
      id: 'tight-formation',
      name: 'Tight Formation',
      row: 2,
      col: 2,
      per: [1, 2],
      text: 'You and your group take {}% less damage.',
      does: (v) => [group('damageReduction', v)],
    }),
    talent({
      id: 'endless-drills',
      name: 'Endless Drills',
      row: 3,
      col: 1,
      requires: 'drilled-reflexes',
      text: 'Your mobility ability holds 1 more charge.',
      does: () => [plus('charges', 'mobility', 1)],
    }),
  ],
}

// ---------- Forced March: movement speed ----------

export const forcedMarch: TreeDef = {
  ...tankBuff,
  id: 'forced-march',
  color: '#5f7fd9',
  ability: {
    name: 'Forced March',
    castTime: 'Passive',
    range: 'Group',
    description: 'Passive. You and your group move faster.',
  },
  spec: {
    effects: [aura({ speed: 10 })],
    text: (a) => `Passive. You and your group move ${auraValue(a, 'speed')} faster.`,
  },
  talents: [
    talent({
      id: 'brisk-pace',
      name: 'Brisk Pace',
      row: 0,
      col: 0,
      per: [2, 4, 6],
      text: 'You and your group move {}% faster.',
      does: (v) => [group('speed', v)],
    }),
    talent({
      id: 'hardened-marchers',
      name: 'Hardened Marchers',
      row: 0,
      col: 1,
      per: [1, 2, 3],
      text: 'You and your group have {}% more maximum health.',
      does: (v) => [group('healthPct', v)],
    }),
    talent({
      id: 'mile-eater',
      name: 'Mile Eater',
      row: 0,
      col: 3,
      per: [2, 4, 6],
      text: 'Your dashes and teleports go {} yd farther.',
      does: (v) => [plus('distance', 'movement', v)],
    }),
    talent({
      id: 'quick-time',
      name: 'Quick Time',
      row: 1,
      col: 0,
      requires: 'brisk-pace',
      per: [1, 2],
      text: 'You and your group have +{}% haste.',
      does: (v) => [group('haste', v)],
    }),
    talent({
      id: 'loose-formation',
      name: 'Loose Formation',
      row: 1,
      col: 2,
      per: [1, 2],
      text: 'You and your group have +{}% dodge.',
      does: (v) => [group('dodge', v)],
    }),
    talent({
      id: 'running-start',
      name: 'Running Start',
      row: 2,
      col: 1,
      per: [15, 30],
      text: 'After you use your mobility ability, you and your group move {}% faster for 4 sec.',
      does: (v) => [proc('cast', 'mobility', [rally('running-start', 'Running Start', 4, { speed: v })])],
    }),
    talent({
      id: 'road-legs',
      name: 'Road Legs',
      row: 2,
      col: 3,
      per: [5, 10],
      text: 'You move {}% faster.',
      does: (v) => [stat('speed', v)],
    }),
    talent({
      id: 'onward',
      name: 'Onward',
      row: 3,
      col: 1,
      requires: 'running-start',
      text: 'When you cast your ultimate, you and your group move 30% faster and have +5% haste for 8 sec.',
      does: () => [proc('cast', 'cooldown', [rally('onward', 'Onward', 8, { speed: 30, haste: 5 })])],
    }),
  ],
}

/** Every group buff, healer first, then damage, then tank. */
export const GROUP_BUFFS: readonly TreeDef[] = [
  vitalityAura,
  mendingGrace,
  warCadence,
  keenEdge,
  sharpenedWill,
  stoneskin,
  evasionDrill,
  forcedMarch,
]
