import { int, ranks, yd } from '../game/format.ts'
import type { ArtifactDef, TreeDef } from '../talents/types.ts'
import { apply, buff, damage, dot, more, plus, proc, restore, stat, talent } from './authoring.ts'

// The archer's artifact. Focus starts empty and only shooting fills it: every Swift Arrow, a 1.5 sec
// cast, gives 10. Focus counts in tens (`unit: 10`), so the shared damage abilities keep their small
// costs and mean the same here as anywhere: Harvest's 2 is 20 focus, Backstab's 2 is 20 focus back.
// This is the bow's own tree, so it talks in focus outright.

/** Swift Arrow's cast time, which Steady Aim's bonuses are in proportion to. */
const CAST = 1.5

/** Swift Arrow's hit, not the bleed Barbed Arrows leaves. */
const ARROW = { all: ['main-attack', 'direct-damage'] } as const

/** The focus Swift Arrow gives. */
const ARROW_FOCUS = { all: ['main-attack', 'resource'] } as const

/** Barbed Arrows' bleed: it always lasts this long, and gives the arrow's focus back over it. */
const BLEED = 5

/** Steady Aim's extra cast time per rank, and the % more damage and focus that buys. */
const STEADY = [0.25, 0.5]
const steadyPct = (seconds: number) => (seconds / CAST) * 100

const tree: TreeDef = {
  id: 'ashwood-longbow',
  kind: 'artifact',
  role: 'damage',
  color: '#7fb069',
  columns: 4,
  pointsPerRow: 2,

  ability: {
    name: 'Swift Arrow',
    castTime: '1.5 sec cast',
    range: '40 range',
    description: 'Shoot the enemy nearest your crosshair, dealing damage and gaining focus. Hold the key to keep shooting.',
  },
  spec: {
    // Holding the main-attack key shoots again as soon as each cast ends: the bow's auto attack.
    tags: ['main-attack', 'ranged'],
    range: 40,
    castTime: CAST,
    effects: [damage(330), { type: 'restore', restore: 1 }],
    text: (a) =>
      `Shoot the enemy nearest your crosshair within ${yd(a.range)} yd for ${int(a.effects[0].amount)} damage. ` +
      `Gives ${int(a.effects[1].restore)} ${a.resource}.`,
  },

  talents: [
    // Row 1
    talent({
      id: 'sharp-eye',
      name: 'Sharp Eye',
      row: 0,
      col: 0,
      per: [3, 6],
      text: 'You have +{}% critical chance.',
      does: (v) => [stat('crit', v)],
    }),
    talent({
      id: 'deep-quiver',
      name: 'Deep Quiver',
      row: 0,
      col: 3,
      per: [20, 40],
      text: 'You can hold {} more focus.',
      does: (v) => [stat('maxResource', v)],
    }),
    talent({
      id: 'fletching',
      name: 'Fletching',
      row: 0,
      col: 2,
      per: [2, 4],
      text: 'Swift Arrow gives {} more focus.',
      does: (v) => [plus('restore', ARROW_FOCUS, v)],
    }),

    // Row 2
    talent({
      id: 'piercing-shot',
      name: 'Piercing Shot',
      row: 1,
      col: 0,
      requires: 'sharp-eye',
      per: [1, 2],
      text: 'Each critical hit you deal, from any of your damage, gives you {} focus.',
      does: (v) => [proc('crit', 'damage', [restore(v)])],
    }),
    talent({
      id: 'steady-aim',
      name: 'Steady Aim',
      row: 1,
      col: 1,
      per: STEADY,
      text:
        'Swift Arrow takes {} sec longer to cast, and deals and gives ' +
        `${ranks(STEADY.map(steadyPct))}% more damage and focus in proportion.`,
      does: (v) => [
        plus('castTime', 'main-attack', v),
        more('amount', ARROW, steadyPct(v)),
        more('restore', ARROW_FOCUS, steadyPct(v)),
      ],
    }),
    talent({
      id: 'double-nock',
      name: 'Double Nock',
      row: 1,
      col: 3,
      per: [5, 10],
      text: 'You have +{}% echo: the chance to cast an ability again for free.',
      does: (v) => [stat('echo', v)],
    }),

    // Row 3
    talent({
      id: 'rapid-fire',
      name: 'Rapid Fire',
      row: 2,
      col: 1,
      requires: 'steady-aim',
      per: [0.25, 0.5],
      text: 'When Swift Arrow hits, it casts {} sec faster until you use any other ability.',
      does: (v) => [
        proc('hit', ARROW, [
          buff({
            id: 'rapid-fire',
            name: 'Rapid Fire',
            duration: Infinity,
            lostUnless: 'main-attack',
            mods: [plus('castTime', 'main-attack', -v)],
          }),
        ]),
      ],
    }),
    talent({
      id: 'focused-mind',
      name: 'Focused Mind',
      row: 2,
      col: 2,
      requires: 'fletching',
      per: [5, 10],
      text: 'Every 5 sec, you gain {} focus.',
      does: (v) => [proc('second', 'second', [restore(v)], { every: 5 })],
    }),

    // Row 4
    talent({
      id: 'overdraw',
      name: 'Overdraw',
      row: 3,
      col: 1,
      requires: 'rapid-fire',
      text: 'Your abilities cost 50% more focus and deal 50% more damage.',
      does: () => [more('cost', 'spell', 50), more('amount', { all: ['spell', 'damage'] }, 50)],
    }),
    talent({
      id: 'barbed-arrows',
      name: 'Barbed Arrows',
      row: 3,
      col: 2,
      requires: 'focused-mind',
      text:
        'Swift Arrow also leaves a bleed on its target: 25 damage every sec for 5 sec. Over those 5 sec it gives ' +
        'you that arrow’s focus again, a fifth every second in whole focus (12 focus comes as 2, 2, 3, 2, 3). ' +
        'Every arrow’s bleed runs on its own, and nothing makes it last longer.',
      does: () => [
        proc('hit', ARROW, [
          apply(dot(25, BLEED, 1, 'event', { name: 'Barbed Arrow', rolling: true, fixedDuration: true })),
          { do: 'trickle', pct: 100, seconds: BLEED },
        ]),
      ],
    }),
  ],
}

export const ashwoodLongbow: ArtifactDef = {
  id: 'ashwood-longbow',
  name: 'Ashwood Longbow',
  color: '#7fb069',
  role: 'damage',
  roleKind: 'damage',
  reach: 'ranged',
  resource: 'Focus',
  resourceStart: 0,
  unit: 10,
  traits: ['bow'],
  stats: { maxResource: 100, resourceRegen: 0 },
  description: 'Damage, from range. Focus starts empty: every arrow you shoot gives 10, and your abilities spend it.',
  tree,
}
