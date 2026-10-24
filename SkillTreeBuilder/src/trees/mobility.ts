import { pct, sec, yd } from '../game/format.ts'
import type { TreeDef } from '../talents/types.ts'
import {
  apply,
  buff,
  cooldown,
  grant,
  heal,
  hot,
  more,
  plus,
  proc,
  restore,
  selfBuff,
  shield,
  stat,
  talent,
  zone,
} from './authoring.ts'

// Mobility for every role (B / Shift). Off the global cooldown, so they can be used mid-cast.
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
    talent({
      id: 'long-stride',
      name: 'Long Stride',
      row: 0,
      col: 0,
      per: [2, 4, 6],
      text: 'Dash goes {} yd farther.',
      does: (v) => [plus('distance', 'dash', v)],
    }),
    talent({
      id: 'quick-recovery',
      name: 'Quick Recovery',
      row: 0,
      col: 1,
      per: [1, 2, 3],
      text: 'Dash recharges {} sec faster.',
      does: (v) => [plus('cooldown', 'dash', -v)],
    }),
    talent({
      id: 'second-wind',
      name: 'Second Wind',
      row: 0,
      col: 3,
      per: [12, 24],
      text: 'Dash gives you back {} @resource.',
      does: (v) => [proc('cast', 'dash', [restore(v)])],
    }),
    talent({
      id: 'light-footed',
      name: 'Light Footed',
      row: 1,
      col: 0,
      per: [2, 4],
      text: 'You have +{}% dodge: that chance to avoid any hit completely.',
      does: (v) => [stat('dodge', v)],
    }),
    talent({
      id: 'triple-dash',
      name: 'Triple Dash',
      row: 1,
      col: 1,
      requires: 'quick-recovery',
      text: 'Dash holds 1 more charge.',
      does: () => [plus('charges', 'dash', 1)],
    }),
    talent({
      id: 'mending-steps',
      name: 'Mending Steps',
      row: 1,
      col: 2,
      per: [400, 800],
      text: 'Dashing past allies heals each of them for {}.',
      does: (v) => [proc('cast', 'dash', [apply(heal(v, 'path', { name: 'Mending Steps' }))])],
    }),
    talent({
      id: 'momentum',
      name: 'Momentum',
      row: 2,
      col: 0,
      per: [50, 100],
      text: 'After Dash, your next heal within 5 sec casts {}% faster.',
      does: (v) => [
        proc('cast', 'dash', [
          buff({
            id: 'momentum',
            name: 'Momentum',
            duration: 5,
            mods: [more('castTime', 'healing', -v)],
            consumeOn: 'healing',
          }),
        ]),
      ],
    }),
    talent({
      id: 'trail-of-light',
      name: 'Trail of Light',
      row: 2,
      col: 2,
      requires: 'mending-steps',
      text: 'Dash leaves a 5 yd healing zone where it started, healing 150 every sec for 4 sec.',
      does: () => [proc('cast', 'dash', [apply(zone(150, 4, 1, 5, 'origin', { name: 'Trail of Light' }))])],
    }),
    talent({
      id: 'evasion',
      name: 'Evasion',
      row: 3,
      col: 0,
      requires: 'momentum',
      per: [25, 50],
      text: 'After Dash, you have +{}% dodge for 2 sec.',
      does: (v) => [proc('cast', 'dash', [buff({ id: 'evasion', name: 'Evasion', duration: 2, stats: { dodge: v } })])],
    }),
    talent({
      id: 'fleetfoot',
      name: 'Fleetfoot',
      row: 3,
      col: 3,
      per: [20, 40],
      text: 'Dash also makes you {}% faster for 3 sec.',
      does: (v) => [proc('cast', 'dash', [buff({ id: 'fleetfoot', name: 'Fleetfoot', duration: 3, stats: { speed: v } })])],
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
    description: 'Teleport a longer way in the direction you are moving.',
  },
  spec: {
    gcd: 0,
    cooldown: 15,
    effects: [{ type: 'move', mode: 'teleport', distance: 15 }],
    text: (a) =>
      `Teleport ${yd(a.effects[0].distance)} yd in the direction you are moving (or toward your crosshair).` +
      charges(a.charges),
  },
  talents: [
    talent({
      id: 'far-reach',
      name: 'Far Reach',
      row: 0,
      col: 0,
      per: [3, 6, 9],
      text: 'Teleport goes {} yd farther.',
      does: (v) => [plus('distance', 'teleport', v)],
    }),
    talent({
      id: 'phase-shift',
      name: 'Phase Shift',
      row: 0,
      col: 2,
      per: [1.5, 3, 4.5],
      text: "Teleport's cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'teleport', -v)],
    }),
    talent({
      id: 'arcane-recovery',
      name: 'Arcane Recovery',
      row: 1,
      col: 0,
      per: [30, 60],
      text: 'Teleport gives you back {} @resource.',
      does: (v) => [proc('cast', 'teleport', [restore(v)])],
    }),
    talent({
      id: 'double-blink',
      name: 'Double Blink',
      row: 1,
      col: 2,
      requires: 'phase-shift',
      text: 'Teleport holds 2 charges.',
      does: () => [plus('charges', 'teleport', 1)],
    }),
    talent({
      id: 'guardian-gate',
      name: 'Guardian Gate',
      row: 1,
      col: 3,
      per: [1200, 2400],
      text: 'Teleport shields you for {} for 6 sec.',
      does: (v) => [proc('cast', 'teleport', [apply(shield(v, 6, 'self', { name: 'Guardian Gate' }))])],
    }),
    talent({
      id: 'sanctum-gate',
      name: 'Sanctum Gate',
      row: 2,
      col: 1,
      requires: 'far-reach',
      text: 'Teleport leaves an 8 yd healing zone where you were, healing 200 every sec for 6 sec.',
      does: () => [proc('cast', 'teleport', [apply(zone(200, 6, 1, 8, 'origin', { name: 'Sanctum Gate' }))])],
    }),
    talent({
      id: 'blink-heal',
      name: 'Blink Heal',
      row: 2,
      col: 3,
      per: [50, 100],
      text: 'After Teleport, your next direct heal within 6 sec costs {}% less.',
      does: (v) => [
        proc('cast', 'teleport', [
          buff({
            id: 'blink-heal',
            name: 'Blink Heal',
            duration: 6,
            mods: [more('cost', 'direct-heal', -v)],
            consumeOn: 'direct-heal',
          }),
        ]),
      ],
    }),
    talent({
      id: 'rift-walker',
      name: 'Rift Walker',
      row: 3,
      col: 1,
      requires: 'sanctum-gate',
      text: 'Teleport also leaves the same healing zone where you arrive.',
      does: () => [proc('cast', 'teleport', [apply(zone(200, 6, 1, 8, 'self', { name: 'Rift Walker' }))])],
    }),
    talent({
      id: 'displacement',
      name: 'Displacement',
      row: 3,
      col: 2,
      per: [3, 6, 9],
      text: "Teleport takes {} sec off your ultimate's cooldown.",
      does: (v) => [proc('cast', 'teleport', [cooldown('cooldown', v)])],
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
    talent({
      id: 'fleet',
      name: 'Fleet',
      row: 0,
      col: 0,
      per: [10, 20, 30],
      text: 'Sprint makes you {}% faster on top.',
      does: (v) => [plus('speed', 'sprint', v)],
    }),
    talent({
      id: 'stamina',
      name: 'Stamina',
      row: 0,
      col: 1,
      per: [1, 2, 3],
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
    talent({
      id: 'second-breath',
      name: 'Second Breath',
      row: 1,
      col: 0,
      per: [4, 8],
      text: 'While sprinting, you regenerate {} more @resource per sec.',
      does: (v) => [
        proc('cast', 'sprint', [
          apply(selfBuff({ id: 'second-breath', name: 'Second Breath', duration: 4, stats: { resourceRegen: v } })),
        ]),
      ],
    }),
    talent({
      id: 'rejuvenating-run',
      name: 'Rejuvenating Run',
      row: 1,
      col: 2,
      text: 'Sprint also heals you for 500 every sec while it lasts.',
      does: () => [grant('sprint', hot(500, 4, 1, 'self', { name: 'Rejuvenating Run' }))],
    }),
    talent({
      id: 'unstoppable',
      name: 'Unstoppable',
      row: 2,
      col: 0,
      requires: 'second-breath',
      per: [10, 20],
      text: 'While sprinting, you take {}% less damage.',
      does: (v) => [
        proc('cast', 'sprint', [
          apply(selfBuff({ id: 'unstoppable', name: 'Unstoppable', duration: 4, stats: { damageReduction: v } })),
        ]),
      ],
    }),
    talent({
      id: 'pace-setter',
      name: 'Pace Setter',
      row: 2,
      col: 2,
      per: [15, 30],
      text: 'While sprinting, your heals cast {}% faster.',
      does: (v) => [
        proc('cast', 'sprint', [
          apply(
            selfBuff({ id: 'pace-setter', name: 'Pace Setter', duration: 4, mods: [more('castTime', 'healing', -v)] }),
          ),
        ]),
      ],
    }),
    talent({
      id: 'marathon',
      name: 'Marathon',
      row: 3,
      col: 1,
      requires: 'stamina',
      text: 'Sprint holds 2 charges.',
      does: () => [plus('charges', 'sprint', 1)],
    }),
    talent({
      id: 'relay',
      name: 'Relay',
      row: 3,
      col: 3,
      per: [1, 2, 3],
      text: 'Sprint adds {} sec to your heal-over-time effects on allies within 10 yd.',
      does: (v) => [
        proc('cast', 'sprint', [{ do: 'extend', match: 'hot', seconds: v, scope: 'near', radius: 10 }]),
      ],
    }),
  ],
}
