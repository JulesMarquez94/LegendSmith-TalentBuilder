import { counted, int, yd } from '../../game/format.ts'
import type { ArtifactDef, TreeDef } from '../../talents/types.ts'
import { apply, buff, damage, more, plus, proc, shield, stat, talent } from '../authoring.ts'

// FIRST VERSION, improvised until the real design arrives: the block tank. Fervor starts empty and
// comes from Shield Bash (the main attack) and from the damage you take: 1 for each 1% of your health,
// counting at most 10% a second, so the harder the boss hits you, the more you can block. Fervor
// counts in tens (`unit: 10`) like the bow's focus, so the tank abilities' small costs mean the same
// here as with any other tank weapon. This is the artifact's own tree, so it may talk in fervor and
// give it back as a flat amount.

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
    description: 'Bash the enemy nearest your crosshair with your shield, dealing damage and gaining fervor. Hold the key to keep bashing.',
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
      per: [0.2, 0.4, 0.6],
      text: 'Taking damage gives {} more fervor for each 1% of your health it takes.',
      does: (v) => [stat('resourceFromDamage', v)],
    }),
    talent({
      id: 'heavy-bash',
      name: 'Heavy Bash',
      row: 0,
      col: 3,
      per: [2, 4],
      text: 'Shield Bash gives {} more fervor.',
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
      id: 'deep-fervor',
      name: 'Deep Fervor',
      row: 1,
      col: 3,
      per: [20, 40],
      text: 'You can hold {} more fervor.',
      does: (v) => [stat('maxResource', v)],
    }),

    // Row 3
    talent({
      id: 'retaliation',
      name: 'Retaliation',
      row: 2,
      col: 0,
      per: [4, 8],
      text: 'Spending fervor makes you take {}% less damage for 5 sec.',
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
  resource: 'Fervor',
  resourceStart: 0,
  unit: 10,
  traits: ['blade', 'shield'],
  stats: { maxResource: 100, resourceRegen: 0, resourceFromDamage: 1, damageResourceCap: 10 },
  description:
    'Tank (first version). Fervor starts empty: every bash gives some, and so does the damage you take, 1 for ' +
    'each 1% of your health, counting at most 10% a second. Your abilities spend it. Raise your shield to soak hits.',
  tree,
}
