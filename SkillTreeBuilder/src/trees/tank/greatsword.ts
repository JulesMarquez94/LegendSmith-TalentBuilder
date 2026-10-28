import { counted, int, yd } from '../../game/format.ts'
import type { ArtifactDef, TreeDef } from '../../talents/types.ts'
import { apply, buff, damage, more, plus, proc, restore, stat, talent } from '../authoring.ts'

// FIRST VERSION, improvised until the real design arrives: the parry tank. No shield: it turns
// swings aside with parries. Wide Swing (the main attack) hits every enemy close to its target, so
// it holds packs. Momentum starts empty and comes from swinging and from every parry, and counts in
// tens (`unit: 10`) like rage, so the tank abilities cost the same share of it. This is the
// artifact's own tree, so it may talk in momentum and give it back as a flat amount.

/** Wide Swing's hits, but not Riposte's: only the swing hits an area. */
const SWING = { all: ['main-attack', 'aoe'] } as const

const tree: TreeDef = {
  id: 'greatsword',
  kind: 'artifact',
  role: 'tank',
  color: '#d39a5e',
  columns: 4,
  pointsPerRow: 2,

  ability: {
    name: 'Wide Swing',
    castTime: 'Instant',
    range: '5 range',
    description:
      'Swing at the enemy nearest your crosshair, hitting it and every enemy close to it and gaining momentum. ' +
      'Hold the key to keep swinging.',
  },
  spec: {
    // Holding the main-attack key repeats it every global cooldown: the tank's auto attack.
    tags: ['main-attack', 'melee'],
    range: 5,
    gcd: 1.5,
    effects: [damage(220, 'target', { radius: 5 }), { type: 'restore', restore: 1 }],
    text: (a) => {
      const [swing, gain] = a.effects
      return (
        `Swing at the enemy nearest your crosshair within ${yd(a.range)} yd, hitting it and every enemy within ` +
        `${yd(swing.radius)} yd of it for ${int(swing.amount)} damage. Gives ${counted(gain.restore, a.resource)}.`
      )
    },
  },

  talents: [
    // Row 1
    talent({
      id: 'riposte',
      name: 'Riposte',
      row: 0,
      col: 0,
      per: [250, 500],
      text: 'When you parry, you strike back at the attacker for {} damage.',
      does: (v) => [proc('parry', 'parry', [apply(damage(v, 'event', { name: 'Riposte' }))])],
    }),
    talent({
      id: 'blade-dance',
      name: 'Blade Dance',
      row: 0,
      col: 1,
      per: [3, 6],
      text: 'You have +{}% parry.',
      does: (v) => [stat('parry', v)],
    }),
    talent({
      id: 'building-momentum',
      name: 'Building Momentum',
      row: 0,
      col: 3,
      per: [2, 4],
      text: 'Wide Swing gives {} more momentum.',
      does: (v) => [plus('restore', { all: ['main-attack', 'resource'] }, v)],
    }),

    // Row 2
    talent({
      id: 'reaping-arc',
      name: 'Reaping Arc',
      row: 1,
      col: 0,
      per: [1, 2],
      text: 'Wide Swing hits every enemy within {} more yd of its target.',
      does: (v) => [plus('radius', SWING, v)],
    }),
    talent({
      id: 'turn-aside',
      name: 'Turn Aside',
      row: 1,
      col: 1,
      requires: 'blade-dance',
      per: [5, 10],
      text: 'Each parry gives {} more momentum.',
      does: (v) => [stat('resourceOnParry', v)],
    }),
    talent({
      id: 'gathering-storm',
      name: 'Gathering Storm',
      row: 1,
      col: 3,
      requires: 'building-momentum',
      per: [2, 4],
      text: 'Each enemy Wide Swing hits gives {} more momentum.',
      does: (v) => [proc('hit', SWING, [restore(v)])],
    }),

    // Row 3
    talent({
      id: 'en-garde',
      name: 'En Garde',
      row: 2,
      col: 0,
      per: [10, 20],
      text: 'Spending momentum gives you +{}% parry for 6 sec.',
      does: (v) => [proc('cast', 'spell', [buff({ id: 'en-garde', name: 'En Garde', duration: 6, stats: { parry: v } })])],
    }),
    talent({
      id: 'heavy-blade',
      name: 'Heavy Blade',
      row: 2,
      col: 2,
      per: [8, 16],
      text: 'Your area damage deals {}% more.',
      does: (v) => [more('amount', 'aoe', v)],
    }),

    // Row 4
    talent({
      id: 'counterstroke',
      name: 'Counterstroke',
      row: 3,
      col: 1,
      requires: 'turn-aside',
      text: 'When you parry, your next Wide Swing deals 50% more damage.',
      does: () => [
        proc('parry', 'parry', [
          buff({
            id: 'counterstroke',
            name: 'Counterstroke',
            duration: 10,
            consumeOn: 'main-attack',
            mods: [more('amount', SWING, 50)],
          }),
        ]),
      ],
    }),
  ],
}

export const greatsword: ArtifactDef = {
  id: 'greatsword',
  name: 'Greatsword',
  color: '#d39a5e',
  role: 'tank',
  roleKind: 'tank',
  reach: 'melee',
  firstVersion: true,
  resource: 'Momentum',
  resourceStart: 0,
  unit: 10,
  traits: ['blade', 'large'],
  stats: { maxResource: 100, resourceRegen: 0, parry: 15, resourceOnParry: 10 },
  description:
    'Tank (first version). No shield: you parry 15% of melee swings. Wide swings hit every enemy near your target. ' +
    'Swings and parries build momentum, and your abilities spend it.',
  tree,
}
