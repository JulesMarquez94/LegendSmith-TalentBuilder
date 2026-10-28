import { int, yd } from '../../game/format.ts'
import type { ArtifactDef, TreeDef } from '../../talents/types.ts'
import { apply, cooldown, more, plus, proc, restore, shield, stat, talent } from '../authoring.ts'

// The healer's artifact. Its main attack (left trigger / left click) is Radiant Bolt, which deals
// damage and restores mana, so attacking is how a healer refills between heals. The staff's own
// tree can say "mana"; the shared heals say "@resource" so another healing weapon can use them.

const tree: TreeDef = {
  id: 'lifewarden-staff',
  kind: 'artifact',
  role: 'healer',
  color: '#e8cf6a',
  columns: 4,
  pointsPerRow: 2,

  ability: {
    name: 'Radiant Bolt',
    castTime: 'Instant',
    range: '40 range',
    description: 'Strike the enemy nearest your crosshair with light, dealing damage and restoring mana.',
  },
  spec: {
    tags: ['main-attack'],
    range: 40,
    effects: [
      { type: 'damage', amount: 300 },
      { type: 'restore', restore: 16 },
    ],
    text: (a) =>
      `Strike the enemy nearest your crosshair within ${yd(a.range)} yd for ${int(a.effects[0].amount)} damage. ` +
      `Restores ${int(a.effects[1].restore)} mana.`,
  },

  talents: [
    // Row 1
    talent({
      id: 'deep-reserves',
      name: 'Deep Reserves',
      row: 0,
      col: 0,
      per: [150, 300],
      text: 'Raises your maximum mana by {}.',
      does: (v) => [stat('maxResource', v)],
    }),
    talent({
      id: 'attunement',
      name: 'Attunement',
      row: 0,
      col: 1,
      per: [4.5, 9],
      text: 'Radiant Bolt restores {} more mana.',
      does: (v) => [plus('restore', 'main-attack', v)],
    }),
    talent({
      id: 'meditation',
      name: 'Meditation',
      row: 0,
      col: 3,
      per: [1.5, 3],
      text: 'You regenerate {} more mana per sec.',
      does: (v) => [stat('resourceRegen', v)],
    }),

    // Row 2
    talent({
      id: 'clarity',
      name: 'Clarity',
      row: 1,
      col: 0,
      per: [10, 20],
      text: 'When a direct heal critically heals, {}% of its mana cost comes back (once per cast).',
      does: (v) => [proc('crit', 'direct-heal', [{ do: 'refund', pct: v }])],
    }),
    talent({
      id: 'reservoir',
      name: 'Reservoir',
      row: 1,
      col: 1,
      requires: 'attunement',
      per: [3, 6],
      text: '{}% of your overhealing is stored. Your next Radiant Bolt gives it back as mana, up to 80.',
      does: (v) => [stat('overhealToResource', v)],
    }),

    // Row 3
    talent({
      id: 'overflow',
      name: 'Overflow',
      row: 2,
      col: 0,
      per: [15, 30],
      text: '{}% of your overhealing becomes a shield on the target for 6 sec.',
      does: (v) => [
        proc('heal', 'healing', [apply(shield(0, 6, 'event', { name: 'Overflow' }), { pct: v, of: 'overheal' })], {
          when: { overheal: true },
        }),
      ],
    }),
    talent({
      id: 'lifewardens-grace',
      name: "Lifewarden's Grace",
      row: 2,
      col: 2,
      per: [3, 6, 9],
      text: 'All your healing is {}% stronger.',
      does: (v) => [more('amount', 'healing', v)],
    }),

    // Row 4
    talent({
      id: 'radiance',
      name: 'Radiance',
      row: 3,
      col: 1,
      requires: 'reservoir',
      text: "When Radiant Bolt critically strikes, it restores 30 mana and takes 1 sec off your heals' cooldowns.",
      does: () => [proc('crit', 'main-attack', [restore(30), cooldown('heal', 1)])],
    }),
    talent({
      id: 'staff-mastery',
      name: 'Staff Mastery',
      row: 3,
      col: 3,
      per: [5, 10],
      text: 'Radiant Bolt has +{}% critical chance.',
      does: (v) => [plus('critChance', 'main-attack', v)],
    }),
  ],
}

export const lifewardenStaff: ArtifactDef = {
  id: 'lifewarden-staff',
  name: 'Lifewarden Staff',
  color: '#e8cf6a',
  role: 'healer',
  roleKind: 'heal',
  reach: 'ranged',
  resource: 'Mana',
  traits: ['staff'],
  stats: { maxResource: 1000, resourceRegen: 8 },
  description:
    'Healer. Mana starts full, drains as you cast and regenerates slowly. Radiant Bolt, the main attack, restores it.',
  tree,
}
