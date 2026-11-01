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

/** Mend's heal before talents: Echoing Mend's second heal is a share of it. */
const MEND = 2400

export const mend: TreeDef = {
  ...healer,
  id: 'mend',
  reviewed: true,
  color: '#8fe3a0',
  ability: {
    name: 'Mend',
    castTime: '2 sec cast',
    range: '40 range',
    description: 'Heal the lowest-health ally in range for a large amount.',
  },
  spec: {
    cost: 130,
    castTime: 2,
    range: 40,
    effects: [heal(MEND)],
    text: (a) => {
      const echo = a.effects[1] ? ` Then heals the next most injured ally for ${int(a.effects[1].amount)}.` : ''
      return `Heals the lowest-health ally within ${yd(a.range)} yd for ${int(a.effects[0].amount)}.${echo}`
    },
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
      text: 'Mend casts {} sec faster.',
      does: (v) => [plus('castTime', 'mend', -v)],
    }),
    talent({
      id: 'triage',
      name: 'Triage',
      row: 0,
      col: 3,
      per: [25, 50],
      text: "Mend heals up to {}% more the lower its target's health: all of it on an ally near death.",
      does: (v) => [more('amount', 'mend', v, { missing: true })],
    }),
    talent({
      id: 'echoing-mend',
      name: 'Echoing Mend',
      row: 1,
      col: 0,
      requires: 'greater-mend',
      per: [20, 40],
      text: 'Mend also heals the next most injured ally for {}% as much.',
      does: (v) => [grant('mend', heal((MEND * v) / 100, 'next-lowest', { name: 'Echoing Mend' }))],
    }),
    talent({
      id: 'surge-of-light',
      name: 'Surge of Light',
      row: 1,
      col: 1,
      requires: 'swift-hands',
      per: [5, 10],
      text: 'Whenever you heal, a {}% chance that your next Mend is instant and free. At most once every 15 sec.',
      does: (v) => [
        proc(
          'heal',
          'healing',
          [
            buff({
              id: 'surge-of-light',
              name: 'Surge of Light',
              duration: 15,
              mods: [more('castTime', 'mend', -100), more('cost', 'mend', -100)],
              consumeOn: 'mend',
            }),
          ],
          { chance: v, cooldown: 15 },
        ),
      ],
    }),
    talent({
      id: 'nurturing-mend',
      name: 'Nurturing Mend',
      row: 1,
      col: 3,
      per: [10, 20],
      text: 'Mend heals {}% more on an ally with your heal-over-time effect or standing in your healing zone.',
      does: (v) => [more('amount', 'mend', v, { affected: true })],
    }),
    talent({
      id: 'mending-ward',
      name: 'Mending Ward',
      row: 2,
      col: 0,
      per: [50, 100],
      text: "{}% of Mend's overhealing becomes a shield on the target for 12 sec, up to 20% of their maximum health.",
      does: (v) => [
        proc('heal', 'mend', [apply(shield(0, 12, 'event', { name: 'Mending Ward', maxShare: 20 }), { pct: v, of: 'overheal' })], {
          when: { overheal: true },
        }),
      ],
    }),
    talent({
      id: 'empowered-mend',
      name: 'Empowered Mend',
      row: 2,
      col: 2,
      per: [20, 40],
      text: 'Mend costs {}% more and heals {}% more.',
      does: (v) => [more('cost', 'mend', v), more('amount', 'mend', v)],
    }),
    talent({
      id: 'lifeline',
      name: 'Lifeline',
      row: 3,
      col: 1,
      requires: 'surge-of-light',
      text:
        'When you or an ally drops below 15% health, you cast Mend on them at once: free, instant and off the global ' +
        'cooldown. Once every 45 sec.',
      does: () => [proc('lowHealth', 'low-health', [{ do: 'fire', ability: 'mend', at: 'event' }], { cooldown: 45 })],
    }),
  ],
}

// ---------- Chain Heal: direct heal that jumps ----------

export const chainHeal: TreeDef = {
  ...healer,
  id: 'chain-heal',
  reviewed: true,
  color: '#5fd4c4',
  ability: {
    name: 'Chain Heal',
    castTime: '2 sec cast',
    range: '40 range',
    cooldown: '6 sec cooldown',
    description: 'Heal the lowest-health ally, then jump to 2 more, healing 25% less with each jump.',
  },
  spec: {
    cost: 160,
    castTime: 2,
    cooldown: 6,
    range: 40,
    effects: [{ type: 'chain', amount: 1900, bounces: 2, falloff: 25, radius: 12, target: 'lowest', tags: ['chain'] }],
    text: (a) => {
      const e = a.effects[0]
      const web = e.hotJumps > 0 ? ' Then it jumps on to every ally with your heal-over-time effect.' : ''
      return (
        `Heals the lowest-health ally within ${yd(a.range)} yd for ${int(e.amount)}, then jumps to the next most ` +
        `injured ally within ${yd(e.radius)} yd, up to ${e.bounces} times. Each jump heals ${pct(e.falloff)}% less.${web}`
      )
    },
  },
  talents: [
    talent({
      id: 'potent-current',
      name: 'Potent Current',
      row: 0,
      col: 0,
      per: [8, 16, 24],
      text: 'Your direct heals heal {}% more.',
      does: (v) => [more('amount', 'direct-heal', v)],
    }),
    talent({
      id: 'swift-current',
      name: 'Swift Current',
      row: 0,
      col: 1,
      per: [0.25, 0.5],
      text: 'Chain Heal casts {} sec faster.',
      does: (v) => [plus('castTime', 'chain-heal', -v)],
    }),
    talent({
      id: 'extra-link',
      name: 'Extra Link',
      row: 0,
      col: 3,
      text: 'Chain Heal jumps to 1 more ally.',
      does: () => [plus('bounces', 'chain-heal', 1)],
    }),
    talent({
      id: 'strong-links',
      name: 'Strong Links',
      row: 1,
      col: 0,
      per: [5, 10, 15],
      text: 'Chain Heal loses {}% less healing per jump, however far it jumps.',
      does: (v) => [plus('falloff', 'chain-heal', -v)],
    }),
    talent({
      id: 'quick-tide',
      name: 'Quick Tide',
      row: 1,
      col: 1,
      per: [1, 2],
      text: "Chain Heal's cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'chain-heal', -v)],
    }),
    talent({
      id: 'flowing-current',
      name: 'Flowing Current',
      row: 1,
      col: 2,
      per: [1, 2, 3],
      text: 'Each Chain Heal heal that crits gives back {}% of your maximum @resource.',
      does: (v) => [proc('crit', 'chain-heal', [restoreShare(v)])],
    }),
    talent({
      id: 'twin-currents',
      name: 'Twin Currents',
      row: 2,
      col: 1,
      requires: 'quick-tide',
      text: 'Chain Heal holds 2 charges, but its cooldown is 2 sec longer.',
      does: () => [plus('charges', 'chain-heal', 1), plus('cooldown', 'chain-heal', 2)],
    }),
    talent({
      id: 'tidal-web',
      name: 'Tidal Web',
      row: 2,
      col: 3,
      requires: 'extra-link',
      text: 'After its jumps, Chain Heal keeps jumping to every ally with your heal-over-time effect.',
      does: () => [plus('hotJumps', 'chain-heal', 1)],
    }),
    talent({
      id: 'chain-reaction',
      name: 'Chain Reaction',
      row: 3,
      col: 2,
      requires: 'flowing-current',
      per: [25, 50],
      text:
        'When a Chain Heal heal crits, a {}% chance that a second chain starts out of that ally once the first is ' +
        'done. At most one more chain per cast.',
      does: (v) => [plus('rechain', 'chain-heal', v)],
    }),
  ],
}

// ---------- Healing Rain: zone ----------

export const healingRain: TreeDef = {
  ...healer,
  id: 'healing-rain',
  reviewed: true,
  color: '#8cc8ff',
  ability: {
    name: 'Healing Rain',
    castTime: 'Instant',
    range: '40 range',
    cooldown: '10 sec cooldown',
    description: 'Rain light around the lowest-health ally for 10 sec, healing everyone within 12 yd every second.',
  },
  spec: {
    cost: 200,
    cooldown: 10,
    range: 40,
    // Rains can overlap: an ally under two is healed by both.
    effects: [zone(220, 10, 1, 12, 'lowest')],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Rains light around the lowest-health ally within ${yd(a.range)} yd for ${sec(e.duration)} sec. Every ally ` +
        `within ${yd(e.radius)} yd of it is healed for ${int(e.amount)} every ${sec(e.interval)} sec. Rains can overlap.` +
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
      per: [8, 16, 24],
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
      id: 'rain-soaked',
      name: 'Rain-Soaked',
      row: 1,
      col: 0,
      requires: 'downpour',
      text: 'Your direct heals on an ally standing in your healing zone get your zones\' healing bonus too.',
      does: () => [{ kind: 'mod', key: 'amount', match: 'direct-heal', when: { inZone: true }, pctOfTags: ['zone'] }],
    }),
    talent({
      id: 'anchored-storm',
      name: 'Anchored Storm',
      row: 1,
      col: 1,
      requires: 'wide-clouds',
      text: 'Healing Rain follows the ally it was placed on.',
      does: () => [plus('follow', 'healing-rain', 1)],
    }),
    talent({
      id: 'downburst',
      name: 'Downburst',
      row: 1,
      col: 2,
      per: [800, 1600],
      text: 'When placed, Healing Rain heals for {} more, shared out among the injured allies inside it.',
      does: (v) => [plus('opening', 'healing-rain', v)],
    }),
    talent({
      id: 'storm-caller',
      name: 'Storm Caller',
      row: 1,
      col: 3,
      per: [0.25, 0.5],
      text: "Each of your direct heals takes {} sec off Healing Rain's cooldown.",
      does: (v) => [proc('heal', 'direct-heal', [cooldown('healing-rain', v)])],
    }),
    talent({
      id: 'overflowing-rain',
      name: 'Overflowing Rain',
      row: 2,
      col: 0,
      per: [50, 100],
      text:
        "{}% of Healing Rain's overhealing becomes a shield on that ally for 10 sec. It stacks, up to 20% of " +
        'their maximum health.',
      does: (v) => [
        proc('heal', 'healing-rain', [apply(shield(0, 10, 'event', { name: 'Overflowing Rain', maxShare: 20 }), { pct: v, of: 'overheal' })], {
          when: { overheal: true },
        }),
      ],
    }),
    talent({
      id: 'swelling-rain',
      name: 'Swelling Rain',
      row: 2,
      col: 2,
      per: [2.5, 5],
      text: 'Each second an ally spends in Healing Rain, it heals them {}% more, up to 10 times.',
      does: (v) => [plus('swell', 'healing-rain', v)],
    }),
    talent({
      id: 'siphoning-storm',
      name: 'Siphoning Storm',
      row: 3,
      col: 3,
      requires: 'storm-caller',
      text:
        'Every second, Healing Rain takes 1 sec from one of your heal-over-time effects on an ally inside it and ' +
        'lasts that much longer, up to twice its duration.',
      does: () => [proc('tick', 'healing-rain', [{ do: 'siphon', match: 'hot', seconds: 1, capPct: 100 }])],
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
      per: [1.5, 3],
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
      per: [15, 30],
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
      per: [7.5, 15],
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
      per: [15, 30],
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
      per: [6, 12],
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
      per: [15, 30],
      text: 'Your main attack has a {}% chance to fire Conduit twice.',
      does: (v) => [proc('hit', 'main-attack', [{ do: 'fire', ability: 'conduit' }], { chance: v })],
    }),
  ],
}
