import { counted, int, sec, yd } from '../game/format.ts'
import type { TreeDef } from '../talents/types.ts'
import { buff, more, plus, proc, summon, talent } from './authoring.ts'

// A spell, so any damage weapon can cast it; it pays off with minions. The Overlord is a summon of
// its own (one at a time) that volleys everything around your target and, while it's up, makes your
// other minions hit harder. Its talents speak to minions as a family and to the Overlord itself.

const OVERLORD = 'overlord'

export const overlord: TreeDef = {
  id: 'overlord',
  kind: 'damage',
  role: 'damage',
  madeFor: 'tome-of-summoning',
  color: '#6b4fd8',
  columns: 4,
  pointsPerRow: 2,
  ability: {
    name: 'Overlord',
    castTime: 'Instant',
    range: '40 range',
    cooldown: '30 sec cooldown',
    description:
      'Summon an Overlord for 30 sec: it volleys every enemy around your target with Shadow Bolt Volley, and your ' +
      'other minions deal more damage while it is up.',
  },
  spec: {
    cost: 4,
    cooldown: 30,
    range: 40,
    effects: [summon(150, 2, 30, 1, { name: 'Overlord', radius: 6, empower: 20 })],
    text: (a) => {
      const e = a.effects[0]
      const many = e.max > 1 ? `up to ${e.max} at a time` : 'only one at a time'
      return (
        `Summons an Overlord for ${sec(e.duration)} sec (${many}). Every ${sec(e.interval)} sec it casts Shadow Bolt ` +
        `Volley at the enemy nearest your crosshair, hitting it and every enemy within ${yd(e.radius)} yd for ` +
        `${int(e.amount)}. While it's up, your other minions deal ${int(e.empower)}% more damage` +
        (e.hasten > 0 ? ` and attack ${int(e.hasten)}% faster` : '') +
        `. Costs ${counted(a.cost, a.resource)}.`
      )
    },
  },
  talents: [
    // Row 1
    talent({
      id: 'overwhelming-power',
      name: 'Overwhelming Power',
      row: 0,
      col: 0,
      per: [10, 20, 30],
      text: 'The Overlord deals {}% more damage.',
      does: (v) => [more('amount', OVERLORD, v)],
    }),
    talent({
      id: 'commanding-presence',
      name: 'Commanding Presence',
      row: 0,
      col: 1,
      per: [5, 10],
      text: 'While the Overlord is up, your other minions attack {}% faster.',
      does: (v) => [plus('hasten', OVERLORD, v)],
    }),
    talent({
      id: 'long-reign',
      name: 'Long Reign',
      row: 0,
      col: 3,
      per: [4, 8, 12],
      text: 'The Overlord lasts {} sec longer.',
      does: (v) => [plus('duration', OVERLORD, v)],
    }),

    // Row 2
    talent({
      id: 'lord-of-the-legion',
      name: 'Lord of the Legion',
      row: 1,
      col: 0,
      requires: 'overwhelming-power',
      per: [1, 2],
      text: 'The Overlord deals {}% more damage for each minion you command.',
      does: (v) => [more('amount', OVERLORD, v, { perMinion: true })],
    }),
    talent({
      id: 'dark-sustenance',
      name: 'Dark Sustenance',
      row: 1,
      col: 1,
      requires: 'commanding-presence',
      per: [0.05, 0.1],
      text: 'Every time the Overlord attacks, your other minions last {} sec longer.',
      does: (v) => [plus('sustain', OVERLORD, v)],
    }),
    talent({
      id: 'undying-master',
      name: 'Undying Master',
      row: 1,
      col: 3,
      requires: 'long-reign',
      per: [1, 2],
      text: 'Every minion of yours that dies or runs out adds {} sec to the Overlord, never past its full duration.',
      does: (v) => [plus('feed', OVERLORD, v)],
    }),

    // Row 3
    talent({
      id: 'dark-patron',
      name: 'Dark Patron',
      row: 2,
      col: 1,
      text:
        'The Overlord benefits from your ultimate: while a buff from your ultimate gives you haste, the Overlord ' +
        'attacks that much faster too, even if it came first.',
      does: () => [plus('patron', OVERLORD, 1)],
    }),
    talent({
      id: 'impending-doom',
      name: 'Impending Doom',
      row: 2,
      col: 3,
      requires: 'undying-master',
      per: [500, 1000],
      text:
        'Every minion of yours that dies or runs out gives the Overlord a stack of Impending Doom. At 5, it calls a ' +
        'meteor down on your target, dealing {} damage to every enemy within 5 yd.',
      does: (v) => [plus('meteor', OVERLORD, v)],
    }),

    // Row 4: a choice, one or the other
    talent({
      id: 'twin-overlords',
      name: 'Twin Overlords',
      row: 3,
      col: 1,
      excludes: 'final-command',
      text: 'You can have 2 Overlords at once.',
      does: () => [plus('max', OVERLORD, 1)],
    }),
    talent({
      id: 'final-command',
      name: 'Final Command',
      row: 3,
      col: 2,
      excludes: 'twin-overlords',
      text:
        'When the Overlord leaves, your minions frenzy, attacking 20% faster for 10 sec. Summoning a new one while one ' +
        'is up counts as it leaving.',
      does: () => [
        proc('expire', OVERLORD, [
          buff({ id: 'final-command', name: 'Final Command', duration: 10, mods: [more('tickRate', 'minion', 20)] }),
        ]),
      ],
    }),
  ],
}
