import { int, sec, yd } from '../../game/format.ts'
import type { ArtifactDef, TreeDef } from '../../talents/types.ts'
import { plus, proc, restore, stat, talent } from '../authoring.ts'

// The healer's artifact. Its main attack (left trigger / left click) is Radiant Bolt, a 1.5 sec cast
// that deals damage and restores mana, so attacking is how a healer refills between heals. Its tree is
// all about mana; Lightspeed trades the cast for three instant charges. The staff's own
// tree can say "mana"; the shared heals say "@resource" so another healing weapon can use them.

/** Radiant Bolt's cast before talents: Lightspeed takes all of it away. */
const CAST = 1.5

const tree: TreeDef = {
  id: 'lifewarden-staff',
  reviewed: true,
  kind: 'artifact',
  role: 'healer',
  color: '#e8cf6a',
  columns: 4,
  pointsPerRow: 2,

  ability: {
    name: 'Radiant Bolt',
    castTime: '1.5 sec cast',
    range: '40 range',
    description: 'Strike the enemy nearest your crosshair with light, dealing damage and restoring 20 mana.',
  },
  spec: {
    tags: ['main-attack'],
    castTime: CAST,
    range: 40,
    effects: [
      { type: 'damage', amount: 450 },
      { type: 'restore', restore: 20 },
    ],
    text: (a) => {
      const charges = a.cooldown > 0 ? ` Holds ${a.charges} charges, each back after ${sec(a.cooldown)} sec.` : ''
      return (
        `Strike the enemy nearest your crosshair within ${yd(a.range)} yd for ${int(a.effects[0].amount)} damage. ` +
        `Restores ${int(a.effects[1].restore)} mana.${charges}`
      )
    },
  },

  talents: [
    // Row 1
    talent({
      id: 'attunement',
      name: 'Attunement',
      row: 0,
      col: 0,
      per: [4, 8],
      text: 'Radiant Bolt restores {} more mana.',
      does: (v) => [plus('restore', 'main-attack', v)],
    }),
    talent({
      id: 'meditation',
      name: 'Meditation',
      row: 0,
      col: 1,
      per: [2, 4],
      text: 'You regenerate {} more mana per sec.',
      does: (v) => [stat('resourceRegen', v)],
    }),
    talent({
      id: 'deep-reserves',
      name: 'Deep Reserves',
      row: 0,
      col: 3,
      per: [100, 200, 300],
      text: 'Raises your maximum mana by {}.',
      does: (v) => [stat('maxResource', v)],
    }),

    // Row 2
    talent({
      id: 'clear-sight',
      name: 'Clear Sight',
      row: 1,
      col: 0,
      per: [3, 6],
      text: 'You have +{}% critical chance.',
      does: (v) => [stat('crit', v)],
    }),
    talent({
      id: 'reservoir',
      name: 'Reservoir',
      row: 1,
      col: 1,
      requires: 'meditation',
      per: [5, 10],
      text: '{}% of the mana you spend is stored. Your next Radiant Bolt hit gives it all back, up to 30% of your maximum mana.',
      does: (v) => [stat('spentToResource', v)],
    }),
    talent({
      id: 'quickened-light',
      name: 'Quickened Light',
      row: 1,
      col: 3,
      per: [3, 6],
      text: 'You have +{}% haste.',
      does: (v) => [stat('haste', v)],
    }),

    // Row 3
    talent({
      id: 'radiance',
      name: 'Radiance',
      row: 2,
      col: 0,
      requires: 'clear-sight',
      per: [10, 20],
      text: 'When Radiant Bolt critically strikes, it restores {} more mana.',
      does: (v) => [proc('crit', 'main-attack', [restore(v)])],
    }),
    talent({
      id: 'lightspeed',
      name: 'Lightspeed',
      row: 2,
      col: 3,
      requires: 'quickened-light',
      text: 'Radiant Bolt becomes instant. It holds 3 charges, each back after 3 sec.',
      does: () => [plus('castTime', 'main-attack', -CAST), plus('charges', 'main-attack', 2), plus('cooldown', 'main-attack', 3)],
    }),

    // Row 4
    talent({
      id: 'afterglow',
      name: 'Afterglow',
      row: 3,
      col: 3,
      requires: 'lightspeed',
      per: [10, 20],
      text: 'Your instant Radiant Bolt restores {} more mana.',
      does: (v) => [plus('restore', 'main-attack', v)],
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
