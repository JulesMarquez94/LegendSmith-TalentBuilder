import { counted, pct, sec } from '../game/format.ts'
import type { TreeDef } from '../talents/types.ts'
import { buff, cooldown, more, plus, proc, restoreShare, selfBuff, talent } from './authoring.ts'

// A spell, so any damage weapon can cast it: for a while every ranged hit on a single enemy (Swift
// Arrow, Aimed Shot, Doom Bolt) also hits everything around its target. Its extra hits carry the
// 'splash' and 'aoe' tags, so its talents and every area-damage talent reach them.

export const volley: TreeDef = {
  id: 'volley',
  kind: 'damage',
  role: 'damage',
  madeFor: 'ashwood-longbow',
  color: '#7fd6c2',
  columns: 4,
  pointsPerRow: 2,
  ability: {
    name: 'Volley',
    castTime: 'Instant',
    range: 'Self',
    cooldown: '30 sec cooldown',
    description: 'For a while, your ranged hits on one enemy also hit every enemy around it.',
  },
  spec: {
    cost: 2,
    cooldown: 30,
    // Off the global cooldown: it changes your next hits rather than being one.
    gcd: 0,
    effects: [selfBuff({ id: 'volley', name: 'Volley', duration: 10, stats: { splash: 30 } })],
    text: (a) => {
      const e = a.effects[0]
      return (
        `For ${sec(e.duration)} sec, your ranged hits on a single enemy also hit every enemy within 8 yd of it for ` +
        `${pct(e.buff?.stats?.splash ?? 0)}% of the damage. Costs ${counted(a.cost, a.resource)}.`
      )
    },
  },
  talents: [
    // Row 1
    talent({
      id: 'heavy-volley',
      name: 'Heavy Volley',
      row: 0,
      col: 0,
      per: [5, 10],
      text: "Volley's extra hits deal {}% more of the damage.",
      does: (v) => [plus('strength', 'volley', v)],
    }),
    talent({
      id: 'long-volley',
      name: 'Long Volley',
      row: 0,
      col: 1,
      per: [2, 4],
      text: 'Volley lasts {} sec longer.',
      does: (v) => [plus('duration', 'volley', v)],
    }),
    talent({
      id: 'quick-volley',
      name: 'Quick Volley',
      row: 0,
      col: 3,
      per: [5, 10],
      text: "Volley's cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'volley', -v)],
    }),

    // Row 2
    talent({
      id: 'gathered-arrows',
      name: 'Gathered Arrows',
      row: 1,
      col: 0,
      per: [0.5, 1],
      text: 'Each extra hit from Volley gives you back {}% of your maximum @resource.',
      does: (v) => [proc('hit', 'splash', [restoreShare(v)])],
    }),
    talent({
      id: 'barrage',
      name: 'Barrage',
      row: 1,
      col: 2,
      per: [10, 20],
      text: 'For 10 sec after Volley, your area damage deals {}% more.',
      does: (v) => [
        proc('cast', 'volley', [buff({ id: 'barrage', name: 'Barrage', duration: 10, mods: [more('amount', 'aoe', v)] })]),
      ],
    }),
    talent({
      id: 'second-wave',
      name: 'Second Wave',
      row: 1,
      col: 3,
      text: 'Volley holds 2 charges.',
      does: () => [plus('charges', 'volley', 1)],
    }),

    // Row 3
    talent({
      id: 'ricochet-arrows',
      name: 'Ricochet Arrows',
      row: 2,
      col: 1,
      per: [0.1, 0.2],
      text: "Each extra hit from Volley takes {} sec off Volley's cooldown.",
      does: (v) => [proc('hit', 'splash', [cooldown('volley', v)])],
    }),
    talent({
      id: 'keen-spread',
      name: 'Keen Spread',
      row: 2,
      col: 3,
      per: [5, 10],
      text: 'Your area damage has +{}% critical chance.',
      does: (v) => [plus('critChance', 'aoe', v)],
    }),

    // Row 4
    talent({
      id: 'steady-volley',
      name: 'Steady Volley',
      row: 3,
      col: 1,
      requires: 'ricochet-arrows',
      text: 'For 10 sec after Volley, you have +10% haste.',
      does: () => [
        proc('cast', 'volley', [buff({ id: 'steady-volley', name: 'Steady Volley', duration: 10, stats: { haste: 10 } })]),
      ],
    }),
  ],
}
