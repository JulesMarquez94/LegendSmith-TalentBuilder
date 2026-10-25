import { counted, int, sec, yd } from '../game/format.ts'
import type { TreeDef } from '../talents/types.ts'
import { apply, buff, curse, damage, more, plus, proc, restoreShare, talent } from './authoring.ts'

// A spell, so any damage weapon can cast it; it pays off with minions (the book's imps, Raise Ghoul's
// ghouls). Every hit from one of your minions on the cursed enemy takes a stack and deals more damage.

/** The curse's own stacks being taken, not its talents' bursts. */
const STACK = { all: ['carrion-curse', 'debuff'] }

export const carrionCurse: TreeDef = {
  id: 'carrion-curse',
  kind: 'damage',
  role: 'damage',
  madeFor: 'tome-of-summoning',
  color: '#a35ad6',
  columns: 4,
  pointsPerRow: 2,
  ability: {
    name: 'Carrion Curse',
    castTime: 'Instant',
    range: '40 range',
    description: 'Curse an enemy with stacks. Each hit from your minions takes a stack and deals extra damage.',
  },
  spec: {
    cost: 1,
    range: 40,
    effects: [curse(90, 8, 20, { name: 'Carrion Curse' })],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Curses the enemy nearest your crosshair within ${yd(a.range)} yd with ${e.stacks} stacks for ` +
        `${sec(e.duration)} sec. Each hit from your minions takes a stack and deals ${int(e.amount)} more damage. ` +
        `Costs ${counted(a.cost, a.resource)}.`
      )
    },
  },
  talents: [
    // Row 1
    talent({
      id: 'deep-curse',
      name: 'Deep Curse',
      row: 0,
      col: 0,
      per: [2, 4],
      text: 'Carrion Curse puts {} more stacks on.',
      does: (v) => [plus('stacks', 'carrion-curse', v)],
    }),
    talent({
      id: 'ravenous-hex',
      name: 'Ravenous Hex',
      row: 0,
      col: 1,
      per: [6, 12],
      text: 'Your minions deal {}% more damage.',
      does: (v) => [more('amount', 'minion', v)],
    }),
    talent({
      id: 'lingering-hex',
      name: 'Lingering Hex',
      row: 0,
      col: 3,
      per: [5, 10],
      text: 'Carrion Curse lasts {} sec longer.',
      does: (v) => [plus('duration', 'carrion-curse', v)],
    }),

    // Row 2
    talent({
      id: 'feast',
      name: 'Feast',
      row: 1,
      col: 0,
      requires: 'deep-curse',
      per: [15, 30],
      text: 'Each stack your minions take deals {}% more.',
      does: (v) => [more('amount', STACK, v)],
    }),
    talent({
      id: 'final-feast',
      name: 'Final Feast',
      row: 1,
      col: 2,
      per: [200, 400],
      text: 'When Carrion Curse runs out of stacks or time, it bursts for {} damage on every enemy within 6 yd of its target.',
      does: (v) => [proc('expire', STACK, [apply(damage(v, 'event', { radius: 6, name: 'Final Feast' }))])],
    }),
    talent({
      id: 'hungry-hex',
      name: 'Hungry Hex',
      row: 1,
      col: 3,
      per: [0.5, 1],
      text: 'Each stack your minions take gives you back {}% of your maximum @resource.',
      does: (v) => [proc('hit', STACK, [restoreShare(v)])],
    }),

    // Row 3
    talent({
      id: 'withering-hex',
      name: 'Withering Hex',
      row: 2,
      col: 1,
      per: [0.5, 1],
      text: 'Each stack your minions take adds {} sec to your damage-over-time effects on that enemy.',
      does: (v) => [proc('hit', STACK, [{ do: 'extend', match: 'dot', seconds: v, scope: 'event' }])],
    }),
    talent({
      id: 'bloodied',
      name: 'Bloodied',
      row: 2,
      col: 3,
      per: [5, 10],
      text: 'Your minions deal {}% more damage to enemies with Carrion Curse.',
      does: (v) => [more('amount', 'minion', v, { targetHas: 'carrion-curse' })],
    }),

    // Row 4
    talent({
      id: 'frenzied-feeding',
      name: 'Frenzied Feeding',
      row: 3,
      col: 1,
      requires: 'withering-hex',
      per: [3, 6],
      text: 'Each stack your minions take makes them attack {}% faster for 4 sec, stacking up to 5 times.',
      does: (v) => [
        proc('hit', STACK, [
          buff({
            id: 'frenzied-feeding',
            name: 'Frenzied Feeding',
            duration: 4,
            maxStacks: 5,
            mods: [more('tickRate', 'minion', v)],
          }),
        ]),
      ],
    }),
  ],
}
