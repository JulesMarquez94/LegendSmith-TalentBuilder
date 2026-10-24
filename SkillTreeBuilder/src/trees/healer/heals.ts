import { int, pct, sec, yd } from '../../game/format.ts'
import { periodicTotal } from '../../game/resolve.ts'
import type { TreeDef } from '../../talents/types.ts'
import { apply, buff, cooldown, grant, heal, hot, more, plus, proc, restoreShare, shield, talent, zone } from '../authoring.ts'

// The healer's role abilities: three of these six go in the right trigger and bumper slots.
// Each tree's "heals more" talent aims at a family (direct heals, chain heals, zones, HoTs…), so a
// point in one tree also lifts every other ability of that family you have slotted. Costs and
// resource talents say "@resource", so any healing weapon can use these with its own resource.

const healer = { role: 'healer', kind: 'heal', columns: 4, pointsPerRow: 2 } as const

// ---------- Mend: direct heal ----------

export const mend: TreeDef = {
  ...healer,
  id: 'mend',
  color: '#8fe3a0',
  ability: {
    name: 'Mend',
    castTime: '1.5 sec cast',
    range: '40 range',
    description: 'Heal the lowest-health ally in range.',
  },
  spec: {
    cost: 100,
    castTime: 1.5,
    range: 40,
    effects: [heal(1800)],
    text: (a) => `Heals the lowest-health ally within ${yd(a.range)} yd for ${int(a.effects[0].amount)}.`,
  },
  talents: [
    talent({
      id: 'greater-mend',
      name: 'Greater Mend',
      row: 0,
      col: 0,
      per: [8, 16, 24],
      text: 'Your direct heals heal {}% more.',
      does: (v) => [more('amount', 'direct-heal', v)],
    }),
    talent({
      id: 'swift-hands',
      name: 'Swift Hands',
      row: 0,
      col: 1,
      per: [0.25, 0.5],
      text: 'Your direct heals cast {} sec faster.',
      does: (v) => [plus('castTime', 'direct-heal', -v)],
    }),
    talent({
      id: 'efficient-prayers',
      name: 'Efficient Prayers',
      row: 0,
      col: 2,
      per: [4, 8, 12],
      text: 'Your direct heals cost {}% less.',
      does: (v) => [more('cost', 'direct-heal', -v)],
    }),
    talent({
      id: 'triage',
      name: 'Triage',
      row: 1,
      col: 0,
      per: [10, 20, 30],
      text: 'Your direct heals heal {}% more on allies below 40% health.',
      does: (v) => [more('amount', 'direct-heal', v, { targetBelow: 40 })],
    }),
    talent({
      id: 'lingering-mend',
      name: 'Lingering Mend',
      row: 1,
      col: 2,
      text: "Mend also leaves a heal-over-time effect on its target that heals for 30% of Mend's base over 6 sec.",
      does: () => [grant('mend', hot(180, 6, 2, 'same', { name: 'Lingering Mend' }))],
    }),
    talent({
      id: 'critical-mending',
      name: 'Critical Mending',
      row: 1,
      col: 3,
      per: [5, 10],
      text: 'Your direct heals have +{}% critical chance.',
      does: (v) => [plus('critChance', 'direct-heal', v)],
    }),
    talent({
      id: 'surge-of-light',
      name: 'Surge of Light',
      row: 2,
      col: 1,
      requires: 'swift-hands',
      per: [10, 20, 30],
      text: 'Mend has a {}% chance to make your next Mend instant.',
      does: (v) => [
        proc(
          'cast',
          'mend',
          [
            buff({
              id: 'surge-of-light',
              name: 'Surge of Light',
              duration: 10,
              mods: [more('castTime', 'mend', -100)],
              consumeOn: 'mend',
            }),
          ],
          { chance: v },
        ),
      ],
    }),
    talent({
      id: 'renewing-touch',
      name: 'Renewing Touch',
      row: 2,
      col: 2,
      per: [1, 2],
      text: 'Mend adds {} sec to your heal-over-time effects on its target.',
      does: (v) => [
        proc('heal', { all: ['mend', 'direct-heal'] }, [{ do: 'extend', match: 'hot', seconds: v, scope: 'event' }]),
      ],
    }),
    talent({
      id: 'echoing-mend',
      name: 'Echoing Mend',
      row: 3,
      col: 1,
      requires: 'surge-of-light',
      text: 'When Mend critically heals, the next most injured ally is healed for 50% as much.',
      does: () => [
        proc('crit', { all: ['mend', 'direct-heal'] }, [
          apply(heal(0, 'next-lowest', { name: 'Echoing Mend' }), { pct: 50, of: 'amount' }),
        ]),
      ],
    }),
    talent({
      id: 'inner-focus',
      name: 'Inner Focus',
      row: 3,
      col: 3,
      text: 'After every 3 Mends, your next Mend costs nothing.',
      does: () => [
        proc(
          'cast',
          'mend',
          [
            buff({
              id: 'inner-focus',
              name: 'Inner Focus',
              duration: 30,
              mods: [more('cost', 'mend', -100)],
              consumeOn: 'mend',
            }),
          ],
          { every: 3 },
        ),
      ],
    }),
  ],
}

// ---------- Chain Heal: direct heal that jumps ----------

export const chainHeal: TreeDef = {
  ...healer,
  id: 'chain-heal',
  color: '#5fd4c4',
  ability: {
    name: 'Chain Heal',
    castTime: '1.5 sec cast',
    range: '40 range',
    cooldown: '6 sec cooldown',
    description: 'Heal the lowest-health ally, then jump from ally to ally, healing less with each jump.',
  },
  spec: {
    cost: 160,
    castTime: 1.5,
    cooldown: 6,
    range: 40,
    effects: [{ type: 'chain', amount: 1400, bounces: 3, falloff: 15, radius: 12, target: 'lowest', tags: ['chain'] }],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Heals the lowest-health ally within ${yd(a.range)} yd for ${int(e.amount)}, then jumps to the next most ` +
        `injured ally within ${yd(e.radius)} yd, up to ${e.bounces} times. Each jump heals ${pct(e.falloff)}% less.`
      )
    },
  },
  talents: [
    talent({
      id: 'extra-link',
      name: 'Extra Link',
      row: 0,
      col: 0,
      per: [1, 2],
      text: 'Chain Heal jumps to {} more allies.',
      does: (v) => [plus('bounces', 'chain-heal', v)],
    }),
    talent({
      id: 'strong-links',
      name: 'Strong Links',
      row: 0,
      col: 1,
      per: [5, 10, 15],
      text: 'Your chain heals lose {}% less healing per jump.',
      does: (v) => [plus('falloff', 'chain', -v)],
    }),
    talent({
      id: 'potent-current',
      name: 'Potent Current',
      row: 0,
      col: 2,
      per: [8, 16, 24],
      text: 'Your chain heals heal {}% more.',
      does: (v) => [more('amount', 'chain', v)],
    }),
    talent({
      id: 'wide-arc',
      name: 'Wide Arc',
      row: 1,
      col: 0,
      requires: 'extra-link',
      per: [4, 8],
      text: 'Your chain heals can jump {} yd farther.',
      does: (v) => [plus('radius', 'chain', v)],
    }),
    talent({
      id: 'rapid-current',
      name: 'Rapid Current',
      row: 1,
      col: 1,
      per: [1, 2],
      text: "Chain Heal's cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'chain-heal', -v)],
    }),
    talent({
      id: 'twin-currents',
      name: 'Twin Currents',
      row: 1,
      col: 3,
      text: 'Chain Heal holds 2 charges.',
      does: () => [plus('charges', 'chain-heal', 1)],
    }),
    talent({
      id: 'riptide',
      name: 'Riptide',
      row: 2,
      col: 0,
      text: "Chain Heal's first target also gets a heal-over-time effect that heals for 25% of the heal over 6 sec.",
      does: () => [grant('chain-heal', hot(117, 6, 2, 'same', { name: 'Riptide' }))],
    }),
    talent({
      id: 'tidal-surge',
      name: 'Tidal Surge',
      row: 2,
      col: 2,
      per: [10, 20, 30],
      text: 'Your chain heals heal {}% more on allies with one of your heal-over-time effects.',
      does: (v) => [more('amount', 'chain', v, { targetHas: 'hot' })],
    }),
    talent({
      id: 'cascade',
      name: 'Cascade',
      row: 3,
      col: 0,
      requires: 'riptide',
      text: 'Each Chain Heal jump onto an ally with one of your heal-over-time effects adds 1 sec to it.',
      does: () => [
        proc('heal', { all: ['chain-heal', 'direct-heal'] }, [{ do: 'extend', match: 'hot', seconds: 1, scope: 'event' }], {
          when: { targetHas: 'hot' },
        }),
      ],
    }),
    talent({
      id: 'overcharge',
      name: 'Overcharge',
      row: 3,
      col: 2,
      requires: 'tidal-surge',
      per: [25, 50],
      text: "When Chain Heal critically heals, there's a {}% chance its cooldown resets.",
      does: (v) => [proc('crit', { all: ['chain-heal', 'direct-heal'] }, [cooldown('chain-heal', Infinity)], { chance: v })],
    }),
  ],
}

// ---------- Healing Rain: zone ----------

export const healingRain: TreeDef = {
  ...healer,
  id: 'healing-rain',
  color: '#8cc8ff',
  ability: {
    name: 'Healing Rain',
    castTime: 'Instant',
    range: '40 range',
    cooldown: '10 sec cooldown',
    description: 'Rain light around the lowest-health ally, healing everyone who stands in it.',
  },
  spec: {
    cost: 200,
    cooldown: 10,
    range: 40,
    // Never two rains on one ally: a second one goes to the most injured ally not already under one.
    effects: [zone(220, 10, 1, 8, 'lowest-missing')],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Rains light around the lowest-health ally within ${yd(a.range)} yd who isn't already under it, for ` +
        `${sec(e.duration)} sec. Every ally within ${yd(e.radius)} yd of it is healed for ${int(e.amount)} every ` +
        `${sec(e.interval)} sec.` +
        (e.follow ? ' The rain follows that ally.' : '')
      )
    },
  },
  talents: [
    talent({
      id: 'downpour',
      name: 'Downpour',
      row: 0,
      col: 0,
      per: [6, 12, 18],
      text: 'Your zones heal {}% more.',
      does: (v) => [more('amount', 'zone', v)],
    }),
    talent({
      id: 'wide-clouds',
      name: 'Wide Clouds',
      row: 0,
      col: 1,
      per: [2, 4],
      text: 'Your zones are {} yd wider.',
      does: (v) => [plus('radius', 'zone', v)],
    }),
    talent({
      id: 'lasting-storm',
      name: 'Lasting Storm',
      row: 0,
      col: 3,
      per: [2, 4],
      text: 'Your zones last {} sec longer.',
      does: (v) => [plus('duration', 'zone', v)],
    }),
    talent({
      id: 'torrent',
      name: 'Torrent',
      row: 1,
      col: 0,
      requires: 'downpour',
      per: [10, 20, 30],
      text: 'Your zones tick {}% faster.',
      does: (v) => [more('tickRate', 'zone', v)],
    }),
    talent({
      id: 'gathering-clouds',
      name: 'Gathering Clouds',
      row: 1,
      col: 2,
      per: [2, 4],
      text: "Healing Rain's cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'healing-rain', -v)],
    }),
    talent({
      id: 'twin-storms',
      name: 'Twin Storms',
      row: 1,
      col: 3,
      text: 'Healing Rain holds 2 charges.',
      does: () => [plus('charges', 'healing-rain', 1)],
    }),
    talent({
      id: 'anchored-storm',
      name: 'Anchored Storm',
      row: 2,
      col: 1,
      requires: 'wide-clouds',
      text: 'Healing Rain follows the ally it was placed on.',
      does: () => [plus('follow', 'healing-rain', 1)],
    }),
    talent({
      id: 'nourishing-rain',
      name: 'Nourishing Rain',
      row: 2,
      col: 2,
      per: [10, 20, 30],
      text: 'Your zones heal {}% more on allies with one of your heal-over-time effects.',
      does: (v) => [more('amount', 'zone', v, { targetHas: 'hot' })],
    }),
    talent({
      id: 'gathering-storm',
      name: 'Gathering Storm',
      row: 2,
      col: 3,
      per: [10, 20, 30],
      text: 'Each critical heal from Healing Rain makes it last 0.5 sec longer, up to {}% longer than it started.',
      does: (v) => [
        proc('crit', 'healing-rain', [{ do: 'extend', match: 'healing-rain', seconds: 0.5, scope: 'source', capPct: v }]),
      ],
    }),
    talent({
      id: 'cloudburst',
      name: 'Cloudburst',
      row: 3,
      col: 1,
      requires: 'anchored-storm',
      text: 'When Healing Rain ends, it bursts and heals everyone inside for 3 sec worth of healing.',
      does: () => [proc('expire', 'healing-rain', [{ do: 'burst', seconds: 3 }])],
    }),
    talent({
      id: 'rainmaker',
      name: 'Rainmaker',
      row: 3,
      col: 3,
      per: [0.1, 0.2, 0.3],
      text: 'Each Healing Rain tick gives you back {}% of your maximum @resource.',
      does: (v) => [proc('tick', 'healing-rain', [restoreShare(v)])],
    }),
  ],
}

// ---------- Renew: heal over time ----------

export const renew: TreeDef = {
  ...healer,
  id: 'renew',
  color: '#a6e65a',
  ability: {
    name: 'Renew',
    castTime: 'Instant',
    range: '40 range',
    description: 'Heal the lowest-health ally without Renew over time.',
  },
  spec: {
    cost: 80,
    range: 40,
    effects: [hot(300, 12, 2, 'lowest-missing')],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Heals the lowest-health ally within ${yd(a.range)} yd who doesn't have Renew for ${int(e.amount)} ` +
        `every ${sec(e.interval)} sec for ${sec(e.duration)} sec, ${int(periodicTotal(e))} in all.`
      )
    },
  },
  talents: [
    talent({
      id: 'verdant',
      name: 'Verdant',
      row: 0,
      col: 0,
      per: [6, 12, 18],
      text: 'Your heal-over-time effects heal {}% more.',
      does: (v) => [more('amount', 'hot', v)],
    }),
    talent({
      id: 'lasting-roots',
      name: 'Lasting Roots',
      row: 0,
      col: 1,
      per: [1, 2, 3],
      text: 'Your heal-over-time effects last {} sec longer.',
      does: (v) => [plus('duration', 'hot', v)],
    }),
    talent({
      id: 'quickening',
      name: 'Quickening',
      row: 0,
      col: 2,
      per: [10, 20],
      text: 'Your heal-over-time effects tick {}% faster.',
      does: (v) => [more('tickRate', 'hot', v)],
    }),
    talent({
      id: 'budding',
      name: 'Budding',
      row: 1,
      col: 1,
      requires: 'lasting-roots',
      text: 'Your heal-over-time effects heal once the moment they land.',
      does: () => [plus('instantTicks', 'hot', 1)],
    }),
    talent({
      id: 'frugal-renewal',
      name: 'Frugal Renewal',
      row: 1,
      col: 3,
      per: [15, 30],
      text: 'Your heal-over-time spells cost {}% less.',
      does: (v) => [more('cost', 'hot', -v)],
    }),
    talent({
      id: 'twin-renewal',
      name: 'Twin Renewal',
      row: 2,
      col: 0,
      per: [15, 30, 45],
      text: 'Renew has a {}% chance to land on a second injured ally too.',
      does: (v) => [proc('cast', 'renew', [{ do: 'recast' }], { chance: v })],
    }),
    talent({
      id: 'overgrowth',
      name: 'Overgrowth',
      row: 2,
      col: 2,
      per: [10, 20, 30],
      text: 'Your heal-over-time effects heal {}% more on allies below 50% health.',
      does: (v) => [more('amount', 'hot', v, { targetBelow: 50 })],
    }),
    talent({
      id: 'wandering-seed',
      name: 'Wandering Seed',
      row: 3,
      col: 0,
      requires: 'twin-renewal',
      text: "When Renew ends, it jumps to the most injured ally within 20 yd who doesn't have it (once).",
      does: () => [proc('expire', 'renew', [{ do: 'jump', range: 20 }])],
    }),
    talent({
      id: 'harmony',
      name: 'Harmony',
      row: 3,
      col: 2,
      requires: 'overgrowth',
      per: [5, 10, 15],
      text: 'Your direct heals heal {}% more on allies with one of your heal-over-time effects.',
      does: (v) => [more('amount', 'direct-heal', v, { targetHas: 'hot' })],
    }),
  ],
}

// ---------- Bloom: spends resource to burst everyone your HoTs and zones touch ----------

export const bloom: TreeDef = {
  ...healer,
  id: 'bloom',
  color: '#f2a7cf',
  ability: {
    name: 'Bloom',
    castTime: 'Instant',
    range: '40 range',
    cooldown: '8 sec cooldown',
    description:
      'Make your healing bloom: every ally with one of your heal-over-time effects, or standing in one of your zones, is healed. Costs more for each ally.',
  },
  spec: {
    cost: 60,
    cooldown: 8,
    range: 40,
    effects: [{ type: 'bloom', amount: 900, extraCost: 30, target: 'all' }],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Heals every ally within ${yd(a.range)} yd who has one of your heal-over-time effects or stands in one of ` +
        `your zones for ${int(e.amount)}. Costs ${int(e.extraCost)} more ${a.resource} for each ally healed, most injured first.`
      )
    },
  },
  talents: [
    talent({
      id: 'full-bloom',
      name: 'Full Bloom',
      row: 0,
      col: 0,
      per: [6, 12, 18],
      text: 'All your healing is {}% stronger on allies who have one of your heal-over-time effects or stand in one of your zones.',
      does: (v) => [more('amount', 'healing', v, { affected: true })],
    }),
    talent({
      id: 'thrifty-bloom',
      name: 'Thrifty Bloom',
      row: 0,
      col: 1,
      per: [33, 66],
      text: "Bloom's extra cost for each ally healed is {}% lower.",
      does: (v) => [more('extraCost', 'bloom', -v)],
    }),
    talent({
      id: 'quick-bloom',
      name: 'Quick Bloom',
      row: 0,
      col: 2,
      per: [1, 2],
      text: "Bloom's cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'bloom', -v)],
    }),
    talent({
      id: 'nurture',
      name: 'Nurture',
      row: 1,
      col: 0,
      per: [10, 20, 30],
      text: 'Bloom heals {}% more on allies who have one of your heal-over-time effects and stand in one of your zones.',
      does: (v) => [more('amount', 'bloom', v, { targetHas: 'hot', inZone: true })],
    }),
    talent({
      id: 'rekindle',
      name: 'Rekindle',
      row: 1,
      col: 2,
      per: [1, 2],
      text: 'Bloom adds {} sec to your heal-over-time effects on each ally it heals.',
      does: (v) => [proc('heal', 'bloom', [{ do: 'extend', match: 'hot', seconds: v, scope: 'event' }])],
    }),
    talent({
      id: 'ripening',
      name: 'Ripening',
      row: 1,
      col: 3,
      per: [0.5, 1],
      text: "Each critical heal from your heal-over-time effects takes {} sec off Bloom's cooldown.",
      does: (v) => [proc('crit', 'hot', [cooldown('bloom', v)])],
    }),
    talent({
      id: 'burst-of-life',
      name: 'Burst of Life',
      row: 2,
      col: 1,
      text: 'Bloom also heals for 2 sec worth of your heal-over-time effects on each ally it heals, right away.',
      does: () => [proc('heal', 'bloom', [{ do: 'pulse', match: 'hot', seconds: 2 }])],
    }),
    talent({
      id: 'zone-surge',
      name: 'Zone Surge',
      row: 2,
      col: 3,
      text: 'Bloom makes each of your zones heal everyone inside for 2 sec worth of healing, right away.',
      does: () => [proc('cast', 'bloom', [{ do: 'pulse', match: 'zone', seconds: 2 }])],
    }),
    talent({
      id: 'everblossom',
      name: 'Everblossom',
      row: 3,
      col: 0,
      requires: 'nurture',
      per: [10, 20, 30],
      text: 'Bloom has a {}% chance not to go on cooldown.',
      does: (v) => [proc('cast', 'bloom', [cooldown('bloom', Infinity)], { chance: v })],
    }),
    talent({
      id: 'petal-shield',
      name: 'Petal Shield',
      row: 3,
      col: 2,
      requires: 'rekindle',
      per: [20, 40],
      text: 'Bloom shields each ally it heals for {}% of the healing, for 6 sec.',
      does: (v) => [
        proc('heal', 'bloom', [apply(shield(0, 6, 'event', { name: 'Petal Shield' }), { pct: v, of: 'amount' })]),
      ],
    }),
  ],
}

// ---------- Conduit: passive, your main attack heals ----------

export const conduit: TreeDef = {
  ...healer,
  id: 'conduit',
  color: '#ffd23f',
  ability: {
    name: 'Conduit',
    castTime: 'Passive',
    range: '40 range',
    description: 'Passive. Whenever your main attack hits, the lowest-health ally is healed as well.',
  },
  spec: {
    range: 40,
    passive: { on: 'hit', match: 'main-attack' },
    effects: [{ type: 'chain', amount: 250, bounces: 0, falloff: 20, radius: 10, target: 'lowest', tags: ['chain'] }],
    text: (a) => {
      const e = a.effects[0]
      const who = e.targets > 1 ? `the ${e.targets} lowest-health allies` : 'the lowest-health ally'
      const jumps =
        e.bounces > 0
          ? ` It then jumps up to ${e.bounces} times to allies within ${yd(e.radius)} yd, ${pct(e.falloff)}% less each jump.`
          : ''
      return `Passive. Whenever your main attack hits, ${who} within ${yd(a.range)} yd is healed for ${int(e.amount)}.${jumps}`
    },
  },
  talents: [
    talent({
      id: 'strong-current',
      name: 'Strong Current',
      row: 0,
      col: 0,
      per: [4, 8, 12],
      text: 'Your direct heals heal {}% more.',
      does: (v) => [more('amount', 'direct-heal', v)],
    }),
    talent({
      id: 'grounded',
      name: 'Grounded',
      row: 0,
      col: 2,
      per: [15, 30],
      text: 'Conduit heals {}% more on allies standing in your zones.',
      does: (v) => [more('amount', 'conduit', v, { inZone: true })],
    }),
    talent({
      id: 'siphon',
      name: 'Siphon',
      row: 0,
      col: 3,
      per: [0.3, 0.6],
      text: 'When Conduit heals an ally below 50% health, you get {}% of your maximum @resource back.',
      does: (v) => [proc('heal', { all: ['conduit', 'direct-heal'] }, [restoreShare(v)], { when: { targetBelow: 50 } })],
    }),
    talent({
      id: 'latent-charge',
      name: 'Latent Charge',
      row: 1,
      col: 0,
      requires: 'strong-current',
      per: [5, 10],
      text:
        'Each main attack hit that fires Conduit gives you a stack of Latent Charge, up to 5. The next direct heal ' +
        'you cast uses them all and heals {}% more per stack.',
      does: (v) => [
        proc('hit', 'main-attack', [
          buff({
            id: 'latent-charge',
            name: 'Latent Charge',
            duration: 15,
            maxStacks: 5,
            mods: [more('amount', 'direct-heal', v)],
            consumeOn: 'direct-heal',
          }),
        ]),
      ],
    }),
    talent({
      id: 'split-current',
      name: 'Split Current',
      row: 1,
      col: 1,
      per: [1, 2],
      text: 'Conduit heals {} more allies.',
      does: (v) => [plus('targets', 'conduit', v)],
    }),
    talent({
      id: 'quickened-bolts',
      name: 'Quickened Bolts',
      row: 2,
      col: 1,
      per: [0.1, 0.2],
      text: "Your main attack's global cooldown is {} sec shorter.",
      does: (v) => [plus('gcd', 'main-attack', -v)],
    }),
    talent({
      id: 'feedback',
      name: 'Feedback',
      row: 2,
      col: 3,
      requires: 'siphon',
      per: [10, 20],
      text: 'When Conduit critically heals, your next heal costs {}% less.',
      does: (v) => [
        proc('crit', 'conduit', [
          buff({
            id: 'feedback',
            name: 'Feedback',
            duration: 10,
            mods: [more('cost', 'healing', -v)],
            consumeOn: 'healing',
          }),
        ]),
      ],
    }),
    talent({
      id: 'overdrive',
      name: 'Overdrive',
      row: 3,
      col: 0,
      requires: 'latent-charge',
      text: 'Your spells cost 100% more @resource and heal 60% more.',
      does: () => [more('cost', 'spell', 100), more('amount', { all: ['spell', 'healing'] }, 60)],
    }),
    talent({
      id: 'arc-conduit',
      name: 'Arc Conduit',
      row: 3,
      col: 1,
      requires: 'quickened-bolts',
      text: "Conduit's heal jumps to 2 more allies within 10 yd, healing 20% less each jump.",
      does: () => [plus('bounces', 'conduit', 2)],
    }),
    talent({
      id: 'overload',
      name: 'Overload',
      row: 3,
      col: 2,
      per: [10, 20, 30],
      text: 'Your main attack has a {}% chance to fire Conduit twice.',
      does: (v) => [proc('hit', 'main-attack', [{ do: 'fire', ability: 'conduit' }], { chance: v })],
    }),
  ],
}
