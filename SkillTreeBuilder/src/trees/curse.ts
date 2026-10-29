import { counted, int, sec, yd } from '../game/format.ts'
import type { TreeDef } from '../talents/types.ts'
import { buff, curse, more, plus, proc, talent } from './authoring.ts'

// A spell, so any damage weapon can cast it; it pays off with minions (the book's imps, Raise Ghoul's
// ghouls). Every hit from one of your minions on the cursed enemy takes a stack and deals the curse's
// damage. Minion hits are minion damage, not direct damage: Gorging Hex feeds on your own spells.

/** The curse's own stacks being taken, not its talents' bursts or its splash. */
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
    description: 'Curse an enemy with 20 stacks. Each hit from your minions takes a stack and deals damage to it.',
  },
  spec: {
    cost: 4,
    range: 40,
    effects: [curse(90, 20, 30, { name: 'Carrion Curse' })],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Curses the enemy nearest your crosshair within ${yd(a.range)} yd with ${e.stacks} stacks for ` +
        `${sec(e.duration)} sec. Each hit from your minions takes a stack and deals ${int(e.amount)} damage to it. ` +
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
      per: [3, 6],
      text: 'Carrion Curse puts {} more stacks on.',
      does: (v) => [plus('stacks', 'carrion-curse', v)],
    }),
    talent({
      id: 'feast',
      name: 'Feast',
      row: 0,
      col: 1,
      per: [10, 20, 30],
      text: 'Each stack your minions take deals {}% more.',
      does: (v) => [more('amount', STACK, v)],
    }),
    talent({
      id: 'bloodied',
      name: 'Bloodied',
      row: 0,
      col: 3,
      per: [5, 10],
      text: 'Enemies with Carrion Curse take {}% more damage from your minions.',
      does: (v) => [more('amount', 'minion', v, { targetHas: 'carrion-curse' })],
    }),

    // Row 2
    talent({
      id: 'gorging-hex',
      name: 'Gorging Hex',
      row: 1,
      col: 0,
      requires: 'deep-curse',
      text:
        'Your direct damage puts a stack back on Carrion Curse, up to as many as it started with. Minion hits are ' +
        'minion damage, not direct damage.',
      does: () => [proc('hit', 'direct-damage', [{ do: 'curseStack', match: 'carrion-curse', stacks: 1 }])],
    }),
    talent({
      id: 'carrion-spray',
      name: 'Carrion Spray',
      row: 1,
      col: 1,
      requires: 'feast',
      per: [15, 30],
      text: 'Each stack your minions take splashes {}% of its damage onto every other enemy within 8 yd.',
      does: (v) => [plus('splash', STACK, v)],
    }),
    talent({
      id: 'frenzied-feeding',
      name: 'Frenzied Feeding',
      row: 1,
      col: 3,
      requires: 'bloodied',
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

    // Row 3
    talent({
      id: 'swarming-brood',
      name: 'Swarming Brood',
      row: 2,
      col: 1,
      per: [0.05, 0.1],
      text: 'Each stack your minions take adds {} sec to every minion you command.',
      does: (v) => [proc('hit', STACK, [{ do: 'extendMinions', seconds: v }])],
    }),
    talent({
      id: 'carrion-feast',
      name: 'Carrion Feast',
      row: 2,
      col: 3,
      requires: 'frenzied-feeding',
      per: [0.05, 0.1],
      text: 'Each stack your minions take gives you +{}% minion power for 10 sec, stacking up to 20 times.',
      does: (v) => [
        proc('hit', STACK, [
          buff({ id: 'carrion-feast', name: 'Carrion Feast', duration: 10, maxStacks: 20, stats: { minionPower: v } }),
        ]),
      ],
    }),

    // Row 4
    talent({
      id: 'undying-hex',
      name: 'Undying Hex',
      row: 3,
      col: 0,
      requires: 'gorging-hex',
      per: [10, 20],
      text: 'Each stack your minions take has a {}% chance to burst without being taken.',
      does: (v) => [plus('keepChance', STACK, v)],
    }),
  ],
}
