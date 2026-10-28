import { counted, int, yd } from '../../game/format.ts'
import type { ArtifactDef, TreeDef } from '../../talents/types.ts'
import { apply, buff, damage, more, plus, proc, shield, stat, talent } from '../authoring.ts'

// FIRST VERSION, improvised until the real design arrives: the block tank. Rage starts empty and
// comes from Shield Bash (the main attack) and from every hit you take, so the more the boss hits
// you, the more you can block. Rage counts in tens (`unit: 10`) like the bow's focus, so the tank
// abilities' small costs mean the same here as with any other tank weapon. This is the artifact's
// own tree, so it may talk in rage and give it back as a flat amount.

const tree: TreeDef = {
  id: 'sword-and-shield',
  kind: 'artifact',
  role: 'tank',
  color: '#8fb3e0',
  columns: 4,
  pointsPerRow: 2,

  ability: {
    name: 'Shield Bash',
    castTime: 'Instant',
    range: '5 range',
    description: 'Bash the enemy nearest your crosshair with your shield, dealing damage and gaining rage. Hold the key to keep bashing.',
  },
  spec: {
    // Holding the main-attack key repeats it every global cooldown: the tank's auto attack.
    tags: ['main-attack', 'melee'],
    range: 5,
    gcd: 1.5,
    effects: [damage(300), { type: 'restore', restore: 1 }],
    text: (a) =>
      `Bash the enemy nearest your crosshair within ${yd(a.range)} yd for ${int(a.effects[0].amount)} damage. ` +
      `Gives ${counted(a.effects[1].restore, a.resource)}.`,
  },

  talents: [
    // Row 1
    talent({
      id: 'toughness',
      name: 'Toughness',
      row: 0,
      col: 0,
      per: [2, 4],
      text: 'You take {}% less damage.',
      does: (v) => [stat('damageReduction', v)],
    }),
    talent({
      id: 'seething',
      name: 'Seething',
      row: 0,
      col: 1,
      per: [2, 4, 6],
      text: 'Every hit you take gives {} more rage.',
      does: (v) => [stat('resourceWhenHit', v)],
    }),
    talent({
      id: 'heavy-bash',
      name: 'Heavy Bash',
      row: 0,
      col: 3,
      per: [2, 4],
      text: 'Shield Bash gives {} more rage.',
      does: (v) => [plus('restore', { all: ['main-attack', 'resource'] }, v)],
    }),

    // Row 2
    talent({
      id: 'tower-shield',
      name: 'Tower Shield',
      row: 1,
      col: 0,
      requires: 'toughness',
      per: [10, 20],
      text: 'Your shields absorb {}% more.',
      does: (v) => [more('amount', 'shield', v)],
    }),
    talent({
      id: 'rampart',
      name: 'Rampart',
      row: 1,
      col: 1,
      per: [300, 600],
      text: 'When Shield Bash critically strikes, it shields you for {} for 6 sec.',
      does: (v) => [
        proc('crit', { all: ['main-attack', 'direct-damage'] }, [apply(shield(v, 6, 'self', { name: 'Rampart' }))]),
      ],
    }),
    talent({
      id: 'deep-rage',
      name: 'Deep Rage',
      row: 1,
      col: 3,
      per: [20, 40],
      text: 'You can hold {} more rage.',
      does: (v) => [stat('maxResource', v)],
    }),

    // Row 3
    talent({
      id: 'retaliation',
      name: 'Retaliation',
      row: 2,
      col: 0,
      per: [4, 8],
      text: 'Spending rage makes you take {}% less damage for 5 sec.',
      does: (v) => [
        proc('cast', 'spell', [buff({ id: 'retaliation', name: 'Retaliation', duration: 5, stats: { damageReduction: v } })]),
      ],
    }),
    talent({
      id: 'hold-the-line',
      name: 'Hold the Line',
      row: 2,
      col: 2,
      per: [2, 4],
      text: 'Your shields last {} sec longer.',
      does: (v) => [plus('duration', 'shield', v)],
    }),

    // Row 4
    talent({
      id: 'unbreakable',
      name: 'Unbreakable',
      row: 3,
      col: 1,
      requires: 'rampart',
      text: 'Shield Bash also shields you for 25% of the damage it deals, for 6 sec.',
      does: () => [
        proc('hit', { all: ['main-attack', 'direct-damage'] }, [
          apply(shield(0, 6, 'self', { name: 'Unbreakable' }), { pct: 25, of: 'amount' }),
        ]),
      ],
    }),
  ],
}

export const swordAndShield: ArtifactDef = {
  id: 'sword-and-shield',
  name: 'Sword & Shield',
  color: '#8fb3e0',
  role: 'tank',
  roleKind: 'tank',
  reach: 'melee',
  firstVersion: true,
  resource: 'Rage',
  resourceStart: 0,
  unit: 10,
  traits: ['blade', 'shield'],
  stats: { maxResource: 100, resourceRegen: 0, resourceWhenHit: 5 },
  description:
    'Tank (first version). Rage starts empty: every bash and every hit you take gives some, and your abilities ' +
    'spend it. Raise your shield to soak hits.',
  tree,
}
