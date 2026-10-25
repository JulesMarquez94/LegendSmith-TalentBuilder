import { pct, sec } from '../game/format.ts'
import type { BuffSpec } from '../game/types.ts'
import type { TreeDef } from '../talents/types.ts'
import { apply, cooldown, more, plus, proc, selfBuff, talent } from './authoring.ts'

// An ultimate for every role: a burst of haste for you and your group. Haste is worth as much to a
// healer as to a damage dealer, so Fervor has no role. Its talents add to the burst while it lasts.

const DURATION = 20

/** A buff that starts with Fervor and lasts as long, so duration talents and Potency stretch it too. */
const during = (id: string, name: string, extra: Pick<BuffSpec, 'stats' | 'mods'>) =>
  apply(selfBuff({ id, name, duration: DURATION, ...extra }))

export const fervor: TreeDef = {
  id: 'fervor',
  kind: 'cooldown',
  color: '#ff6f3c',
  columns: 4,
  pointsPerRow: 2,
  ability: {
    name: 'Fervor',
    castTime: 'Instant',
    range: 'Group',
    cooldown: '3 min cooldown',
    description: 'You and your group gain 30% haste for 20 sec.',
  },
  spec: {
    cooldown: 180,
    effects: [selfBuff({ id: 'fervor', name: 'Fervor', duration: DURATION, stats: { haste: 30 }, group: true })],
    text: (a) => {
      const e = a.effects[0]
      return `You and your group gain ${pct(e.buff?.stats?.haste ?? 0)}% haste for ${sec(e.duration)} sec: faster casts, attacks and ticks.`
    },
  },
  talents: [
    talent({
      id: 'lasting-fervor',
      name: 'Lasting Fervor',
      row: 0,
      col: 0,
      per: [2, 4, 6],
      text: 'Fervor lasts {} sec longer.',
      does: (v) => [plus('duration', 'fervor', v)],
    }),
    talent({
      id: 'rekindled',
      name: 'Rekindled',
      row: 0,
      col: 1,
      per: [15, 30, 45],
      text: "Fervor's cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'fervor', -v)],
    }),
    talent({
      id: 'battle-focus',
      name: 'Battle Focus',
      row: 0,
      col: 3,
      per: [5, 10],
      text: 'While Fervor lasts, you also have +{}% critical chance.',
      does: (v) => [proc('cast', 'fervor', [during('battle-focus', 'Battle Focus', { stats: { crit: v } })])],
    }),
    talent({
      id: 'zeal',
      name: 'Zeal',
      row: 1,
      col: 1,
      requires: 'rekindled',
      per: [0.2, 0.4],
      text: "Each of your critical hits and heals takes {} sec off Fervor's cooldown.",
      does: (v) => [proc('crit', '*', [cooldown('fervor', v)])],
    }),
    talent({
      id: 'valor',
      name: 'Valor',
      row: 1,
      col: 2,
      per: [5, 10],
      text: 'While Fervor lasts, everything you cast hits and heals {}% harder.',
      does: (v) => [proc('cast', 'fervor', [during('valor', 'Valor', { mods: [more('amount', '*', v)] })])],
    }),
    talent({
      id: 'steadfast',
      name: 'Steadfast',
      row: 2,
      col: 0,
      per: [10, 20],
      text: 'While Fervor lasts, you take {}% less damage.',
      does: (v) => [proc('cast', 'fervor', [during('steadfast', 'Steadfast', { stats: { damageReduction: v } })])],
    }),
    talent({
      id: 'unending-fervor',
      name: 'Unending Fervor',
      row: 3,
      col: 1,
      requires: 'zeal',
      text: 'Fervor holds 2 charges.',
      does: () => [plus('charges', 'fervor', 1)],
    }),
    talent({
      id: 'battle-trance',
      name: 'Battle Trance',
      row: 3,
      col: 3,
      per: [10, 20, 30],
      text: 'While Fervor lasts, your heals and damage over time tick {}% faster.',
      does: (v) => [
        proc('cast', 'fervor', [during('battle-trance', 'Battle Trance', { mods: [more('tickRate', ['hot', 'dot'], v)] })]),
      ],
    }),
  ],
}
