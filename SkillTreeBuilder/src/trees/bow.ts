import { int, yd } from '../game/format.ts'
import type { ArtifactDef, TreeDef } from '../talents/types.ts'
import { apply, buff, damage, dot, more, plus, proc, refund, restore, stat, talent } from './authoring.ts'

// The archer's artifact. Focus starts empty and only shooting fills it: every Swift Arrow gives 10.
// Focus counts in tens (`unit: 10`), so the shared damage abilities keep their small costs and mean
// the same here as anywhere: Harvest's 2 is 20 focus, Backstab's 2 is 20 focus back. This is the
// bow's own tree, so it talks in focus outright.

const tree: TreeDef = {
  id: 'ashwood-longbow',
  kind: 'artifact',
  role: 'damage',
  color: '#7fb069',
  columns: 4,
  pointsPerRow: 2,

  ability: {
    name: 'Swift Arrow',
    castTime: 'Instant',
    range: '40 range',
    description: 'Shoot the enemy nearest your crosshair, dealing damage and gaining focus. Hold the key to keep shooting.',
  },
  spec: {
    // Holding the main-attack key repeats it every global cooldown: the bow's auto attack.
    tags: ['main-attack', 'ranged'],
    range: 40,
    gcd: 1,
    effects: [damage(220), { type: 'restore', restore: 1 }],
    text: (a) =>
      `Shoot the enemy nearest your crosshair within ${yd(a.range)} yd for ${int(a.effects[0].amount)} damage. ` +
      `Gives ${int(a.effects[1].restore)} ${a.resource}.`,
  },

  talents: [
    // Row 1
    talent({
      id: 'quick-draw',
      name: 'Quick Draw',
      row: 0,
      col: 1,
      per: [0.1, 0.2],
      text: "Swift Arrow's global cooldown is {} sec shorter, so you gain focus faster.",
      does: (v) => [plus('gcd', 'main-attack', -v)],
    }),
    talent({
      id: 'deep-quiver',
      name: 'Deep Quiver',
      row: 0,
      col: 2,
      per: [10, 20],
      text: 'You can hold {} more focus.',
      does: (v) => [stat('maxResource', v)],
    }),
    talent({
      id: 'steady-aim',
      name: 'Steady Aim',
      row: 0,
      col: 3,
      per: [2, 4],
      text: 'Swift Arrow gives {} more focus.',
      does: (v) => [plus('restore', { all: ['main-attack', 'resource'] }, v)],
    }),

    // Row 2
    talent({
      id: 'piercing-shot',
      name: 'Piercing Shot',
      row: 1,
      col: 0,
      per: [5, 10],
      text: 'When Swift Arrow critically strikes, you gain {} more focus.',
      does: (v) => [proc('crit', { all: ['main-attack', 'direct-damage'] }, [restore(v)])],
    }),
    talent({
      id: 'eagle-eye',
      name: 'Eagle Eye',
      row: 1,
      col: 1,
      per: [3, 6],
      text: 'You have +{}% critical chance.',
      does: (v) => [stat('crit', v)],
    }),
    talent({
      id: 'retrieved-arrows',
      name: 'Retrieved Arrows',
      row: 1,
      col: 3,
      requires: 'steady-aim',
      per: [10, 20],
      text: 'Spending focus has a {}% chance to give half of it back.',
      does: (v) => [proc('cast', 'spell', [refund(50)], { chance: v })],
    }),

    // Row 3
    talent({
      id: 'focused-fire',
      name: 'Focused Fire',
      row: 2,
      col: 0,
      per: [15, 30],
      text: 'After you spend focus, Swift Arrow deals {}% more damage for 5 sec.',
      does: (v) => [
        proc('cast', 'spell', [
          buff({ id: 'focused-fire', name: 'Focused Fire', duration: 5, mods: [more('amount', 'main-attack', v)] }),
        ]),
      ],
    }),
    talent({
      id: 'rapid-fire',
      name: 'Rapid Fire',
      row: 2,
      col: 2,
      requires: 'eagle-eye',
      per: [3, 6],
      text: 'Spending focus gives you {}% haste for 6 sec.',
      does: (v) => [
        proc('cast', 'spell', [buff({ id: 'rapid-fire', name: 'Rapid Fire', duration: 6, stats: { haste: v } })]),
      ],
    }),

    // Row 4
    talent({
      id: 'overdraw',
      name: 'Overdraw',
      row: 3,
      col: 0,
      requires: 'focused-fire',
      text: 'Your abilities cost 50% more focus and deal 35% more damage.',
      does: () => [more('cost', 'spell', 50), more('amount', { all: ['spell', 'damage'] }, 35)],
    }),
    talent({
      id: 'barbed-arrows',
      name: 'Barbed Arrows',
      row: 3,
      col: 3,
      requires: 'retrieved-arrows',
      text: 'Swift Arrow leaves a bleed on its target: 25 damage every sec for 6 sec.',
      // Only the arrow itself, not the bleed's own ticks.
      does: () => [
        proc('hit', { all: ['main-attack', 'direct-damage'] }, [apply(dot(25, 6, 1, 'event', { name: 'Barbed Arrow' }))]),
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
