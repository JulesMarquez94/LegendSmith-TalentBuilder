import { int, yd } from '../game/format.ts'
import type { ArtifactDef, TreeDef } from '../talents/types.ts'
import { apply, buff, damage, dot, more, plus, proc, restore, stat, talent } from './authoring.ts'

// FIRST VERSION, improvised until the real design arrives: melee damage with reach. The main attack
// alternates a thrust that hits one enemy from 8 yd and a sweep that hits everything near it (the
// same `cycle` as Plague). Vigor starts full and refills on its own, and counts in tens (`unit: 10`)
// like focus, so the shared damage spells cost the same share of it. A large weapon, so it can't
// make blade or dagger strikes; spells it casts like any damage weapon. This is the spear's own
// tree, so it may talk in vigor.

const tree: TreeDef = {
  id: 'spear',
  kind: 'artifact',
  role: 'damage',
  color: '#b9a3e8',
  columns: 4,
  pointsPerRow: 2,

  ability: {
    name: 'Thrust and Sweep',
    castTime: 'Instant',
    range: '8 range',
    description:
      'Alternate a long thrust at the enemy nearest your crosshair and a sweep that hits every enemy around it. ' +
      'Hold the key to keep attacking.',
  },
  spec: {
    // Holding the main-attack key repeats it every global cooldown: the spear's auto attack.
    tags: ['main-attack', 'melee'],
    range: 8,
    gcd: 1,
    cycle: true,
    effects: [
      damage(320, 'target', { name: 'Thrust', tags: ['thrust'] }),
      damage(160, 'target', { name: 'Sweep', radius: 6, tags: ['sweep'] }),
    ],
    text: (a) => {
      const [thrust, sweep] = a.effects
      return (
        `Alternates a thrust and a sweep at the enemy nearest your crosshair within ${yd(a.range)} yd. The thrust ` +
        `hits it for ${int(thrust.amount)} damage; the sweep hits it and every enemy within ${yd(sweep.radius)} yd ` +
        `of it for ${int(sweep.amount)}.`
      )
    },
  },

  talents: [
    // Row 1
    talent({
      id: 'long-haft',
      name: 'Long Haft',
      row: 0,
      col: 0,
      per: [1, 2],
      text: 'Thrust and Sweep reaches {} yd farther.',
      does: (v) => [plus('range', 'main-attack', v)],
    }),
    talent({
      id: 'deep-breath',
      name: 'Deep Breath',
      row: 0,
      col: 1,
      per: [1, 2],
      text: 'You regenerate {} more vigor per sec.',
      does: (v) => [stat('resourceRegen', v)],
    }),
    talent({
      id: 'keen-point',
      name: 'Keen Point',
      row: 0,
      col: 3,
      per: [5, 10],
      text: 'Thrust has +{}% critical chance.',
      does: (v) => [plus('critChance', 'thrust', v)],
    }),

    // Row 2
    talent({
      id: 'wide-arc',
      name: 'Wide Arc',
      row: 1,
      col: 0,
      per: [1, 2],
      text: 'Sweep hits every enemy within {} more yd of its target.',
      does: (v) => [plus('radius', 'sweep', v)],
    }),
    talent({
      id: 'impale',
      name: 'Impale',
      row: 1,
      col: 2,
      per: [20, 40],
      text: 'Thrust leaves its target bleeding for {} damage every sec for 6 sec.',
      does: (v) => [proc('hit', 'thrust', [apply(dot(v, 6, 1, 'event', { name: 'Impaled' }))])],
    }),
    talent({
      id: 'flowing-strikes',
      name: 'Flowing Strikes',
      row: 1,
      col: 3,
      per: [2, 4],
      text: 'Each enemy Sweep hits gives you {} vigor.',
      does: (v) => [proc('hit', 'sweep', [restore(v)])],
    }),

    // Row 3
    talent({
      id: 'rhythm',
      name: 'Rhythm',
      row: 2,
      col: 0,
      per: [15, 30],
      text: 'After a sweep, your next thrust deals {}% more damage.',
      does: (v) => [
        proc('hit', 'sweep', [
          buff({ id: 'rhythm', name: 'Rhythm', duration: 5, consumeOn: 'main-attack', mods: [more('amount', 'thrust', v)] }),
        ]),
      ],
    }),
    talent({
      id: 'skewer',
      name: 'Skewer',
      row: 2,
      col: 2,
      requires: 'impale',
      per: [15, 30],
      text: 'Thrust deals {}% more damage to enemies below 35% health.',
      does: (v) => [more('amount', 'thrust', v, { targetBelow: 35 })],
    }),

    // Row 4
    talent({
      id: 'dragoon',
      name: 'Dragoon',
      row: 3,
      col: 1,
      per: [8, 16],
      text: 'Your direct damage deals {}% more.',
      does: (v) => [more('amount', 'direct-damage', v)],
    }),
  ],
}

export const spear: ArtifactDef = {
  id: 'spear',
  name: 'Spear',
  color: '#b9a3e8',
  role: 'damage',
  roleKind: 'damage',
  reach: 'melee',
  firstVersion: true,
  resource: 'Vigor',
  unit: 10,
  traits: ['large'],
  stats: { maxResource: 100, resourceRegen: 10 },
  description:
    'Melee damage with reach (first version). Thrusts hit from 8 yd and sweeps hit every enemy around the target. ' +
    'Vigor starts full and refills on its own; your abilities spend it.',
  tree,
}
