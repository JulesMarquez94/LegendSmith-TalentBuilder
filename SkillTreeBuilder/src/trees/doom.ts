import { counted, int, sec, yd } from '../game/format.ts'
import type { TreeDef } from '../talents/types.ts'
import { buff, cooldown, damage, more, plus, proc, talent } from './authoring.ts'

// A spell, so any damage weapon can cast it: no weapon strike, nothing the weapon has to be.

// ---------- Doom Bolt: one slow, enormous hit on a cooldown ----------

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
    description: 'Gather your power into one bolt that hits a single enemy for enormous damage.',
  },
  spec: {
    cost: 3,
    castTime: 2.5,
    cooldown: 15,
    range: 40,
    effects: [damage(2000)],
    text: (a) =>
      `Hurls a bolt of doom at the enemy nearest your crosshair within ${yd(a.range)} yd for ` +
      `${int(a.effects[0].amount)} damage, after a ${sec(a.castTime)} sec cast. Costs ${counted(a.cost, a.resource)}.`,
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
      id: 'swift-doom',
      name: 'Swift Doom',
      row: 0,
      col: 1,
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
      id: 'executioner',
      name: 'Executioner',
      row: 1,
      col: 0,
      requires: 'gathering-doom',
      per: [10, 20, 30],
      text: 'Your direct damage deals {}% more to enemies below 35% health.',
      does: (v) => [more('amount', 'direct-damage', v, { targetBelow: 35 })],
    }),
    talent({
      id: 'focused-malice',
      name: 'Focused Malice',
      row: 1,
      col: 1,
      per: [10, 20],
      text: 'Doom Bolt has +{}% critical chance.',
      does: (v) => [plus('critChance', 'doom-bolt', v)],
    }),
    talent({
      id: 'inevitable',
      name: 'Inevitable',
      row: 1,
      col: 3,
      requires: 'looming-end',
      per: [0.5, 1],
      text: "Each critical tick of your damage-over-time effects takes {} sec off Doom Bolt's cooldown.",
      does: (v) => [proc('crit', 'dot', [cooldown('doom-bolt', v)])],
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
      id: 'soul-echo',
      name: 'Soul Echo',
      row: 2,
      col: 2,
      per: [10, 20],
      text: 'Doom Bolt has a {}% chance to strike again, for free.',
      does: (v) => [plus('echo', 'doom-bolt', v)],
    }),
    talent({
      id: 'crushing-doom',
      name: 'Crushing Doom',
      row: 2,
      col: 3,
      requires: 'focused-malice',
      per: [25, 50],
      text: "Doom Bolt's critical hits deal {}% more.",
      does: (v) => [plus('critDamage', 'doom-bolt', v)],
    }),

    // Row 4
    talent({
      id: 'final-word',
      name: 'Final Word',
      row: 3,
      col: 1,
      requires: 'dread',
      per: [5, 10, 15],
      text: 'Doom Bolt deals {}% more for each of your damage-over-time effects on its target.',
      does: (v) => [more('amount', 'doom-bolt', v, { each: 'dot' })],
    }),
    talent({
      id: 'second-doom',
      name: 'Second Doom',
      row: 3,
      col: 3,
      requires: 'inevitable',
      text: 'Doom Bolt holds 2 charges.',
      does: () => [plus('charges', 'doom-bolt', 1)],
    }),
  ],
}
