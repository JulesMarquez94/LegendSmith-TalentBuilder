import { counted, pct, sec } from '../game/format.ts'
import type { TreeDef } from '../talents/types.ts'
import { buff, more, plus, proc, selfBuff, talent } from './authoring.ts'

// A spell, so any damage weapon can cast it. It has no cooldown: you keep it up by paying for it
// again before it runs out, and its talents make spending feed it.

export const frenzy: TreeDef = {
  id: 'frenzy',
  kind: 'damage',
  role: 'damage',
  color: '#ff5d5d',
  columns: 4,
  pointsPerRow: 2,
  ability: {
    name: 'Frenzy',
    castTime: 'Instant',
    range: 'Self',
    description: 'Work yourself into a frenzy for more haste. No cooldown: keep it up by spending on it again.',
  },
  spec: {
    cost: 2,
    // On the global cooldown: with no cooldown of its own, a held key would otherwise cast it every frame.
    effects: [selfBuff({ id: 'frenzy', name: 'Frenzy', duration: 8, stats: { haste: 15 } })],
    text: (a) => {
      const e = a.effects[0]
      return (
        `You have +${pct(e.buff?.stats?.haste ?? 0)}% haste for ${sec(e.duration)} sec. No cooldown: cast it again ` +
        `before it runs out to keep it up. Costs ${counted(a.cost, a.resource)}.`
      )
    },
  },
  talents: [
    // Row 1
    talent({
      id: 'bloodrush',
      name: 'Bloodrush',
      row: 0,
      col: 0,
      per: [3, 6],
      text: 'Frenzy gives +{}% more haste.',
      does: (v) => [plus('strength', 'frenzy', v)],
    }),
    talent({
      id: 'lasting-frenzy',
      name: 'Lasting Frenzy',
      row: 0,
      col: 1,
      per: [2, 4, 6],
      text: 'Frenzy lasts {} sec longer.',
      does: (v) => [plus('duration', 'frenzy', v)],
    }),
    talent({
      id: 'cheap-thrills',
      name: 'Cheap Thrills',
      row: 0,
      col: 3,
      per: [25, 50],
      text: 'Frenzy costs {}% less.',
      does: (v) => [more('cost', 'frenzy', -v)],
    }),

    // Row 2
    talent({
      id: 'feeding-frenzy',
      name: 'Feeding Frenzy',
      row: 1,
      col: 0,
      requires: 'bloodrush',
      per: [0.5, 1],
      text: 'Every ability you spend @resource on makes Frenzy last {} sec longer.',
      does: (v) => [proc('cast', 'spell', [{ do: 'extendBuff', buff: 'frenzy', seconds: v }])],
    }),
    talent({
      id: 'savage-pace',
      name: 'Savage Pace',
      row: 1,
      col: 2,
      per: [4, 8],
      text: 'For 8 sec after Frenzy, you have +{}% critical chance.',
      does: (v) => [
        proc('cast', 'frenzy', [buff({ id: 'savage-pace', name: 'Savage Pace', duration: 8, stats: { crit: v } })]),
      ],
    }),
    talent({
      id: 'second-wind',
      name: 'Second Wind',
      row: 1,
      col: 3,
      per: [0.5, 1],
      text: 'For 8 sec after Frenzy, you regenerate {}% of your maximum @resource per sec.',
      does: (v) => [
        proc('cast', 'frenzy', [
          buff({ id: 'frenzy-second-wind', name: 'Second Wind', duration: 8, stats: { resourceRegenPct: v } }),
        ]),
      ],
    }),

    // Row 3
    talent({
      id: 'building-frenzy',
      name: 'Building Frenzy',
      row: 2,
      col: 1,
      per: [1, 2],
      text: 'Each Frenzy also gives +{}% haste for 8 sec, stacking up to 5 times.',
      does: (v) => [
        proc('cast', 'frenzy', [
          buff({ id: 'building-frenzy', name: 'Building Frenzy', duration: 8, maxStacks: 5, stats: { haste: v } }),
        ]),
      ],
    }),
    talent({
      id: 'racing-blood',
      name: 'Racing Blood',
      row: 2,
      col: 3,
      per: [10, 20],
      text: 'For 8 sec after Frenzy, your damage-over-time effects tick {}% faster.',
      does: (v) => [
        proc('cast', 'frenzy', [
          buff({ id: 'racing-blood', name: 'Racing Blood', duration: 8, mods: [more('tickRate', 'dot', v)] }),
        ]),
      ],
    }),

    // Row 4
    talent({
      id: 'shared-frenzy',
      name: 'Shared Frenzy',
      row: 3,
      col: 1,
      requires: 'building-frenzy',
      text: 'For 8 sec after Frenzy, your group has +7.5% haste.',
      does: () => [
        proc('cast', 'frenzy', [
          buff({ id: 'shared-frenzy', name: 'Shared Frenzy', duration: 8, group: true, stats: { haste: 7.5 } }),
        ]),
      ],
    }),
  ],
}
