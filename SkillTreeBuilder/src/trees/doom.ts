import { counted, int, pct, sec, single, yd } from '../game/format.ts'
import type { TreeDef } from '../talents/types.ts'
import { apply, cooldown, damage, more, plus, proc, refund, talent } from './authoring.ts'

// A spell, so any damage weapon can cast it: no weapon strike, nothing the weapon has to be.
// The one massive attack: it spends all your resource, and its talents feed it everything else you
// have going (DoTs, minions, zones, HoTs), each worth more the longer it had left.

// ---------- Doom Bolt: spends everything you have on one enormous hit ----------

/** Doom Bolt's own hit, not the blast or the absorbed extras its talents add. */
const BOLT = { all: ['doom-bolt', 'direct-damage'] }

/** "Devour"-style talents: when Doom Bolt hits, it absorbs your effects of one kind for more damage. */
const absorb = (id: string, name: string, row: number, col: number, what: string, match: string) =>
  talent({
    id,
    name,
    row,
    col,
    per: [1, 2],
    text: `When Doom Bolt hits, it absorbs ${what}: they end, and it deals {}% more for every second each had left.`,
    does: (v) => [proc('hit', BOLT, [{ do: 'absorb', match, pct: v }])],
  })

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
    // Row 1: what it spends
    talent({
      id: 'hunger',
      name: 'Hunger',
      row: 0,
      col: 0,
      per: [20, 40, 60],
      text: 'What Doom Bolt spends past its cost counts {}% more.',
      does: (v) => [plus('surplus', 'doom-bolt', v)],
    }),
    absorb('devour', 'Devour', 0, 2, 'your damage-over-time effects on its target', 'dot'),
    talent({
      id: 'gathering-dark',
      name: 'Gathering Dark',
      row: 0,
      col: 3,
      per: [15, 30],
      text: "Each time you gain @resource, there's a {}% chance to take 1 sec off Doom Bolt's cooldown.",
      does: (v) => [proc('gain', 'resource', [cooldown('doom-bolt', 1)], { chance: v })],
    }),

    // Row 2: what else it eats
    absorb('soul-feast', 'Soul Feast', 1, 0, 'your summoned minions', 'minion'),
    absorb('collapse', 'Collapse', 1, 1, 'your zones', 'zone'),
    absorb('drink-deep', 'Drink Deep', 1, 2, 'your heal-over-time effects', 'hot'),
    talent({
      id: 'residual-power',
      name: 'Residual Power',
      row: 1,
      col: 3,
      per: [10, 20],
      text: 'Doom Bolt gives back {}% of what it spent.',
      does: (v) => [proc('cast', 'doom-bolt', [refund(v)])],
    }),

    // Row 3
    talent({
      id: 'final-word',
      name: 'Final Word',
      row: 2,
      col: 1,
      per: [8, 16],
      text: 'Doom Bolt deals {}% more for each of your damage-over-time effects on its target.',
      does: (v) => [more('amount', 'doom-bolt', v, { each: 'dot' })],
    }),

    // Row 4
    talent({
      id: 'cataclysm',
      name: 'Cataclysm',
      row: 3,
      col: 1,
      requires: 'final-word',
      text: 'When Doom Bolt spends 3 times its cost or more, it also blasts its target and every enemy within 8 yd for 1,500 damage.',
      does: () => [
        proc('cast', 'doom-bolt', [apply(damage(1500, 'target', { radius: 8, name: 'Cataclysm' }))], {
          when: { paidAtLeast: 3 },
        }),
      ],
    }),
  ],
}
