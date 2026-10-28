import { int, sec, yd } from '../../game/format.ts'
import { periodicTotal } from '../../game/resolve.ts'
import type { TreeDef } from '../../talents/types.ts'
import { buff, cooldown, grant, heal, hot, more, plus, proc, talent, zone } from '../authoring.ts'

// Healer ultimates for the big cooldown slot (Y / F). One instant burst, one zone, one decaying HoT,
// so each one leans on a different family's talents in the other trees, and each tree's "heals more"
// talent lifts that whole family in return. Each also has a talent that shortens its cooldown as you play.

const ultimate = { role: 'healer', kind: 'cooldown', columns: 4, pointsPerRow: 2 } as const

// ---------- Miracle: instant heal on everyone ----------

export const miracle: TreeDef = {
  ...ultimate,
  id: 'miracle',
  color: '#ffe38a',
  ability: {
    name: 'Miracle',
    castTime: 'Instant',
    range: '40 range',
    cooldown: '2 min cooldown',
    description: 'Instantly heal every ally in range for a large amount.',
  },
  spec: {
    cooldown: 120,
    range: 40,
    effects: [heal(6000, 'all')],
    text: (a) => `Instantly heals every ally within ${yd(a.range)} yd for ${int(a.effects[0].amount)}.`,
  },
  talents: [
    // Row 1
    talent({
      id: 'greater-miracle',
      name: 'Greater Miracle',
      row: 0,
      col: 0,
      per: [8, 16, 24],
      text: 'Your direct heals heal {}% more.',
      does: (v) => [more('amount', 'direct-heal', v)],
    }),
    talent({
      id: 'answered-prayers',
      name: 'Answered Prayers',
      row: 0,
      col: 3,
      per: [0.5, 1, 1.5],
      text: "Each critical heal from your direct heals takes {} sec off Miracle's cooldown.",
      does: (v) => [proc('crit', 'direct-heal', [cooldown('miracle', v)])],
    }),

    // Row 2
    talent({
      id: 'afterglow',
      name: 'Afterglow',
      row: 1,
      col: 0,
      requires: 'greater-miracle',
      text: 'Miracle also leaves a heal-over-time effect on everyone it heals: 400 every 2 sec for 6 sec.',
      does: () => [grant('miracle', hot(400, 6, 2, 'same', { name: 'Afterglow' }))],
    }),
    talent({
      id: 'second-miracle',
      name: 'Second Miracle',
      row: 1,
      col: 1,
      text: 'Miracle holds 2 charges.',
      does: () => [plus('charges', 'miracle', 1)],
    }),

    // Row 3
    talent({
      id: 'saving-grace',
      name: 'Saving Grace',
      row: 2,
      col: 1,
      requires: 'second-miracle',
      text: 'Miracle resets the cooldowns of your heal abilities.',
      does: () => [proc('cast', 'miracle', [cooldown('heal', Infinity)])],
    }),
  ],
}

// ---------- Sanctuary: big zone ----------

export const sanctuary: TreeDef = {
  ...ultimate,
  id: 'sanctuary',
  color: '#fff3b0',
  ability: {
    name: 'Sanctuary',
    castTime: 'Instant',
    range: '40 range',
    cooldown: '2.5 min cooldown',
    description: 'Create a large sanctuary around the lowest-health ally that heals everyone inside strongly for 12 sec.',
  },
  spec: {
    cooldown: 150,
    range: 40,
    effects: [zone(600, 12, 1, 15, 'lowest-missing')],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Creates a ${yd(e.radius)} yd sanctuary around the lowest-health ally within ${yd(a.range)} yd who isn't in one, for ` +
        `${sec(e.duration)} sec. Everyone inside is healed for ${int(e.amount)} every ${sec(e.interval)} sec` +
        (e.growth ? `, ${e.growth}% more with each tick.` : '.') +
        (e.follow ? ' It follows that ally.' : '')
      )
    },
  },
  talents: [
    // Row 1
    talent({
      id: 'hallowed-ground',
      name: 'Hallowed Ground',
      row: 0,
      col: 0,
      per: [8, 16, 24],
      text: 'Your zones heal {}% more.',
      does: (v) => [more('amount', 'zone', v)],
    }),
    talent({
      id: 'hallowed-echo',
      name: 'Hallowed Echo',
      row: 0,
      col: 2,
      per: [0.5, 1],
      text: "Each critical heal from your zones takes {} sec off Sanctuary's cooldown.",
      does: (v) => [proc('crit', 'zone', [cooldown('sanctuary', v)])],
    }),

    // Row 2
    talent({
      id: 'haven',
      name: 'Haven',
      row: 1,
      col: 0,
      per: [5, 10],
      text: 'Allies inside your zones take {}% less damage.',
      does: (v) => [plus('damageReduction', 'zone', v)],
    }),
    talent({
      id: 'consecration',
      name: 'Consecration',
      row: 1,
      col: 2,
      text: 'Sanctuary follows the ally it was placed on.',
      does: () => [plus('follow', 'sanctuary', 1)],
    }),

    // Row 3
    talent({
      id: 'final-hymn',
      name: 'Final Hymn',
      row: 2,
      col: 1,
      text: 'When Sanctuary ends, it heals everyone inside for 3 sec worth of healing.',
      does: () => [proc('expire', 'sanctuary', [{ do: 'burst', seconds: 3 }])],
    }),
  ],
}

// ---------- Lifetide: strong HoT on everyone that decays ----------

export const lifetide: TreeDef = {
  ...ultimate,
  id: 'lifetide',
  color: '#4fd1c5',
  ability: {
    name: 'Lifetide',
    castTime: 'Instant',
    range: '40 range',
    cooldown: '2 min cooldown',
    description: 'A strong heal over time on every ally in range. It heals a lot at first, then ebbs with every tick.',
  },
  spec: {
    cooldown: 120,
    range: 40,
    effects: [hot(900, 10, 1, 'all', { growth: -15 })],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Every ally within ${yd(a.range)} yd heals for ${int(e.amount)} on the first tick, then ${-e.growth}% less ` +
        `with each tick, every ${sec(e.interval)} sec for ${sec(e.duration)} sec: ${int(periodicTotal(e))} each in all.`
      )
    },
  },
  talents: [
    // Row 1
    talent({
      id: 'spring-tide',
      name: 'Spring Tide',
      row: 0,
      col: 0,
      per: [8, 16, 24],
      text: 'Your heal-over-time effects heal {}% more.',
      does: (v) => [more('amount', 'hot', v)],
    }),
    talent({
      id: 'slow-ebb',
      name: 'Slow Ebb',
      row: 0,
      col: 1,
      per: [4.5, 9],
      text: 'Lifetide fades {}% less with each tick.',
      does: (v) => [plus('growth', 'lifetide', v)],
    }),

    // Row 2
    talent({
      id: 'moonpull',
      name: 'Moonpull',
      row: 1,
      col: 1,
      requires: 'slow-ebb',
      text: "Lifetide's ticks have +20% critical chance.",
      does: () => [plus('critChance', 'lifetide', 20)],
    }),
    talent({
      id: 'tidal-rhythm',
      name: 'Tidal Rhythm',
      row: 1,
      col: 2,
      text: 'For 10 sec after Lifetide, heal-over-time effects you apply tick 30% faster.',
      does: () => [
        proc('cast', 'lifetide', [
          buff({ id: 'tidal-rhythm', name: 'Tidal Rhythm', duration: 10, mods: [more('tickRate', 'hot', 30)] }),
        ]),
      ],
    }),

    // Row 3
    talent({
      id: 'ebb-and-flow',
      name: 'Ebb and Flow',
      row: 2,
      col: 1,
      requires: 'moonpull',
      per: [4.5, 9],
      text: 'When Lifetide ends on an ally, it washes over them once more, healing {} sec worth at once.',
      does: (v) => [proc('expire', 'lifetide', [{ do: 'burst', seconds: v }])],
    }),
  ],
}
