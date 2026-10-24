import { counted, int, pct, sec, single, yd } from '../game/format.ts'
import type { TreeDef } from '../talents/types.ts'
import { apply, buff, cooldown, damage, more, plus, proc, refund, talent } from './authoring.ts'

// A spell, so any damage weapon can cast it: no weapon strike, nothing the weapon has to be.

// ---------- Doom Bolt: spends everything you have on one enormous hit ----------

/** Doom Bolt's own hit, not the blast or DoTs its talents add. */
const BOLT = { all: ['doom-bolt', 'direct-damage'] }

export const doomBolt: TreeDef = {
  id: 'doom-bolt',
  kind: 'damage',
  role: 'damage',
  color: '#b04cff',
  columns: 4,
  pointsPerRow: 2,
  ability: {
    name: 'Doom Bolt',
    castTime: '2.5 sec cast',
    range: '40 range',
    cooldown: '15 sec cooldown',
    description: 'Pour everything you have into one bolt that hits a single enemy harder the more you spend.',
  },
  spec: {
    cost: 3,
    spendsAll: true,
    castTime: 2.5,
    cooldown: 15,
    range: 40,
    effects: [damage(2000)],
    text: (a) => {
      const surplus = a.spendsAll?.surplus ?? 0
      const per = (100 / a.cost) * (1 + surplus / 100)
      return (
        `Hurls a bolt of doom at the enemy nearest your crosshair within ${yd(a.range)} yd for ` +
        `${int(a.effects[0].amount)} damage, after a ${sec(a.castTime)} sec cast. Costs at least ` +
        `${counted(a.cost, a.resource)} and spends all your ${a.resource}: every ${single(a.resource)} past that adds ` +
        `${pct(per)}% more (${pct(a.spendsAll?.atFull ?? 1)}× with a full bar).`
      )
    },
  },
  talents: [
    // Row 1
    talent({
      id: 'gathering-doom',
      name: 'Gathering Doom',
      row: 0,
      col: 0,
      per: [8, 16, 24],
      text: 'Doom Bolt deals {}% more damage.',
      does: (v) => [more('amount', 'doom-bolt', v)],
    }),
    talent({
      id: 'hunger',
      name: 'Hunger',
      row: 0,
      col: 1,
      per: [20, 40, 60],
      text: 'What Doom Bolt spends past its cost counts {}% more.',
      does: (v) => [plus('surplus', 'doom-bolt', v)],
    }),
    talent({
      id: 'swift-doom',
      name: 'Swift Doom',
      row: 0,
      col: 2,
      per: [0.25, 0.5],
      text: 'Doom Bolt casts {} sec faster.',
      does: (v) => [plus('castTime', 'doom-bolt', -v)],
    }),
    talent({
      id: 'looming-end',
      name: 'Looming End',
      row: 0,
      col: 3,
      per: [2, 4],
      text: "Doom Bolt's cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'doom-bolt', -v)],
    }),

    // Row 2
    talent({
      id: 'residual-power',
      name: 'Residual Power',
      row: 1,
      col: 0,
      per: [10, 20],
      text: 'Doom Bolt gives back {}% of what it spent.',
      does: (v) => [proc('cast', 'doom-bolt', [refund(v)])],
    }),
    talent({
      id: 'devour',
      name: 'Devour',
      row: 1,
      col: 1,
      requires: 'hunger',
      per: [110, 130, 150],
      text:
        'When Doom Bolt hits, it devours your damage-over-time effects on its target: they end, and deal {}% ' +
        'of the damage they had left at once.',
      does: (v) => [proc('hit', BOLT, [{ do: 'consume', match: 'dot', pct: v }])],
    }),
    talent({
      id: 'focused-malice',
      name: 'Focused Malice',
      row: 1,
      col: 2,
      per: [10, 20],
      text: 'Doom Bolt has +{}% critical chance.',
      does: (v) => [plus('critChance', 'doom-bolt', v)],
    }),
    talent({
      id: 'gathering-dark',
      name: 'Gathering Dark',
      row: 1,
      col: 3,
      requires: 'looming-end',
      per: [15, 30],
      text: "Each time you gain @resource, there's a {}% chance to take 1 sec off Doom Bolt's cooldown.",
      does: (v) => [proc('gain', 'resource', [cooldown('doom-bolt', 1)], { chance: v })],
    }),

    // Row 3
    talent({
      id: 'dread',
      name: 'Dread',
      row: 2,
      col: 0,
      per: [10, 20],
      text: 'For 8 sec after Doom Bolt, your damage-over-time effects deal {}% more damage.',
      does: (v) => [
        proc('cast', 'doom-bolt', [buff({ id: 'dread', name: 'Dread', duration: 8, mods: [more('amount', 'dot', v)] })]),
      ],
    }),
    talent({
      id: 'crushing-doom',
      name: 'Crushing Doom',
      row: 2,
      col: 2,
      requires: 'focused-malice',
      per: [25, 50],
      text: "Doom Bolt's critical hits deal {}% more.",
      does: (v) => [plus('critDamage', 'doom-bolt', v)],
    }),
    talent({
      id: 'inevitable',
      name: 'Inevitable',
      row: 2,
      col: 3,
      requires: 'gathering-dark',
      per: [0.5, 1],
      text: "Each critical tick of your damage-over-time effects takes {} sec off Doom Bolt's cooldown.",
      does: (v) => [proc('crit', 'dot', [cooldown('doom-bolt', v)])],
    }),

    // Row 4
    talent({
      id: 'final-word',
      name: 'Final Word',
      row: 3,
      col: 0,
      requires: 'dread',
      per: [5, 10, 15],
      text: 'Doom Bolt deals {}% more for each of your damage-over-time effects on its target.',
      does: (v) => [more('amount', 'doom-bolt', v, { each: 'dot' })],
    }),
    talent({
      id: 'cataclysm',
      name: 'Cataclysm',
      row: 3,
      col: 1,
      requires: 'devour',
      text: 'When Doom Bolt spends 3 times its cost or more, it also blasts its target and every enemy within 8 yd for 1,500 damage.',
      does: () => [
        proc('cast', 'doom-bolt', [apply(damage(1500, 'target', { radius: 8, name: 'Cataclysm' }))], {
          when: { paidAtLeast: 3 },
        }),
      ],
    }),
    talent({
      id: 'soul-echo',
      name: 'Soul Echo',
      row: 3,
      col: 3,
      requires: 'inevitable',
      per: [10, 20],
      text: 'Doom Bolt has a {}% chance to strike again at the same strength, for free.',
      does: (v) => [plus('echo', 'doom-bolt', v)],
    }),
  ],
}
