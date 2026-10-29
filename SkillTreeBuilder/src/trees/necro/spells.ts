import { counted, int, ranks, sec, yd } from '../../game/format.ts'
import type { EffectSpec } from '../../game/types.ts'
import type { TreeDef } from '../../talents/types.ts'
import {
  apply,
  buff,
  cooldown,
  damage,
  dot,
  grant,
  hostileZone,
  more,
  moreByStat,
  plus,
  proc,
  refund,
  talent,
} from '../authoring.ts'

// Damage spells made with the summoning book in mind. They fit any damage weapon and cost whatever it
// holds (imps on the book, combo points on the daggers), so their talents never lean on one weapon:
// they aim at their own ability or at families (DoTs, direct damage, area damage, zones), never at
// another ability or at imps, and give resource back as a share of what the cast cost.

const book = {
  role: 'damage',
  kind: 'damage',
  madeFor: 'tome-of-summoning',
  columns: 4,
  pointsPerRow: 2,
} as const

// ---------- Harvest: damage per DoT on every afflicted enemy ----------

/** Harvest's own hits, not their splash. */
const HARVEST_HIT = { all: ['harvest', 'direct-damage'] } as const

/** Lone Reaper's bonuses when Harvest hits only one enemy: more damage, and more splash. */
const LONE = [20, 40]
const LONE_SPLASH = [50, 100]

export const harvest: TreeDef = {
  ...book,
  id: 'harvest',
  color: '#b8e04a',
  ability: {
    name: 'Harvest',
    castTime: 'Instant',
    range: '40 range',
    description: 'Every enemy with your damage-over-time effects takes damage for each one on it.',
  },
  spec: {
    // No cooldown: its cost is the only limit on how often you Harvest.
    cost: 5,
    range: 40,
    effects: [damage(550, 'afflicted', { perEffect: 'dot' })],
    text: (a) =>
      `Every enemy within ${yd(a.range)} yd takes ${int(a.effects[0].amount)} damage for each of your ` +
      'damage-over-time effects on it. Three DoTs, three times the damage. ' +
      (a.autocast > 0 ? `Goes off on its own every ${sec(a.autocast)} sec, for free.` : `Costs ${counted(a.cost, a.resource)}.`),
  },
  talents: [
    // Row 1
    talent({
      id: 'bountiful-harvest',
      name: 'Bountiful Harvest',
      row: 0,
      col: 0,
      per: [5, 10, 15],
      text: 'Harvest deals {}% more for each of your damage-over-time effects on its target.',
      does: (v) => [more('amount', HARVEST_HIT, v, { each: 'dot' })],
    }),
    talent({
      id: 'keen-scythe',
      name: 'Keen Scythe',
      row: 0,
      col: 1,
      per: [10, 20, 30],
      text: 'Harvest deals {}% more damage.',
      does: (v) => [more('amount', HARVEST_HIT, v)],
    }),
    talent({
      id: 'reapers-due',
      name: "Reaper's Due",
      row: 0,
      col: 3,
      text: 'Harvest costs 20% less.',
      does: () => [more('cost', 'harvest', -20)],
    }),

    // Row 2
    talent({
      id: 'chaff',
      name: 'Chaff',
      row: 1,
      col: 0,
      requires: 'bountiful-harvest',
      per: [10, 20],
      text: 'Each hit of Harvest splashes {}% of its damage onto every other enemy within 8 yd of the one it hit.',
      does: (v) => [plus('splash', HARVEST_HIT, v)],
    }),
    talent({
      id: 'ripening',
      name: 'Ripening',
      row: 1,
      col: 1,
      requires: 'keen-scythe',
      text: 'Potency also raises Harvest’s damage, by the same %.',
      does: () => [moreByStat('amount', HARVEST_HIT, 'potency')],
    }),
    talent({
      id: 'reaping',
      name: 'Reaping',
      row: 1,
      col: 2,
      per: [0.5, 1],
      text:
        'Each tick of your damage over time adds {}% to your next Harvest’s damage, stacking up to 100 times. ' +
        'Harvest uses them up.',
      does: (v) => [
        proc('hit', 'dot', [
          buff({
            id: 'reaping',
            name: 'Reaping',
            duration: Infinity,
            maxStacks: 100,
            consumeOn: 'harvest',
            mods: [more('amount', HARVEST_HIT, v)],
          }),
        ]),
      ],
    }),

    // Row 3
    talent({
      id: 'lone-reaper',
      name: 'Lone Reaper',
      row: 2,
      col: 0,
      requires: 'chaff',
      per: LONE,
      text: `When Harvest hits only one enemy, it deals {}% more and splashes ${ranks(LONE_SPLASH)}% more.`,
      does: (v) => [
        more('amount', HARVEST_HIT, v, { single: true }),
        plus('soloSplash', HARVEST_HIT, LONE_SPLASH[LONE.indexOf(v)]),
      ],
    }),
    talent({
      id: 'windfall',
      name: 'Windfall',
      row: 2,
      col: 3,
      requires: 'reapers-due',
      per: [2, 4, 6],
      text:
        'Each tick of your damage over time has a {}% chance to make your next Harvest free. ' +
        'Can’t happen more than once every 20 sec.',
      does: (v) => [
        proc('hit', 'dot', [
          buff({
            id: 'windfall',
            name: 'Windfall',
            duration: Infinity,
            consumeOn: 'harvest',
            mods: [more('cost', 'harvest', -100)],
          }),
        ], { chance: v, cooldown: 20 }),
      ],
    }),

    // Row 4
    talent({
      id: 'endless-harvest',
      name: 'Endless Harvest',
      row: 3,
      col: 2,
      requires: 'reaping',
      text: 'Harvest becomes a passive: it goes off on its own every 10 sec, for free.',
      does: () => [plus('autocast', 'harvest', 10)],
    }),
  ],
}

// ---------- Festering Rot: one DoT that stacks without end, each stack on its own timer ----------

export const festeringRot: TreeDef = {
  ...book,
  id: 'festering-rot',
  color: '#8a9a3c',
  ability: {
    name: 'Festering Rot',
    castTime: 'Instant',
    range: '40 range',
    description: 'Add a stack of rot to your target. Every stack keeps its own timer, and there is no limit.',
  },
  spec: {
    cost: 1,
    range: 40,
    effects: [dot(30, 30, 1, 'target', { rolling: true, name: 'Festering Rot' })],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Adds ${e.stacks > 1 ? `${e.stacks} stacks` : 'a stack'} of Festering Rot to the enemy ` +
        `nearest your crosshair within ${yd(a.range)} yd. Each stack deals ${int(e.amount)} damage every ` +
        `${sec(e.interval)} sec for ${sec(e.duration)} sec on its own timer, so stacks roll off one by one and never all ` +
        `refresh. Costs ${counted(a.cost, a.resource)}.`
      )
    },
  },
  talents: [
    talent({
      id: 'corrosion',
      name: 'Corrosion',
      row: 0,
      col: 0,
      per: [6, 12, 18],
      text: 'Your damage-over-time effects deal {}% more damage.',
      does: (v) => [more('amount', 'dot', v)],
    }),
    talent({
      id: 'fester',
      name: 'Fester',
      row: 0,
      col: 1,
      per: [6, 12],
      text: 'Each stack of Festering Rot deals {} more damage per tick.',
      does: (v) => [plus('amount', 'festering-rot', v)],
    }),
    talent({
      id: 'double-dose',
      name: 'Double Dose',
      row: 1,
      col: 1,
      requires: 'fester',
      text: 'Festering Rot adds 2 stacks at a time.',
      does: () => [plus('stacks', 'festering-rot', 1)],
    }),
    talent({
      id: 'thrifty-rot',
      name: 'Thrifty Rot',
      row: 1,
      col: 2,
      per: [20, 40],
      text: 'Festering Rot has a {}% chance to give back its cost.',
      does: (v) => [proc('cast', 'festering-rot', [refund(100)], { chance: v })],
    }),
    talent({
      id: 'spreading-rot',
      name: 'Spreading Rot',
      row: 2,
      col: 0,
      per: [10, 20, 30],
      text: 'Your direct damage has a {}% chance to add a stack of Festering Rot to its target.',
      does: (v) => [proc('hit', 'direct-damage', [{ do: 'fire', ability: 'festering-rot', at: 'event' }], { chance: v })],
    }),
    talent({
      id: 'putrid-burst',
      name: 'Putrid Burst',
      row: 2,
      col: 2,
      per: [5, 10, 15],
      text: 'Your damage-over-time effects have +{}% critical chance.',
      does: (v) => [plus('critChance', 'dot', v)],
    }),
    talent({
      id: 'plague-carrier',
      name: 'Plague Carrier',
      row: 3,
      col: 0,
      requires: 'spreading-rot',
      text: 'Your area damage has a 10% chance to add a stack of Festering Rot to each enemy it hits.',
      does: () => [proc('hit', 'aoe', [{ do: 'fire', ability: 'festering-rot', at: 'event' }], { chance: 10 })],
    }),
    talent({
      id: 'necrosis',
      name: 'Necrosis',
      row: 3,
      col: 2,
      requires: 'putrid-burst',
      per: [1, 2, 3],
      text: 'Enemies take {}% more damage from you for each stack of Festering Rot on them.',
      does: (v) => [more('amount', 'damage', v, { stacksOf: 'festering-rot' })],
    }),
  ],
}

// ---------- Miasma: a cloud that stacks Pox on everyone inside ----------

/** Miasma's Pox, from the cloud or from Emanation: the same stacks either way. */
const POX = { all: ['miasma', 'dot'] } as const
const MIASMA_RADIUS = 8
const pox = (target: 'event' | 'self', extra: Partial<EffectSpec> = {}) =>
  dot(15, 18, 1, target, { name: 'Pox', key: 'miasma:pox', rolling: true, ...extra })

export const miasma: TreeDef = {
  ...book,
  id: 'miasma',
  color: '#9b7fd1',
  ability: {
    name: 'Miasma',
    castTime: 'Instant',
    range: '40 range',
    cooldown: '30 sec cooldown',
    description: 'Fill the ground around an enemy with a cloud that gives everyone inside a stack of Pox every second.',
  },
  spec: {
    cost: 5,
    cooldown: 30,
    range: 40,
    effects: [hostileZone(0, 3, 1, MIASMA_RADIUS, { name: 'Miasma', inflicts: pox('event') })],
    text: (a) => {
      const zone = a.effects.find((e) => e.type === 'zone')!
      const p = zone.inflicts!
      const stacks = p.stacks > 1 ? `${p.stacks} stacks` : 'a stack'
      const poxText =
        `Pox deals ${int(p.amount)} damage per stack every ${sec(p.interval)} sec for ${sec(p.duration)} sec, ` +
        'each stack on its own timer.'
      if (a.autocast > 0) {
        const aura = a.effects.find((e) => e.auto)!
        return (
          `Miasma emanates from you: every ${sec(a.autocast)} sec, every enemy within ${yd(aura.radius)} yd of you gets ` +
          `${aura.stacks > 1 ? `${aura.stacks} stacks` : 'a stack'} of Pox, for free. ${poxText}`
        )
      }
      return (
        `Fills a ${yd(zone.radius)} yd area around the enemy nearest your crosshair with Miasma for ${sec(zone.duration)} ` +
        `sec. Every ${sec(zone.interval)} sec, every enemy inside gets ${stacks} of Pox. ${poxText} ` +
        `Costs ${counted(a.cost, a.resource)}.`
      )
    },
  },
  talents: [
    // Row 1
    talent({
      id: 'restless-fog',
      name: 'Restless Fog',
      row: 0,
      col: 0,
      per: [0.3, 0.6],
      text: "Each tick of your damage over time has a 6% chance to take {} sec off Miasma's cooldown.",
      does: (v) => [proc('hit', 'dot', [cooldown('miasma', v)], { chance: 6 })],
    }),
    talent({
      id: 'lingering-pox',
      name: 'Lingering Pox',
      row: 0,
      col: 1,
      per: [3, 6, 9],
      text: 'Each stack of Pox lasts {} sec longer.',
      does: (v) => [plus('duration', POX, v)],
    }),
    talent({
      id: 'clinging-cloud',
      name: 'Clinging Cloud',
      row: 0,
      col: 3,
      per: [2, 4],
      text: "Miasma's area is {} yd wider, and it follows the enemy it was placed on.",
      does: (v) => [plus('radius', 'miasma', v), plus('follow', { all: ['miasma', 'zone'] }, 1)],
    }),

    // Row 2
    talent({
      id: 'virulent-pox',
      name: 'Virulent Pox',
      row: 1,
      col: 0,
      per: [10, 20, 30],
      text: 'Pox deals {}% more damage.',
      does: (v) => [more('amount', POX, v)],
    }),
    talent({
      id: 'concentrated-pox',
      name: 'Concentrated Pox',
      row: 1,
      col: 1,
      requires: 'lingering-pox',
      per: [15, 30],
      text: 'Pox deals {}% more damage while it’s on only one enemy.',
      does: (v) => [more('amount', POX, v, { alone: POX })],
    }),
    talent({
      id: 'noxious-burst',
      name: 'Noxious Burst',
      row: 1,
      col: 3,
      requires: 'clinging-cloud',
      per: [200, 400],
      text: 'Miasma also deals {} damage to every enemy in its area when you place it.',
      does: (v) => [grant('miasma', damage(v, 'target', { radius: MIASMA_RADIUS, name: 'Noxious Burst' }))],
    }),

    // Row 3
    talent({
      id: 'thickening-fog',
      name: 'Thickening Fog',
      row: 2,
      col: 0,
      text: 'Miasma lasts 1 sec longer.',
      does: () => [plus('duration', { all: ['miasma', 'zone'] }, 1)],
    }),
    talent({
      id: 'choking-burst',
      name: 'Choking Burst',
      row: 2,
      col: 3,
      requires: 'noxious-burst',
      per: [4, 8],
      text: "Miasma's direct damage deals {}% more for each stack of Pox on the enemy it hits.",
      does: (v) => [more('amount', { all: ['miasma', 'direct-damage'] }, v, { stacksOf: POX })],
    }),

    // Row 4: a choice, one or the other
    talent({
      id: 'emanation',
      name: 'Emanation',
      row: 3,
      col: 1,
      excludes: 'quickening-pulse',
      text:
        'Miasma emanates from you instead of being cast: every 10 sec, every enemy within 8 yd of you gets a stack of ' +
        'Pox, for free.',
      does: () => [
        plus('autocast', 'miasma', 10),
        grant('miasma', pox('self', { radius: MIASMA_RADIUS, auto: true })),
      ],
    }),
    talent({
      id: 'quickening-pulse',
      name: 'Quickening Pulse',
      row: 3,
      col: 2,
      excludes: 'emanation',
      text: 'Miasma gives Pox twice as often: every 0.5 sec.',
      does: () => [more('tickRate', { all: ['miasma', 'zone'] }, 100)],
    }),
  ],
}

// ---------- Necrotic Explosion: area burst around the target ----------

export const necroticExplosion: TreeDef = {
  ...book,
  id: 'necrotic-explosion',
  color: '#6fe0a8',
  ability: {
    name: 'Necrotic Explosion',
    castTime: '1.5 sec cast',
    range: '40 range',
    description: 'Blow up the ground under an enemy, hitting everything around it.',
  },
  spec: {
    cost: 1,
    castTime: 1.5,
    range: 40,
    effects: [damage(450, 'target', { radius: 8 })],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Blows up the enemy nearest your crosshair within ${yd(a.range)} yd, dealing ${int(e.amount)} damage to it ` +
        `and every enemy within ${yd(e.radius)} yd of it. Costs ${counted(a.cost, a.resource)}.`
      )
    },
  },
  talents: [
    talent({
      id: 'volatile-mix',
      name: 'Volatile Mix',
      row: 0,
      col: 0,
      per: [6, 12, 18],
      text: 'Your area damage deals {}% more.',
      does: (v) => [more('amount', 'aoe', v)],
    }),
    talent({
      id: 'wide-blast',
      name: 'Wide Blast',
      row: 0,
      col: 1,
      per: [2, 4, 6],
      text: 'Your explosions reach {} yd farther.',
      does: (v) => [plus('radius', { all: ['aoe', 'direct-damage'] }, v)],
    }),
    talent({
      id: 'corpse-fuel',
      name: 'Corpse Fuel',
      row: 1,
      col: 0,
      requires: 'volatile-mix',
      per: [4, 8, 12],
      text: 'Necrotic Explosion deals {}% more to each enemy for every one of your damage-over-time effects on it.',
      does: (v) => [more('amount', 'necrotic-explosion', v, { each: 'dot' })],
    }),
    talent({
      id: 'shrapnel',
      name: 'Shrapnel',
      row: 1,
      col: 2,
      per: [5, 10],
      text: 'Your area damage has +{}% critical chance.',
      does: (v) => [plus('critChance', 'aoe', v)],
    }),
    talent({
      id: 'necrotic-burn',
      name: 'Necrotic Burn',
      row: 2,
      col: 1,
      text: 'Necrotic Explosion leaves a burn on every enemy it hits: 40 damage every sec for 8 sec.',
      does: () => [
        proc('hit', { all: ['necrotic-explosion', 'direct-damage'] }, [
          apply(dot(40, 8, 1, 'event', { name: 'Necrotic Burn' })),
        ]),
      ],
    }),
    talent({
      id: 'spare-fuel',
      name: 'Spare Fuel',
      row: 2,
      col: 3,
      per: [20, 40],
      text: 'Necrotic Explosion has a {}% chance to give back its cost.',
      does: (v) => [proc('cast', 'necrotic-explosion', [refund(100)], { chance: v })],
    }),
    talent({
      id: 'chain-reaction',
      name: 'Chain Reaction',
      row: 3,
      col: 1,
      requires: 'necrotic-burn',
      text: "Necrotic Explosion's critical hits have a 50% chance to set off a smaller blast for half the damage around that enemy.",
      does: () => [
        proc(
          'crit',
          { all: ['necrotic-explosion', 'direct-damage'] },
          [apply(damage(0, 'event', { radius: 6, name: 'Chain Reaction' }), { pct: 50, of: 'amount' })],
          { chance: 50 },
        ),
      ],
    }),
    talent({
      id: 'overwhelm',
      name: 'Overwhelm',
      row: 3,
      col: 3,
      per: [10, 20, 30],
      text: 'Your area damage deals {}% more to enemies below 35% health.',
      does: (v) => [more('amount', 'aoe', v, { targetBelow: 35 })],
    }),
  ],
}

// ---------- Ashfall: a rain of burning ash ----------

export const ashfall: TreeDef = {
  ...book,
  id: 'ashfall',
  color: '#ff8a5c',
  ability: {
    name: 'Ashfall',
    castTime: 'Instant',
    range: '40 range',
    cooldown: '10 sec cooldown',
    description: 'Rain burning ash around an enemy, hurting everyone under it.',
  },
  spec: {
    cost: 1,
    cooldown: 10,
    range: 40,
    effects: [hostileZone(120, 8, 1, 8, { name: 'Ashfall' })],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Rains ash in a ${yd(e.radius)} yd area around the enemy nearest your crosshair for ${sec(e.duration)} sec. ` +
        `Every enemy inside takes ${int(e.amount)} damage every ${sec(e.interval)} sec. Costs ${counted(a.cost, a.resource)}.`
      )
    },
  },
  talents: [
    talent({
      id: 'smoldering-ash',
      name: 'Smoldering Ash',
      row: 0,
      col: 0,
      per: [6, 12, 18],
      text: 'Your zones deal {}% more damage.',
      does: (v) => [more('amount', { all: ['zone', 'damage'] }, v)],
    }),
    talent({
      id: 'ash-cloud',
      name: 'Ash Cloud',
      row: 0,
      col: 1,
      per: [2, 4],
      text: 'Your zones are {} yd wider.',
      does: (v) => [plus('radius', 'zone', v)],
    }),
    talent({
      id: 'quick-ash',
      name: 'Quick Ash',
      row: 0,
      col: 3,
      per: [2, 4],
      text: "Ashfall's cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'ashfall', -v)],
    }),
    talent({
      id: 'cinders',
      name: 'Cinders',
      row: 1,
      col: 0,
      requires: 'smoldering-ash',
      text: 'Ashfall leaves Cinders on the enemies it hits: 30 damage every sec for 4 sec.',
      // Only Ashfall's own ticks: Cinders carries the Ashfall tag too, and mustn't keep refreshing itself.
      does: () => [proc('hit', { all: ['ashfall', 'zone'] }, [apply(dot(30, 4, 1, 'event', { name: 'Cinders' }))])],
    }),
    talent({
      id: 'twin-ash',
      name: 'Twin Ash',
      row: 1,
      col: 2,
      text: 'Ashfall holds 2 charges.',
      does: () => [plus('charges', 'ashfall', 1)],
    }),
    talent({
      id: 'searing-ash',
      name: 'Searing Ash',
      row: 2,
      col: 1,
      per: [5, 10, 15],
      text: "Your zones' damage has +{}% critical chance.",
      does: (v) => [plus('critChance', { all: ['zone', 'damage'] }, v)],
    }),
    talent({
      id: 'rekindle',
      name: 'Rekindle',
      row: 2,
      col: 3,
      per: [10, 20],
      text: "Each Ashfall tick has a {}% chance to take 1 sec off Ashfall's cooldown.",
      does: (v) => [proc('tick', 'ashfall', [cooldown('ashfall', 1)], { chance: v })],
    }),
    talent({
      id: 'firestorm',
      name: 'Firestorm',
      row: 3,
      col: 1,
      requires: 'searing-ash',
      text: 'Ashfall deals 5% more damage with every tick.',
      does: () => [plus('growth', 'ashfall', 5)],
    }),
    talent({
      id: 'heat-haze',
      name: 'Heat Haze',
      row: 3,
      col: 3,
      per: [3, 6, 9],
      text: 'Enemies standing in your zones take {}% more damage from you.',
      does: (v) => [more('amount', 'damage', v, { inZone: true })],
    }),
  ],
}
