import { pct, sec, yd } from '../game/format.ts'
import type { TreeDef } from '../talents/types.ts'
import { apply, buff, more, plus, proc, selfBuff, talent } from './authoring.ts'

// Mobility for every role (Shift). Off the global cooldown: Dash and Sprint work mid-cast, Teleport
// only with Spellstride. Small trees, like the ultimate's: 9 ranks, 6 points to spend.
// Their healing talents use the shared families (direct heal, HoT, zone, shield), so a healer's
// other trees boost them too.

const mobility = { kind: 'mobility', columns: 4, pointsPerRow: 2 } as const

const charges = (n: number) => (n > 1 ? ` Holds ${n} charges.` : '')

// ---------- Dash ----------

export const dash: TreeDef = {
  ...mobility,
  id: 'dash',
  color: '#b8c4ff',
  ability: {
    name: 'Dash',
    castTime: 'Instant',
    range: '10 yd',
    cooldown: '2 charges · 8 sec recharge',
    description: 'Dash a short way in the direction you are moving.',
  },
  spec: {
    gcd: 0,
    cooldown: 8,
    charges: 2,
    effects: [{ type: 'move', mode: 'dash', distance: 10 }],
    text: (a) =>
      `Dash ${yd(a.effects[0].distance)} yd in the direction you are moving (or toward your crosshair).` +
      charges(a.charges),
  },
  talents: [
    // Row 1
    talent({
      id: 'long-stride',
      name: 'Long Stride',
      row: 0,
      col: 0,
      per: [3, 6],
      text: 'Dash goes {} yd farther.',
      does: (v) => [plus('distance', 'dash', v)],
    }),
    talent({
      id: 'quick-recovery',
      name: 'Quick Recovery',
      row: 0,
      col: 2,
      per: [1.5, 3],
      text: 'Dash recharges {} sec faster.',
      does: (v) => [plus('cooldown', 'dash', -v)],
    }),

    // Row 2
    talent({
      id: 'fleetfoot',
      name: 'Fleetfoot',
      row: 1,
      col: 0,
      per: [20, 40],
      text: 'Dash also makes you {}% faster for 3 sec.',
      does: (v) => [proc('cast', 'dash', [buff({ id: 'fleetfoot', name: 'Fleetfoot', duration: 3, stats: { speed: v } })])],
    }),
    talent({
      id: 'triple-dash',
      name: 'Triple Dash',
      row: 1,
      col: 2,
      requires: 'quick-recovery',
      text: 'Dash holds 1 more charge.',
      does: () => [plus('charges', 'dash', 1)],
    }),

    // Row 3
    talent({
      id: 'evasion',
      name: 'Evasion',
      row: 2,
      col: 1,
      per: [25, 50],
      text: 'After Dash, you have +{}% dodge for 2 sec.',
      does: (v) => [proc('cast', 'dash', [buff({ id: 'evasion', name: 'Evasion', duration: 2, stats: { dodge: v } })])],
    }),
  ],
}

// ---------- Teleport ----------

export const teleport: TreeDef = {
  ...mobility,
  id: 'teleport',
  color: '#b79cff',
  ability: {
    name: 'Teleport',
    castTime: 'Instant',
    range: '15 yd',
    cooldown: '15 sec cooldown',
    description: 'Teleport a longer way in the direction you are moving. Not while casting.',
  },
  spec: {
    gcd: 0,
    cooldown: 15,
    notWhileCasting: true,
    effects: [{ type: 'move', mode: 'teleport', distance: 15 }],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Teleport ${yd(e.distance)} yd in the direction you are moving (or toward your crosshair).` +
        charges(a.charges) +
        (e.returnWindow > 0 ? ` Teleport again within ${sec(e.returnWindow)} sec to go back where you were, for free.` : '') +
        (a.notWhileCasting ? ' Not while casting.' : ' Works while casting: the cast goes on.')
      )
    },
  },
  talents: [
    // Row 1
    talent({
      id: 'phase-shift',
      name: 'Phase Shift',
      row: 0,
      col: 0,
      per: [1.5, 3, 4.5],
      text: "Teleport's cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'teleport', -v)],
    }),
    talent({
      id: 'far-reach',
      name: 'Far Reach',
      row: 0,
      col: 2,
      per: [3, 6, 9],
      text: 'Teleport goes {} yd farther.',
      does: (v) => [plus('distance', 'teleport', v)],
    }),

    // Row 2
    talent({
      id: 'double-blink',
      name: 'Double Blink',
      row: 1,
      col: 0,
      requires: 'phase-shift',
      text: 'Teleport holds 2 charges, but each takes 50% longer to come back.',
      does: () => [plus('charges', 'teleport', 1), more('cooldown', 'teleport', 50)],
    }),
    talent({
      id: 'spellstride',
      name: 'Spellstride',
      row: 1,
      col: 3,
      text: 'You can Teleport while casting, and the cast goes on.',
      does: () => [plus('whileCasting', 'teleport', 1)],
    }),

    // Row 3
    talent({
      id: 'recall',
      name: 'Recall',
      row: 2,
      col: 2,
      requires: 'far-reach',
      text: 'After you Teleport, Teleport again within 4 sec to go back where you were, for free.',
      does: () => [plus('returnWindow', 'teleport', 4)],
    }),
  ],
}

// ---------- Sprint ----------

export const sprint: TreeDef = {
  ...mobility,
  id: 'sprint',
  color: '#ffb86b',
  ability: {
    name: 'Sprint',
    castTime: 'Instant',
    range: 'Self',
    cooldown: '20 sec cooldown',
    description: 'Run much faster for a few seconds.',
  },
  spec: {
    gcd: 0,
    cooldown: 20,
    effects: [selfBuff({ id: 'sprint', name: 'Sprint', duration: 4, stats: { speed: 60 } })],
    text: (a) => {
      const e = a.effects[0]
      return `Run ${pct(e.speed)}% faster for ${sec(e.duration)} sec.` + charges(a.charges)
    },
  },
  talents: [
    // Row 1
    talent({
      id: 'fleet',
      name: 'Fleet',
      row: 0,
      col: 0,
      per: [15, 30],
      text: 'Sprint makes you {}% faster on top.',
      does: (v) => [plus('speed', 'sprint', v)],
    }),
    talent({
      id: 'stamina',
      name: 'Stamina',
      row: 0,
      col: 1,
      per: [1.5, 3],
      text: 'Sprint lasts {} sec longer.',
      does: (v) => [plus('duration', 'sprint', v)],
    }),
    talent({
      id: 'wind-runner',
      name: 'Wind Runner',
      row: 0,
      col: 3,
      per: [3, 6],
      text: "Sprint's cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'sprint', -v)],
    }),

    // Row 2
    talent({
      id: 'unstoppable',
      name: 'Unstoppable',
      row: 1,
      col: 0,
      per: [10, 20],
      text: 'While sprinting, you take {}% less damage.',
      does: (v) => [
        proc('cast', 'sprint', [
          apply(selfBuff({ id: 'unstoppable', name: 'Unstoppable', duration: 4, stats: { damageReduction: v } })),
        ]),
      ],
    }),

    // Row 3
    talent({
      id: 'marathon',
      name: 'Marathon',
      row: 2,
      col: 1,
      requires: 'stamina',
      text: 'Sprint holds 2 charges.',
      does: () => [plus('charges', 'sprint', 1)],
    }),
  ],
}
