import { ranks, int, sec, yd } from '../game/format.ts'
import { periodicTotal } from '../game/resolve.ts'
import type { TreeDef } from '../talents/types.ts'
import { dot, more, plus, proc, spread, talent } from './authoring.ts'

// From "Plague - Skill Tree.pptx". Rows and columns start at 0.
// Per-rank values go in braces, one per rank: "{0.5/1/1.5}". The deck's X values are filled in here,
// and its "your plagues" talents that only raise a number now raise every damage-over-time effect,
// so they help Festering Rot, Miasma's Sickness and the other DoTs too.

const VOLATILE_SHORTEN = [0.5, 1, 1.5]
const VOLATILE_DAMAGE = [1, 2, 3]
const TERMINAL_INTERVAL = [0.8, 0.6, 0.4]

export const plague: TreeDef = {
  id: 'plague',
  kind: 'damage',
  role: 'damage',
  madeFor: 'tome-of-summoning',
  artFolder: 'Plague',
  background: 'Plague-Background',
  color: '#7ccf3a',
  columns: 4,
  pointsPerRow: 2,

  ability: {
    name: 'Plague',
    icon: 'Plague',
    castTime: 'Instant',
    range: '40 range',
    description: 'Plague the target. This ability rotates between inflicting Pox, Blight and Malady after each use.',
  },
  effects: [
    {
      name: 'Pox',
      icon: 'Pox',
      castTime: 'Instant',
      range: '40 range',
      description: 'Plague the target, causing 90 Decay damage every sec for 12 sec.',
    },
    {
      name: 'Blight',
      icon: 'Blight',
      castTime: 'Instant',
      range: '40 range',
      description: 'Plague the target, causing 70 Decay damage every sec for 18 sec.',
    },
    {
      name: 'Malady',
      icon: 'Malady',
      castTime: 'Instant',
      range: '40 range',
      description: 'Plague the target, causing 55 Decay damage every sec for 24 sec.',
    },
  ],
  spec: {
    // Free on any weapon: the one spell of the book that costs nothing.
    range: 40,
    cycle: true,
    effects: [
      dot(90, 12, 1, 'target', { name: 'Pox' }),
      dot(70, 18, 1, 'target', { name: 'Blight' }),
      dot(55, 24, 1, 'target', { name: 'Malady' }),
    ],
    text: (a) => {
      const line = (i: number) => {
        const e = a.effects[i]
        return `${e.name} (${int(e.amount)} every ${sec(e.interval)} sec for ${sec(e.duration)} sec, ${int(periodicTotal(e))} in all)`
      }
      return (
        `Plague the enemy nearest your crosshair within ${yd(a.range)} yd. Each use inflicts the next of ` +
        `${line(0)}, ${line(1)} and ${line(2)}. Costs nothing.`
      )
    },
  },

  talents: [
    // Row 1
    talent({
      id: 'lasting-plagues',
      name: 'Lasting Plagues',
      icon: 'Lasting Plagues',
      row: 0,
      col: 1,
      per: [2, 4, 6],
      text: 'Increases the duration of your damage-over-time effects by {} sec.',
      does: (v) => [plus('duration', 'dot', v)],
    }),
    talent({
      id: 'potent-plagues',
      name: 'Potent Plagues',
      icon: 'Potent Plagues',
      row: 0,
      col: 2,
      per: [6, 12, 18],
      text: 'Increases the damage of your damage-over-time effects by {}%.',
      does: (v) => [more('amount', 'dot', v)],
    }),

    // Row 2
    talent({
      id: 'pandemic',
      name: 'Pandemic',
      icon: 'Pandemic',
      row: 1,
      col: 0,
      text: 'Your direct damage to a target with a plague spreads a fresh plague to one enemy within 15 yd that does not have one.',
      does: () => [proc('hit', 'direct-damage', [spread('plague', 15)], { when: { targetHas: 'plague' } })],
    }),
    {
      id: 'volatile-plague',
      name: 'Volatile Plague',
      icon: 'Volatile Plague',
      row: 1,
      col: 1,
      maxRank: 3,
      description:
        `Dealing direct damage shortens the duration of your plagues by ${ranks(VOLATILE_SHORTEN)} sec ` +
        `and instantly deals ${ranks(VOLATILE_DAMAGE)} sec worth of damage.`,
      effects: (rank) => [
        proc('hit', 'direct-damage', [
          { do: 'pulse', match: 'plague', seconds: VOLATILE_DAMAGE[rank - 1] },
          { do: 'extend', match: 'plague', seconds: -VOLATILE_SHORTEN[rank - 1], scope: 'event' },
        ]),
      ],
    },

    // Row 3
    talent({
      id: 'critical-condition',
      name: 'Critical Condition',
      icon: 'Critical Condition',
      row: 2,
      col: 0,
      text: 'Whenever you critically strike a target with direct damage, your plagues on it instantly deal 2 sec worth of damage.',
      does: () => [proc('crit', 'direct-damage', [{ do: 'pulse', match: 'plague', seconds: 2 }])],
    }),
    talent({
      id: 'aggravating',
      name: 'Aggravating',
      icon: 'Aggravating',
      row: 2,
      col: 2,
      requires: 'potent-plagues',
      per: [0.2, 0.4, 0.6],
      text: 'Direct damage extends the duration of your plagues by {} sec.',
      does: (v) => [proc('hit', 'direct-damage', [{ do: 'extend', match: 'plague', seconds: v, scope: 'event' }])],
    }),

    // Row 4
    {
      id: 'terminal',
      name: 'Terminal',
      icon: 'Terminal',
      row: 3,
      col: 0,
      maxRank: 3,
      description: `Your damage-over-time effects deal their damage every ${ranks(TERMINAL_INTERVAL)} sec instead of every 1 sec.`,
      // Every 0.8 sec instead of 1 is 25% faster ticking; 0.6 is 67%, 0.4 is 150%.
      effects: (rank) => [more('tickRate', 'dot', (1 / TERMINAL_INTERVAL[rank - 1] - 1) * 100)],
    },
    talent({
      id: 'bursting-sores',
      name: 'Bursting Sores',
      icon: 'Bursting Sores',
      row: 3,
      col: 1,
      requires: 'volatile-plague',
      text: 'When a plague ends, the target takes damage equal to 20 sec worth of damage.',
      does: () => [proc('expire', 'plague', [{ do: 'burst', seconds: 20 }])],
    }),
    talent({
      id: 'convalescence',
      name: 'Convalescence',
      icon: 'convalescence',
      row: 3,
      col: 3,
      requires: 'aggravating',
      per: [2, 4, 6],
      text: 'Targets take {}% increased damage from you for each unique damage-over-time effect.',
      does: (v) => [more('amount', 'damage', v, { each: 'dot' })],
    }),
  ],
}
