import { int, sec, yd } from '../../game/format.ts'
import type { ArtifactDef, TreeDef } from '../../talents/types.ts'
import { apply, damage, grant, heal, more, plus, proc, shield, stat, talent } from '../authoring.ts'

// FIRST VERSION, improvised until the real design arrives: the shield healer. Where the staff heals
// after the damage, the Tome of Dawn wards allies before it lands: its main attack, Dawn Bolt,
// strikes an enemy and puts a light barrier (an absorb shield) on the most injured ally, and quick
// direct heals top them up. Light is its resource: a smaller pool than the staff's mana that refills
// fast on its own, so you attack to ward, not to refill. The shared heals cost "@resource", so they
// cost light here. This is the book's own tree, so it may talk in light.

const tree: TreeDef = {
  id: 'tome-of-dawn',
  kind: 'artifact',
  role: 'healer',
  color: '#9fd4f0',
  columns: 4,
  pointsPerRow: 2,

  ability: {
    name: 'Dawn Bolt',
    castTime: 'Instant',
    range: '40 range',
    description: 'Strike the enemy nearest your crosshair with dawnlight and ward the lowest-health ally with a barrier.',
  },
  spec: {
    tags: ['main-attack'],
    range: 40,
    effects: [damage(220), shield(350, 8, 'lowest', { name: 'Dawn Ward' })],
    text: (a) => {
      const [bolt, ward] = a.effects
      const who = ward.targets > 1 ? `the ${ward.targets} lowest-health allies` : 'the lowest-health ally'
      return (
        `Strike the enemy nearest your crosshair within ${yd(a.range)} yd for ${int(bolt.amount)} damage, and ward ` +
        `${who} in range: a barrier that soaks ${int(ward.amount)} damage for ${sec(ward.duration)} sec. ` +
        'Another bolt on a warded ally adds to its barrier.'
      )
    },
  },

  talents: [
    // Row 1
    talent({
      id: 'bright-wards',
      name: 'Bright Wards',
      row: 0,
      col: 0,
      per: [10, 20],
      text: 'Your shields absorb {}% more.',
      does: (v) => [more('amount', 'shield', v)],
    }),
    talent({
      id: 'daybreak',
      name: 'Daybreak',
      row: 0,
      col: 1,
      per: [100, 200],
      text: 'Raises your maximum light by {}.',
      does: (v) => [stat('maxResource', v)],
    }),
    talent({
      id: 'morning-light',
      name: 'Morning Light',
      row: 0,
      col: 3,
      per: [2, 4],
      text: 'You regenerate {} more light per sec.',
      does: (v) => [stat('resourceRegen', v)],
    }),

    // Row 2
    talent({
      id: 'lasting-dawn',
      name: 'Lasting Dawn',
      row: 1,
      col: 0,
      requires: 'bright-wards',
      per: [2, 4],
      text: 'Your shields last {} sec longer.',
      does: (v) => [plus('duration', 'shield', v)],
    }),
    talent({
      id: 'sunward',
      name: 'Sunward',
      row: 1,
      col: 2,
      per: [1, 2],
      text: 'Dawn Bolt wards {} more allies.',
      does: (v) => [plus('targets', { all: ['main-attack', 'shield'] }, v)],
    }),
    talent({
      id: 'afterglow',
      name: 'Afterglow',
      row: 1,
      col: 3,
      per: [25, 50],
      text: 'When a direct heal critically heals, it also shields the ally for {}% of the heal for 8 sec.',
      does: (v) => [
        proc('crit', 'direct-heal', [apply(shield(0, 8, 'event', { name: 'Afterglow' }), { pct: v, of: 'amount' })]),
      ],
    }),

    // Row 3
    talent({
      id: 'dawnfire',
      name: 'Dawnfire',
      row: 2,
      col: 1,
      per: [15, 30],
      text: "Dawn Bolt's barrier absorbs {}% more.",
      does: (v) => [more('amount', { all: ['main-attack', 'shield'] }, v)],
    }),
    talent({
      id: 'quickening',
      name: 'Quickening',
      row: 2,
      col: 3,
      per: [10, 20],
      text: 'Your direct heals cast {}% faster.',
      does: (v) => [more('castTime', 'direct-heal', -v)],
    }),

    // Row 4
    talent({
      id: 'first-light',
      name: 'First Light',
      row: 3,
      col: 1,
      requires: 'dawnfire',
      text: 'Dawn Bolt also heals the lowest-health ally in range for 150.',
      does: () => [grant('tome-of-dawn', heal(150, 'lowest', { name: 'First Light' }))],
    }),
  ],
}

export const tomeOfDawn: ArtifactDef = {
  id: 'tome-of-dawn',
  name: 'Tome of Dawn',
  color: '#9fd4f0',
  role: 'healer',
  roleKind: 'heal',
  reach: 'ranged',
  firstVersion: true,
  resource: 'Light',
  traits: ['book'],
  stats: { maxResource: 600, resourceRegen: 15 },
  description:
    'Healer (first version). Wards allies before the hit lands: Dawn Bolt, the main attack, shields the most injured ' +
    'ally. Light starts full and refills quickly on its own.',
  tree,
}
