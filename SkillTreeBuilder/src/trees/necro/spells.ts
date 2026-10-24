import { int, sec, yd } from '../../game/format.ts'
import type { TreeDef } from '../../talents/types.ts'
import {
  apply,
  cooldown,
  damage,
  dot,
  hostileZone,
  more,
  plus,
  proc,
  restore,
  spread,
  talent,
} from '../authoring.ts'

// The summoning book's spells. All but Plague are paid for by sacrificing imps. Talents aim at
// families (DoTs, direct damage, area damage, zones), so a point in one tree helps the others.

const book = {
  role: 'damage',
  kind: 'damage',
  artifacts: ['tome-of-summoning'],
  columns: 4,
  pointsPerRow: 2,
} as const

const imps = (n: number) => `${n} imp${n === 1 ? '' : 's'}`

// ---------- Harvest: damage per DoT on every afflicted enemy ----------

export const harvest: TreeDef = {
  ...book,
  id: 'harvest',
  color: '#b8e04a',
  ability: {
    name: 'Harvest',
    castTime: 'Instant',
    range: '40 range',
    cooldown: '8 sec cooldown',
    description: 'Sacrifice imps: every enemy with your damage-over-time effects takes damage for each one on it.',
  },
  spec: {
    cost: 2,
    cooldown: 8,
    range: 40,
    effects: [damage(220, 'afflicted', { perEffect: 'dot' })],
    text: (a) =>
      `Sacrifice ${imps(a.cost)}: every enemy within ${yd(a.range)} yd takes ${int(a.effects[0].amount)} damage for ` +
      `each of your damage-over-time effects on it. Three DoTs, three times the damage.`,
  },
  talents: [
    talent({
      id: 'bountiful-harvest',
      name: 'Bountiful Harvest',
      row: 0,
      col: 0,
      per: [6, 12, 18],
      text: 'Your direct damage deals {}% more.',
      does: (v) => [more('amount', 'direct-damage', v)],
    }),
    talent({
      id: 'reapers-due',
      name: "Reaper's Due",
      row: 0,
      col: 1,
      text: 'Harvest sacrifices 1 fewer imp.',
      does: () => [plus('cost', 'harvest', -1)],
    }),
    talent({
      id: 'quick-reap',
      name: 'Quick Reap',
      row: 0,
      col: 3,
      per: [1, 2],
      text: "Harvest's cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'harvest', -v)],
    }),
    talent({
      id: 'ripe-pickings',
      name: 'Ripe Pickings',
      row: 1,
      col: 0,
      requires: 'bountiful-harvest',
      per: [10, 20, 30],
      text: 'Your direct damage deals {}% more to enemies below 35% health.',
      does: (v) => [more('amount', 'direct-damage', v, { targetBelow: 35 })],
    }),
    talent({
      id: 'gathered-souls',
      name: 'Gathered Souls',
      row: 1,
      col: 2,
      per: [10, 20],
      text: 'Each enemy Harvest hits has a {}% chance to give you an imp back.',
      does: (v) => [proc('hit', { all: ['harvest', 'direct-damage'] }, [restore(1)], { chance: v })],
    }),
    talent({
      id: 'lingering-rot',
      name: 'Lingering Rot',
      row: 1,
      col: 3,
      per: [1, 2],
      text: 'Harvest adds {} sec to your damage-over-time effects on each enemy it hits.',
      does: (v) => [
        proc('hit', { all: ['harvest', 'direct-damage'] }, [{ do: 'extend', match: 'dot', seconds: v, scope: 'event' }]),
      ],
    }),
    talent({
      id: 'grim-yield',
      name: 'Grim Yield',
      row: 2,
      col: 1,
      text: 'Harvest makes your damage-over-time effects on each enemy it hits deal 2 sec worth of damage right away.',
      does: () => [proc('hit', { all: ['harvest', 'direct-damage'] }, [{ do: 'pulse', match: 'dot', seconds: 2 }])],
    }),
    talent({
      id: 'endless-harvest',
      name: 'Endless Harvest',
      row: 2,
      col: 3,
      per: [15, 30],
      text: 'Harvest has a {}% chance not to go on cooldown.',
      does: (v) => [proc('cast', 'harvest', [cooldown('harvest', Infinity)], { chance: v })],
    }),
    talent({
      id: 'final-reaping',
      name: 'Final Reaping',
      row: 3,
      col: 1,
      requires: 'grim-yield',
      text: "Harvest's critical hits spread your damage-over-time effects to one more enemy within 12 yd.",
      does: () => [proc('crit', { all: ['harvest', 'direct-damage'] }, [spread('dot', 12)])],
    }),
    talent({
      id: 'harvest-moon',
      name: 'Harvest Moon',
      row: 3,
      col: 3,
      per: [10, 20, 30],
      text: 'Your direct damage crits for {}% more.',
      does: (v) => [plus('critDamage', 'direct-damage', v)],
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
    description: 'Sacrifice an imp to add a stack of rot to your target. Every stack keeps its own timer, and there is no limit.',
  },
  spec: {
    cost: 1,
    range: 40,
    effects: [dot(30, 30, 1, 'target', { rolling: true, name: 'Festering Rot' })],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Sacrifice ${imps(a.cost)} to add ${e.stacks > 1 ? `${e.stacks} stacks` : 'a stack'} of Festering Rot to the enemy ` +
        `nearest your crosshair within ${yd(a.range)} yd. Each stack deals ${int(e.amount)} damage every ` +
        `${sec(e.interval)} sec for ${sec(e.duration)} sec on its own timer, so stacks roll off one by one and never all refresh.`
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
      per: [4, 8, 12],
      text: 'Each stack of Festering Rot deals {} more damage per tick.',
      does: (v) => [plus('amount', 'festering-rot', v)],
    }),
    talent({
      id: 'long-decay',
      name: 'Long Decay',
      row: 0,
      col: 3,
      per: [5, 10],
      text: 'Festering Rot stacks last {} sec longer.',
      does: (v) => [plus('duration', 'festering-rot', v)],
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
      text: 'Festering Rot has a {}% chance to give its imp back.',
      does: (v) => [proc('cast', 'festering-rot', [restore(1)], { chance: v })],
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
      text: "Your imps' attacks have a 10% chance to add a stack of Festering Rot to their target.",
      does: () => [proc('hit', 'minion', [{ do: 'fire', ability: 'festering-rot', at: 'event' }], { chance: 10 })],
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

// ---------- Miasma: a sickening zone around an enemy ----------

export const miasma: TreeDef = {
  ...book,
  id: 'miasma',
  color: '#9b7fd1',
  ability: {
    name: 'Miasma',
    castTime: 'Instant',
    range: '40 range',
    cooldown: '15 sec cooldown',
    description: 'Sacrifice imps to fill the ground around an enemy with a cloud that makes everyone inside sick.',
  },
  spec: {
    cost: 2,
    cooldown: 15,
    range: 40,
    effects: [
      hostileZone(0, 12, 1, 8, {
        name: 'Miasma',
        inflicts: dot(80, 3, 1, 'event', { name: 'Sickness', tags: ['sickness'] }),
      }),
    ],
    text: (a) => {
      const e = a.effects[0]
      const sick = e.inflicts!
      return (
        `Sacrifice ${imps(a.cost)} to fill a ${yd(e.radius)} yd area around the enemy nearest your crosshair with ` +
        `Miasma for ${sec(e.duration)} sec. Every enemy inside is Sick: ${int(sick.amount)} damage every ` +
        `${sec(sick.interval)} sec, lasting ${sec(sick.duration)} sec after it leaves.`
      )
    },
  },
  talents: [
    talent({
      id: 'thick-fog',
      name: 'Thick Fog',
      row: 0,
      col: 0,
      per: [2, 4],
      text: 'Your zones are {} yd wider.',
      does: (v) => [plus('radius', 'zone', v)],
    }),
    talent({
      id: 'lingering-fog',
      name: 'Lingering Fog',
      row: 0,
      col: 1,
      per: [2, 4],
      text: 'Your zones last {} sec longer.',
      does: (v) => [plus('duration', 'zone', v)],
    }),
    talent({
      id: 'choking-air',
      name: 'Choking Air',
      row: 0,
      col: 2,
      per: [4, 8, 12],
      text: 'Enemies standing in your zones take {}% more damage from you.',
      does: (v) => [more('amount', 'damage', v, { inZone: true })],
    }),
    talent({
      id: 'clinging-cloud',
      name: 'Clinging Cloud',
      row: 1,
      col: 0,
      requires: 'thick-fog',
      text: 'Miasma follows the enemy it was placed on.',
      does: () => [plus('follow', 'miasma', 1)],
    }),
    talent({
      id: 'quick-fog',
      name: 'Quick Fog',
      row: 1,
      col: 2,
      per: [2.5, 5],
      text: "Miasma's cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'miasma', -v)],
    }),
    talent({
      id: 'feeding-fog',
      name: 'Feeding Fog',
      row: 1,
      col: 3,
      per: [5, 10],
      text: 'Each Miasma tick has a {}% chance to give you an imp.',
      does: (v) => [proc('tick', 'miasma', [restore(1)], { chance: v })],
    }),
    talent({
      id: 'lasting-sickness',
      name: 'Lasting Sickness',
      row: 2,
      col: 1,
      text: 'Sickness lasts 3 sec longer after an enemy leaves Miasma.',
      does: () => [plus('duration', 'sickness', 3)],
    }),
    talent({
      id: 'sapping-fog',
      name: 'Sapping Fog',
      row: 2,
      col: 3,
      per: [10, 20, 30],
      text: 'Your zones tick {}% faster.',
      does: (v) => [more('tickRate', 'zone', v)],
    }),
    talent({
      id: 'death-cloud',
      name: 'Death Cloud',
      row: 3,
      col: 1,
      requires: 'lasting-sickness',
      text: 'Your damage-over-time effects deal 15% more damage to enemies standing in your zones.',
      does: () => [more('amount', 'dot', 15, { inZone: true })],
    }),
    talent({
      id: 'pestilence',
      name: 'Pestilence',
      row: 3,
      col: 3,
      per: [10, 20, 30],
      text: 'Sickness deals {}% more damage.',
      does: (v) => [more('amount', 'sickness', v)],
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
    description: 'Sacrifice an imp to blow up the ground under an enemy, hitting everything around it.',
  },
  spec: {
    cost: 1,
    castTime: 1.5,
    range: 40,
    effects: [damage(450, 'target', { radius: 8 })],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Sacrifice ${imps(a.cost)} to blow up the enemy nearest your crosshair within ${yd(a.range)} yd, dealing ` +
        `${int(e.amount)} damage to it and every enemy within ${yd(e.radius)} yd of it.`
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
      per: [2, 4],
      text: 'Your explosions reach {} yd farther.',
      does: (v) => [plus('radius', { all: ['aoe', 'direct-damage'] }, v)],
    }),
    talent({
      id: 'quick-fuse',
      name: 'Quick Fuse',
      row: 0,
      col: 3,
      per: [0.25, 0.5],
      text: 'Necrotic Explosion casts {} sec faster.',
      does: (v) => [plus('castTime', 'necrotic-explosion', -v)],
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
      id: 'imp-fuel',
      name: 'Imp Fuel',
      row: 2,
      col: 3,
      per: [20, 40],
      text: 'Necrotic Explosion has a {}% chance to give its imp back.',
      does: (v) => [proc('cast', 'necrotic-explosion', [restore(1)], { chance: v })],
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
    description: 'Sacrifice an imp to rain burning ash around an enemy, hurting everyone under it.',
  },
  spec: {
    cost: 1,
    cooldown: 10,
    range: 40,
    effects: [hostileZone(120, 8, 1, 8, { name: 'Ashfall' })],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Sacrifice ${imps(a.cost)} to rain ash in a ${yd(e.radius)} yd area around the enemy nearest your crosshair ` +
        `for ${sec(e.duration)} sec. Every enemy inside takes ${int(e.amount)} damage every ${sec(e.interval)} sec.`
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
      id: 'ember-harvest',
      name: 'Ember Harvest',
      row: 2,
      col: 3,
      per: [5, 10],
      text: 'Each Ashfall tick has a {}% chance to give you an imp.',
      does: (v) => [proc('tick', 'ashfall', [restore(1)], { chance: v })],
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
