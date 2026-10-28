import { counted, int, sec, yd } from '../game/format.ts'
import type { ArtifactDef, TreeDef } from '../talents/types.ts'
import {
  apply,
  buff,
  cooldown,
  damage,
  dot,
  grant,
  more,
  plus,
  proc,
  refund,
  restore,
  restoreShare,
  spread,
  stat,
  talent,
} from './authoring.ts'

// The rogue's artifact and its abilities. Combo points start empty: Quick Strike (the main attack),
// Backstab and Fan of Knives build them. Combo points pay in steps: an ability that costs 2 spends 4
// or 6 if you have them, and grows with every step (see `combo` on the artifact). That's the daggers'
// rule, not the abilities'. The abilities are weapon strikes, so they need a blade (Fan of Knives,
// daggers to throw); any blade weapon can make them. Their talents aim only at themselves or at
// families and tags (direct damage, DoTs, area damage, finishers), and only the daggers' own tree
// talks about steps and combo points.

// ---------- Twin Daggers: the artifact and its main attack, Quick Strike ----------

const tree: TreeDef = {
  id: 'twin-daggers',
  kind: 'artifact',
  role: 'damage',
  color: '#c8404f',
  columns: 4,
  pointsPerRow: 2,

  ability: {
    name: 'Quick Strike',
    castTime: 'Instant',
    range: '5 range',
    description:
      'Strike the enemy nearest your crosshair, dealing damage and gaining a combo point. Hold the key to keep striking.',
  },
  spec: {
    // Holding the main-attack key repeats it every global cooldown: that is the daggers' auto attack.
    tags: ['main-attack', 'melee'],
    range: 5,
    gcd: 1,
    effects: [damage(260), { type: 'restore', restore: 1 }],
    text: (a) =>
      `Strike the enemy nearest your crosshair within ${yd(a.range)} yd for ${int(a.effects[0].amount)} damage. ` +
      `Gives ${counted(a.effects[1].restore, a.resource)}.`,
  },

  talents: [
    // Row 1
    talent({
      id: 'flickering-blades',
      name: 'Flickering Blades',
      row: 0,
      col: 1,
      per: [0.1, 0.2],
      text: "Quick Strike's global cooldown is {} sec shorter, so you build combo points faster.",
      does: (v) => [plus('gcd', 'main-attack', -v)],
    }),
    talent({
      id: 'bandolier',
      name: 'Bandolier',
      row: 0,
      col: 2,
      per: [1, 2],
      text: 'You can hold {} more combo points, so your abilities can take more steps.',
      does: (v) => [stat('maxResource', v)],
    }),
    talent({
      id: 'compounding',
      name: 'Compounding',
      row: 0,
      col: 3,
      per: [15, 30],
      text: 'Each step past the first adds {}% more on top of its own 100%.',
      does: (v) => [stat('comboBonus', v)],
    }),

    // Row 2
    talent({
      id: 'lucky-cut',
      name: 'Lucky Cut',
      row: 1,
      col: 0,
      per: [100],
      text: 'When Quick Strike critically strikes, you have a {}% chance to gain 1 more combo point.',
      does: (v) => [proc('crit', 'main-attack', [restore(1)], { chance: v })],
    }),
    talent({
      id: 'sharp-eyes',
      name: 'Sharp Eyes',
      row: 1,
      col: 1,
      per: [3, 6],
      text: 'You have +{}% critical chance.',
      does: (v) => [stat('crit', v)],
    }),
    talent({
      id: 'adrenaline',
      name: 'Adrenaline',
      row: 1,
      col: 2,
      requires: 'bandolier',
      per: [5, 10],
      text: 'Spending combo points in 3 or more steps at once gives you {}% haste for 6 sec.',
      does: (v) => [
        proc('cast', 'spell', [buff({ id: 'adrenaline', name: 'Adrenaline', duration: 6, stats: { haste: v } })], {
          when: { paidAtLeast: 3 },
        }),
      ],
    }),
    talent({
      id: 'sleight-of-hand',
      name: 'Sleight of Hand',
      row: 1,
      col: 3,
      requires: 'compounding',
      per: [15, 30],
      text: 'Spending combo points in 3 or more steps at once has a {}% chance to give you half of them back.',
      does: (v) => [proc('cast', 'spell', [refund(50)], { chance: v, when: { paidAtLeast: 3 } })],
    }),

    // Row 3
    talent({
      id: 'follow-through',
      name: 'Follow-Through',
      row: 2,
      col: 0,
      per: [15, 30],
      text: 'After you spend combo points, Quick Strike deals {}% more damage for 5 sec.',
      does: (v) => [
        proc('cast', 'spell', [
          buff({ id: 'follow-through', name: 'Follow-Through', duration: 5, mods: [more('amount', 'main-attack', v)] }),
        ]),
      ],
    }),
    talent({
      id: 'restless-hands',
      name: 'Restless Hands',
      row: 2,
      col: 1,
      requires: 'flickering-blades',
      text: 'After you spend combo points in 2 or more steps, your next Quick Strike gives 1 more combo point.',
      does: () => [
        proc(
          'cast',
          'spell',
          [
            buff({
              id: 'restless-hands',
              name: 'Restless Hands',
              duration: 10,
              mods: [plus('restore', { all: ['main-attack', 'resource'] }, 1)],
              consumeOn: 'main-attack',
            }),
          ],
          { when: { paidAtLeast: 2 } },
        ),
      ],
    }),

    // Row 4
    talent({
      id: 'encore',
      name: 'Encore',
      row: 3,
      col: 3,
      requires: 'sleight-of-hand',
      per: [10, 20],
      text: 'Spending combo points in 3 or more steps at once has a {}% chance to make the ability go off again at the same strength, for free.',
      does: (v) => [proc('cast', 'spell', [{ do: 'recast' }], { chance: v, when: { paidAtLeast: 3 } })],
    }),
  ],
}

export const twinDaggers: ArtifactDef = {
  id: 'twin-daggers',
  name: 'Twin Daggers',
  color: '#c8404f',
  role: 'damage',
  roleKind: 'damage',
  reach: 'melee',
  resource: 'Combo points',
  resourceStart: 0,
  combo: true,
  traits: ['blade', 'dagger'],
  stats: { maxResource: 6, resourceRegen: 0 },
  description:
    'Damage. Strikes build combo points; every ability that costs some spends as many steps of its cost as you have, ' +
    'growing with each (a cost of 2 spends 4 or 6).',
  tree,
}

// ---------- The abilities: three of these go in the damage slots ----------

// Weapon strikes: any weapon with a blade can make them, not other weapons.
const daggers = {
  role: 'damage',
  kind: 'damage',
  madeFor: 'twin-daggers',
  needs: 'blade',
  columns: 4,
  pointsPerRow: 2,
} as const

// ---------- Eviscerate: direct damage finisher ----------

export const eviscerate: TreeDef = {
  ...daggers,
  id: 'eviscerate',
  color: '#ff5c5c',
  ability: {
    name: 'Eviscerate',
    castTime: 'Instant',
    range: '5 range',
    description: 'Finisher. Strike the enemy nearest your crosshair for heavy damage.',
  },
  spec: {
    tags: ['finisher'],
    cost: 2,
    range: 5,
    effects: [damage(600, 'target')],
    text: (a) => {
      const e = a.effects[0]
      // Cleaving Finish gives it a radius.
      const splash = e.radius > 0 ? ` Every enemy within ${yd(e.radius)} yd of it is hit too.` : ''
      return (
        `Finisher. Strikes the enemy nearest your crosshair within ${yd(a.range)} yd for ${int(e.amount)} damage.` +
        `${splash} Costs ${counted(a.cost, a.resource)}.`
      )
    },
  },
  talents: [
    talent({
      id: 'brutal-finish',
      name: 'Brutal Finish',
      row: 0,
      col: 0,
      per: [5, 10, 15],
      text: 'Your finishers deal {}% more damage.',
      does: (v) => [more('amount', 'finisher', v)],
    }),
    talent({
      id: 'deep-cuts',
      name: 'Deep Cuts',
      row: 0,
      col: 1,
      per: [4, 8, 12],
      text: 'Your direct damage deals {}% more.',
      does: (v) => [more('amount', 'direct-damage', v)],
    }),
    talent({
      id: 'ruinous-strikes',
      name: 'Ruinous Strikes',
      row: 0,
      col: 3,
      per: [15, 30],
      text: 'Your direct damage has +{}% crit damage.',
      does: (v) => [plus('critDamage', 'direct-damage', v)],
    }),
    talent({
      id: 'insatiable',
      name: 'Insatiable',
      row: 1,
      col: 0,
      requires: 'brutal-finish',
      per: [15, 30],
      text: 'Your finishers have a {}% chance to give back half the @resource they spent.',
      does: (v) => [proc('cast', 'finisher', [refund(50)], { chance: v })],
    }),
    talent({
      id: 'cleaving-finish',
      name: 'Cleaving Finish',
      row: 1,
      col: 2,
      per: [3, 6],
      text: 'Eviscerate also hits every enemy within {} yd of its target.',
      does: (v) => [plus('radius', 'eviscerate', v)],
    }),
    talent({
      id: 'mercy-stroke',
      name: 'Mercy Stroke',
      row: 2,
      col: 1,
      per: [15, 30],
      text: 'Your damage is {}% higher against enemies below 35% health.',
      does: (v) => [more('amount', 'damage', v, { targetBelow: 35 })],
    }),
    talent({
      id: 'red-haze',
      name: 'Red Haze',
      row: 2,
      col: 3,
      per: [5, 10],
      text: 'After a finisher, you have +{}% haste for 6 sec.',
      does: (v) => [
        proc('cast', 'finisher', [buff({ id: 'red-haze', name: 'Red Haze', duration: 6, stats: { haste: v } })]),
      ],
    }),
    talent({
      id: 'gathering-cruelty',
      name: 'Gathering Cruelty',
      row: 3,
      col: 0,
      requires: 'insatiable',
      text: 'After every 2 finishers, your next finisher deals 50% more damage.',
      does: () => [
        proc(
          'cast',
          'finisher',
          [
            buff({
              id: 'gathering-cruelty',
              name: 'Gathering Cruelty',
              duration: 30,
              mods: [more('amount', 'finisher', 50)],
              consumeOn: 'finisher',
            }),
          ],
          { every: 2 },
        ),
      ],
    }),
    talent({
      id: 'severance',
      name: 'Severance',
      row: 3,
      col: 2,
      requires: 'cleaving-finish',
      text: 'When Eviscerate critically strikes, it gives back 25% of the @resource it spent.',
      does: () => [proc('crit', { all: ['eviscerate', 'direct-damage'] }, [refund(25)])],
    }),
  ],
}

// ---------- Rupture: bleed finisher ----------

export const rupture: TreeDef = {
  ...daggers,
  id: 'rupture',
  color: '#a3172c',
  ability: {
    name: 'Rupture',
    castTime: 'Instant',
    range: '5 range',
    description: 'Finisher. Make the enemy nearest your crosshair bleed.',
  },
  spec: {
    tags: ['finisher'],
    cost: 2,
    range: 5,
    // Steps make the bleed last longer rather than hit harder.
    effects: [dot(110, 8, 1, 'target', { grows: 'duration', name: 'Rupture' })],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Finisher. Makes the enemy nearest your crosshair within ${yd(a.range)} yd bleed for ${int(e.amount)} damage ` +
        `every ${sec(e.interval)} sec for ${sec(e.duration)} sec. Costs ${counted(a.cost, a.resource)}.`
      )
    },
  },
  talents: [
    talent({
      id: 'open-veins',
      name: 'Open Veins',
      row: 0,
      col: 0,
      per: [6, 12, 18],
      text: 'Your damage-over-time effects deal {}% more damage.',
      does: (v) => [more('amount', 'dot', v)],
    }),
    talent({
      id: 'slow-clotting',
      name: 'Slow Clotting',
      row: 0,
      col: 1,
      per: [15, 30],
      text: 'Your damage-over-time effects last {}% longer.',
      does: (v) => [more('duration', 'dot', v)],
    }),
    talent({
      id: 'quickened-bleeding',
      name: 'Quickened Bleeding',
      row: 0,
      col: 3,
      per: [10, 20],
      text: 'Your damage-over-time effects tick {}% faster.',
      does: (v) => [more('tickRate', 'dot', v)],
    }),
    talent({
      id: 'fresh-cuts',
      name: 'Fresh Cuts',
      row: 1,
      col: 1,
      requires: 'slow-clotting',
      per: [0.5, 1],
      text: 'Your direct damage adds {} sec to your damage-over-time effects on its target, up to 50% longer than they started.',
      does: (v) => [
        proc('hit', 'direct-damage', [{ do: 'extend', match: 'dot', seconds: v, scope: 'event', capPct: 50 }]),
      ],
    }),
    talent({
      id: 'blood-tithe',
      name: 'Blood Tithe',
      row: 1,
      col: 3,
      per: [0.75, 1.5],
      text: 'Each tick of your damage-over-time effects gives you back {}% of your maximum @resource.',
      does: (v) => [proc('hit', 'dot', [restoreShare(v)])],
    }),
    talent({
      id: 'weeping-wounds',
      name: 'Weeping Wounds',
      row: 2,
      col: 0,
      per: [10, 20],
      text: "Each tick of your damage-over-time effects has a {}% chance to copy it to the nearest enemy within 8 yd that doesn't have it.",
      does: (v) => [proc('hit', 'dot', [spread('dot', 8)], { chance: v })],
    }),
    talent({
      id: 'cruel-twist',
      name: 'Cruel Twist',
      row: 2,
      col: 2,
      per: [1, 2],
      text: 'When a finisher deals direct damage, your damage-over-time effects on that enemy instantly deal {} sec worth of damage.',
      does: (v) => [proc('hit', { all: ['finisher', 'direct-damage'] }, [{ do: 'pulse', match: 'dot', seconds: v }])],
    }),
    talent({
      id: 'savage-finish',
      name: 'Savage Finish',
      row: 2,
      col: 3,
      per: [10, 20],
      text: 'After a finisher, your damage-over-time effects deal {}% more damage for 8 sec.',
      does: (v) => [
        proc('cast', 'finisher', [
          buff({ id: 'savage-finish', name: 'Savage Finish', duration: 8, mods: [more('amount', 'dot', v)] }),
        ]),
      ],
    }),
    talent({
      id: 'bleed-out',
      name: 'Bleed Out',
      row: 3,
      col: 0,
      requires: 'weeping-wounds',
      text: 'When one of your damage-over-time effects ends, it deals 3 sec worth of damage at once.',
      does: () => [proc('expire', 'dot', [{ do: 'burst', seconds: 3 }])],
    }),
  ],
}

// ---------- Fan of Knives: area damage builder ----------

export const fanOfKnives: TreeDef = {
  ...daggers,
  // You throw the knives, so it takes daggers rather than any blade.
  needs: 'dagger',
  id: 'fan-of-knives',
  color: '#b9c4d0',
  ability: {
    name: 'Fan of Knives',
    castTime: 'Instant',
    range: '8 yd around you',
    description: 'Throw knives in every direction, hitting every enemy around you and building resource.',
  },
  spec: {
    effects: [damage(180, 'self', { radius: 8 }), { type: 'restore', restore: 1 }],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Throws knives all around you, hitting every enemy within ${yd(e.radius)} yd for ${int(e.amount)} damage. ` +
        `Gives ${counted(a.effects[1].restore, a.resource)}.`
      )
    },
  },
  talents: [
    talent({
      id: 'whirling-steel',
      name: 'Whirling Steel',
      row: 0,
      col: 0,
      per: [9, 18],
      text: 'Your area damage deals {}% more.',
      does: (v) => [more('amount', 'aoe', v)],
    }),
    talent({
      id: 'long-reach',
      name: 'Long Reach',
      row: 0,
      col: 1,
      per: [2, 4],
      text: 'Your area damage reaches {} yd farther.',
      does: (v) => [plus('radius', 'aoe', v)],
    }),
    talent({
      id: 'needle-points',
      name: 'Needle Points',
      row: 0,
      col: 2,
      per: [5, 10],
      text: 'Your area damage has +{}% critical chance.',
      does: (v) => [plus('critChance', 'aoe', v)],
    }),
    talent({
      id: 'salted-wounds',
      name: 'Salted Wounds',
      row: 1,
      col: 0,
      per: [10, 20],
      text: 'Your area damage deals {}% more to enemies with one of your damage-over-time effects.',
      does: (v) => [more('amount', 'aoe', v, { targetHas: 'dot' })],
    }),
    talent({
      id: 'second-volley',
      name: 'Second Volley',
      row: 1,
      col: 1,
      per: [15, 30],
      text: 'Fan of Knives has a {}% chance to be thrown a second time, for free.',
      does: (v) => [plus('echo', 'fan-of-knives', v)],
    }),
    talent({
      id: 'reaping-blades',
      name: 'Reaping Blades',
      row: 1,
      col: 3,
      per: [1.5, 3],
      text: 'Each enemy Fan of Knives hits gives you back {}% of your maximum @resource.',
      does: (v) => [proc('hit', { all: ['fan-of-knives', 'direct-damage'] }, [restoreShare(v)])],
    }),
    talent({
      id: 'scattered-blood',
      name: 'Scattered Blood',
      row: 2,
      col: 0,
      requires: 'salted-wounds',
      text:
        'When your area damage hits an enemy with one of your damage-over-time effects, it copies one of them to ' +
        "the nearest enemy within 8 yd that doesn't have it.",
      does: () => [proc('hit', 'aoe', [spread('dot', 8)], { when: { targetHas: 'dot' } })],
    }),
    talent({
      id: 'parting-flourish',
      name: 'Parting Flourish',
      row: 2,
      col: 3,
      requires: 'reaping-blades',
      per: [25, 50],
      text: 'Your finishers have a {}% chance to also throw Fan of Knives, for free.',
      does: (v) => [proc('cast', 'finisher', [{ do: 'fire', ability: 'fan-of-knives' }], { chance: v })],
    }),
    talent({
      id: 'edge-tempest',
      name: 'Edge Tempest',
      row: 3,
      col: 1,
      requires: 'second-volley',
      per: [5, 10],
      text: 'Each Fan of Knives makes your area damage deal {}% more for 6 sec, stacking up to 3 times.',
      does: (v) => [
        proc('cast', 'fan-of-knives', [
          buff({
            id: 'edge-tempest',
            name: 'Edge Tempest',
            duration: 6,
            maxStacks: 3,
            mods: [more('amount', 'aoe', v)],
          }),
        ]),
      ],
    }),
    talent({
      id: 'ragged-edges',
      name: 'Ragged Edges',
      row: 3,
      col: 3,
      text: 'Fan of Knives leaves a bleed on every enemy it hits: 30 damage every sec for 6 sec.',
      does: () => [
        proc('hit', { all: ['fan-of-knives', 'direct-damage'] }, [
          apply(dot(30, 6, 1, 'event', { name: 'Ragged Edges' })),
        ]),
      ],
    }),
  ],
}

// ---------- Backstab: heavy builder on a cooldown ----------

export const backstab: TreeDef = {
  ...daggers,
  id: 'backstab',
  color: '#8c7ae6',
  ability: {
    name: 'Backstab',
    castTime: 'Instant',
    range: '5 range',
    cooldown: '6 sec cooldown',
    description: 'Drive a dagger into the enemy nearest your crosshair for heavy damage, building resource.',
  },
  spec: {
    cooldown: 6,
    range: 5,
    effects: [damage(480), { type: 'restore', restore: 2 }],
    text: (a) =>
      `Strikes the enemy nearest your crosshair within ${yd(a.range)} yd for ${int(a.effects[0].amount)} damage. ` +
      `Gives ${counted(a.effects[1].restore, a.resource)}.`,
  },
  talents: [
    talent({
      id: 'knife-in-the-wound',
      name: 'Knife in the Wound',
      row: 0,
      col: 0,
      per: [5, 10, 15],
      text: 'Your direct damage deals {}% more to enemies with one of your damage-over-time effects.',
      does: (v) => [more('amount', 'direct-damage', v, { targetHas: 'dot' })],
    }),
    talent({
      id: 'ready-blade',
      name: 'Ready Blade',
      row: 0,
      col: 1,
      per: [1, 2],
      text: "Backstab's cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'backstab', -v)],
    }),
    talent({
      id: 'find-the-gap',
      name: 'Find the Gap',
      row: 0,
      col: 3,
      per: [3, 6],
      text: 'Your direct damage has +{}% critical chance.',
      does: (v) => [plus('critChance', 'direct-damage', v)],
    }),
    talent({
      id: 'gash',
      name: 'Gash',
      row: 1,
      col: 0,
      requires: 'knife-in-the-wound',
      text: 'Backstab also makes its target bleed for 60 damage every sec for 6 sec.',
      does: () => [grant('backstab', dot(60, 6, 1, 'same', { name: 'Gash' }))],
    }),
    talent({
      id: 'twin-shadows',
      name: 'Twin Shadows',
      row: 1,
      col: 1,
      requires: 'ready-blade',
      text: 'Backstab holds 2 charges.',
      does: () => [plus('charges', 'backstab', 1)],
    }),
    talent({
      id: 'pressure-point',
      name: 'Pressure Point',
      row: 1,
      col: 3,
      text: 'When Backstab critically strikes, it gives you back 15% of your maximum @resource.',
      does: () => [proc('crit', { all: ['backstab', 'direct-damage'] }, [restoreShare(15)])],
    }),
    talent({
      id: 'bloodscent',
      name: 'Bloodscent',
      row: 2,
      col: 0,
      text: 'When Backstab hits an enemy below 35% health, its cooldown resets.',
      does: () => [
        proc('hit', { all: ['backstab', 'direct-damage'] }, [cooldown('backstab', Infinity)], {
          when: { targetBelow: 35 },
        }),
      ],
    }),
    talent({
      id: 'flowing-strikes',
      name: 'Flowing Strikes',
      row: 2,
      col: 2,
      per: [1, 2],
      text: "Your finishers take {} sec off Backstab's cooldown.",
      does: (v) => [proc('cast', 'finisher', [cooldown('backstab', v)])],
    }),
    talent({
      id: 'exposed-guard',
      name: 'Exposed Guard',
      row: 2,
      col: 3,
      per: [10, 20],
      text: 'Backstab makes your next finisher deal {}% more damage.',
      does: (v) => [
        proc('cast', 'backstab', [
          buff({
            id: 'exposed-guard',
            name: 'Exposed Guard',
            duration: 10,
            mods: [more('amount', 'finisher', v)],
            consumeOn: 'finisher',
          }),
        ]),
      ],
    }),
    talent({
      id: 'sudden-opening',
      name: 'Sudden Opening',
      row: 3,
      col: 1,
      requires: 'twin-shadows',
      per: [10, 20],
      text: "When your main attack critically strikes, there's a {}% chance Backstab's cooldown resets.",
      does: (v) => [proc('crit', 'main-attack', [cooldown('backstab', Infinity)], { chance: v })],
    }),
  ],
}
