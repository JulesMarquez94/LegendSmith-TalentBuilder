import { counted, int, sec, yd } from '../game/format.ts'
import { periodicTotal } from '../game/resolve.ts'
import type { TreeDef } from '../talents/types.ts'
import {
  apply,
  buff,
  cooldown,
  damage,
  dot,
  hostileZone,
  more,
  plus,
  proc,
  refund,
  restoreShare,
  spread,
  talent,
} from './authoring.ts'

// The bow's shots. They shoot arrows, so they need a bow; any bow can make them. Costs are in points
// (Aimed Shot's 3 is 30 focus), and their talents aim only at themselves or at families (direct
// damage, area damage, DoTs, zones) and give resource back as a share.

const archery = {
  role: 'damage',
  kind: 'damage',
  madeFor: 'ashwood-longbow',
  needs: 'bow',
  columns: 4,
  pointsPerRow: 2,
} as const

// ---------- Aimed Shot: a slow, heavy shot ----------

export const aimedShot: TreeDef = {
  ...archery,
  id: 'aimed-shot',
  color: '#e0c96f',
  ability: {
    name: 'Aimed Shot',
    castTime: '2 sec cast',
    range: '40 range',
    description: 'Take careful aim, then shoot the enemy nearest your crosshair for heavy damage.',
  },
  spec: {
    cost: 3,
    castTime: 2,
    range: 40,
    effects: [damage(950)],
    text: (a) => {
      const e = a.effects[0]
      // Trick Shot gives it a radius.
      const splash = e.radius > 0 ? ` Every enemy within ${yd(e.radius)} yd of it is hit too.` : ''
      return (
        `Takes careful aim, then shoots the enemy nearest your crosshair within ${yd(a.range)} yd for ` +
        `${int(e.amount)} damage.${splash} Costs ${counted(a.cost, a.resource)}.`
      )
    },
  },
  talents: [
    talent({
      id: 'heavy-draw',
      name: 'Heavy Draw',
      row: 0,
      col: 0,
      per: [6, 12, 18],
      text: 'Your direct damage deals {}% more.',
      does: (v) => [more('amount', 'direct-damage', v)],
    }),
    talent({
      id: 'hunters-patience',
      name: "Hunter's Patience",
      row: 0,
      col: 3,
      per: [15, 30],
      text: 'Your direct damage crits for {}% more.',
      does: (v) => [plus('critDamage', 'direct-damage', v)],
    }),
    talent({
      id: 'sharpshooter',
      name: 'Sharpshooter',
      row: 1,
      col: 0,
      requires: 'heavy-draw',
      per: [10, 20],
      text: 'Aimed Shot has +{}% critical chance.',
      does: (v) => [plus('critChance', 'aimed-shot', v)],
    }),
    talent({
      id: 'trick-shot',
      name: 'Trick Shot',
      row: 1,
      col: 2,
      per: [3, 6],
      text: 'Aimed Shot also hits every enemy within {} yd of its target.',
      does: (v) => [plus('radius', 'aimed-shot', v)],
    }),
    talent({
      id: 'calm-breath',
      name: 'Calm Breath',
      row: 1,
      col: 3,
      per: [25, 50],
      text: 'When Aimed Shot critically strikes, it gives back {}% of its cost.',
      does: (v) => [proc('crit', { all: ['aimed-shot', 'direct-damage'] }, [refund(v)])],
    }),
    talent({
      id: 'deep-wound',
      name: 'Deep Wound',
      row: 2,
      col: 1,
      text: 'Aimed Shot leaves a wound on every enemy it hits: 50 damage every sec for 8 sec.',
      does: () => [
        proc('hit', { all: ['aimed-shot', 'direct-damage'] }, [apply(dot(50, 8, 1, 'event', { name: 'Deep Wound' }))]),
      ],
    }),
    talent({
      id: 'double-tap',
      name: 'Double Tap',
      row: 2,
      col: 3,
      per: [10, 20],
      text: 'Aimed Shot has a {}% chance to fire a second arrow, for free.',
      does: (v) => [plus('echo', 'aimed-shot', v)],
    }),
    talent({
      id: 'lethal-aim',
      name: 'Lethal Aim',
      row: 3,
      col: 1,
      requires: 'sharpshooter',
      per: [25, 50],
      text: "Aimed Shot's critical hits deal {}% more.",
      does: (v) => [plus('critDamage', 'aimed-shot', v)],
    }),
    talent({
      id: 'follow-up-shot',
      name: 'Follow-Up Shot',
      row: 3,
      col: 3,
      requires: 'double-tap',
      per: [25, 50],
      text: 'After Aimed Shot, your next ability costs {}% less.',
      does: (v) => [
        proc('cast', 'aimed-shot', [
          buff({
            id: 'follow-up-shot',
            name: 'Follow-Up Shot',
            duration: 10,
            mods: [more('cost', 'spell', -v)],
            consumeOn: 'spell',
          }),
        ]),
      ],
    }),
  ],
}

// ---------- Multi-Shot: a spread of arrows at a group ----------

export const multiShot: TreeDef = {
  ...archery,
  id: 'multi-shot',
  color: '#8fd3ff',
  ability: {
    name: 'Multi-Shot',
    castTime: 'Instant',
    range: '40 range',
    description: 'Shoot a spread of arrows at an enemy, hitting it and every enemy around it.',
  },
  spec: {
    cost: 2,
    range: 40,
    effects: [damage(280, 'target', { radius: 8 })],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Shoots a spread of arrows at the enemy nearest your crosshair within ${yd(a.range)} yd: it and every enemy ` +
        `within ${yd(e.radius)} yd of it take ${int(e.amount)} damage. Costs ${counted(a.cost, a.resource)}.`
      )
    },
  },
  talents: [
    talent({
      id: 'splitting-tips',
      name: 'Splitting Tips',
      row: 0,
      col: 0,
      per: [6, 12, 18],
      text: 'Your area damage deals {}% more.',
      does: (v) => [more('amount', 'aoe', v)],
    }),
    talent({
      id: 'true-fletching',
      name: 'True Fletching',
      row: 0,
      col: 3,
      per: [5, 10],
      text: 'Your area damage has +{}% critical chance.',
      does: (v) => [plus('critChance', 'aoe', v)],
    }),
    talent({
      id: 'light-quiver',
      name: 'Light Quiver',
      row: 1,
      col: 0,
      requires: 'splitting-tips',
      per: [15, 30],
      text: 'Multi-Shot costs {}% less.',
      does: (v) => [more('cost', 'multi-shot', -v)],
    }),
    talent({
      id: 'ricochet',
      name: 'Ricochet',
      row: 1,
      col: 2,
      per: [1, 2],
      text: 'Each enemy Multi-Shot hits gives you back {}% of your maximum @resource.',
      does: (v) => [proc('hit', { all: ['multi-shot', 'direct-damage'] }, [restoreShare(v)])],
    }),
    talent({
      id: 'hail-of-arrows',
      name: 'Hail of Arrows',
      row: 1,
      col: 3,
      per: [15, 30],
      text: 'Multi-Shot has a {}% chance to be shot a second time, for free.',
      does: (v) => [plus('echo', 'multi-shot', v)],
    }),
    talent({
      id: 'barbed-spread',
      name: 'Barbed Spread',
      row: 2,
      col: 1,
      text: 'Multi-Shot leaves a bleed on every enemy it hits: 30 damage every sec for 6 sec.',
      does: () => [
        proc('hit', { all: ['multi-shot', 'direct-damage'] }, [apply(dot(30, 6, 1, 'event', { name: 'Barbed Spread' }))]),
      ],
    }),
    talent({
      id: 'quickened-volley',
      name: 'Quickened Volley',
      row: 2,
      col: 3,
      per: [0.2, 0.4],
      text: "Each critical hit from your area damage takes {} sec off your damage abilities' cooldowns.",
      does: (v) => [proc('crit', 'aoe', [cooldown('damage', v)])],
    }),
    talent({
      id: 'splinter',
      name: 'Splinter',
      row: 3,
      col: 1,
      requires: 'barbed-spread',
      text: 'When your area damage critically strikes, your damage-over-time effects on that enemy deal 2 sec worth at once.',
      does: () => [proc('crit', 'aoe', [{ do: 'pulse', match: 'dot', seconds: 2 }])],
    }),
    talent({
      id: 'arrowstorm',
      name: 'Arrowstorm',
      row: 3,
      col: 3,
      requires: 'hail-of-arrows',
      per: [25, 50],
      text: 'Multi-Shot has a {}% chance to make your next Multi-Shot free.',
      does: (v) => [
        proc(
          'cast',
          'multi-shot',
          [
            buff({
              id: 'arrowstorm',
              name: 'Arrowstorm',
              duration: 10,
              mods: [more('cost', 'multi-shot', -100)],
              consumeOn: 'multi-shot',
            }),
          ],
          { chance: v },
        ),
      ],
    }),
  ],
}

// ---------- Poison Arrow: a long damage over time ----------

export const poisonArrow: TreeDef = {
  ...archery,
  id: 'poison-arrow',
  color: '#9ccc65',
  ability: {
    name: 'Poison Arrow',
    castTime: 'Instant',
    range: '40 range',
    description: 'Shoot a poisoned arrow that hurts its target over time.',
  },
  spec: {
    cost: 1,
    range: 40,
    effects: [dot(70, 15, 1, 'target', { name: 'Poison Arrow' })],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Shoots a poisoned arrow at the enemy nearest your crosshair within ${yd(a.range)} yd: ${int(e.amount)} damage ` +
        `every ${sec(e.interval)} sec for ${sec(e.duration)} sec, ${int(periodicTotal(e))} in all. ` +
        `Costs ${counted(a.cost, a.resource)}.`
      )
    },
  },
  talents: [
    talent({
      id: 'potent-venom',
      name: 'Potent Venom',
      row: 0,
      col: 0,
      per: [6, 12, 18],
      text: 'Your damage-over-time effects deal {}% more damage.',
      does: (v) => [more('amount', 'dot', v)],
    }),
    talent({
      id: 'quick-venom',
      name: 'Quick Venom',
      row: 0,
      col: 3,
      per: [10, 20],
      text: 'Your damage-over-time effects tick {}% faster.',
      does: (v) => [more('tickRate', 'dot', v)],
    }),
    talent({
      id: 'toxic-buildup',
      name: 'Toxic Buildup',
      row: 1,
      col: 0,
      requires: 'potent-venom',
      per: [3, 6],
      text: 'Enemies take {}% more damage from you for each of your damage-over-time effects on them.',
      does: (v) => [more('amount', 'damage', v, { each: 'dot' })],
    }),
    talent({
      id: 'spreading-venom',
      name: 'Spreading Venom',
      row: 1,
      col: 2,
      per: [5, 10],
      text: "Each tick of Poison Arrow has a {}% chance to copy it to the nearest enemy within 8 yd that doesn't have it.",
      does: (v) => [proc('hit', { all: ['poison-arrow', 'dot'] }, [spread('poison-arrow', 8)], { chance: v })],
    }),
    talent({
      id: 'venom-siphon',
      name: 'Venom Siphon',
      row: 1,
      col: 3,
      per: [0.5, 1],
      text: 'Each tick of Poison Arrow gives you back {}% of your maximum @resource.',
      does: (v) => [proc('hit', { all: ['poison-arrow', 'dot'] }, [restoreShare(v)])],
    }),
    talent({
      id: 'neurotoxin',
      name: 'Neurotoxin',
      row: 2,
      col: 1,
      per: [10, 20],
      text: "Poison Arrow's ticks have +{}% critical chance.",
      does: (v) => [plus('critChance', 'poison-arrow', v)],
    }),
    talent({
      id: 'virulent-burst',
      name: 'Virulent Burst',
      row: 2,
      col: 3,
      text: 'When Poison Arrow ends, its target takes 5 sec worth of its damage at once.',
      does: () => [proc('expire', 'poison-arrow', [{ do: 'burst', seconds: 5 }])],
    }),
    talent({
      id: 'lethal-dose',
      name: 'Lethal Dose',
      row: 3,
      col: 1,
      requires: 'neurotoxin',
      per: [1, 2],
      text: 'Your direct damage makes your damage-over-time effects on its target deal {} sec worth at once.',
      does: (v) => [proc('hit', 'direct-damage', [{ do: 'pulse', match: 'dot', seconds: v }])],
    }),
    talent({
      id: 'venom-coat',
      name: 'Venom Coat',
      row: 3,
      col: 3,
      requires: 'virulent-burst',
      per: [10, 20],
      text: 'Your direct damage has a {}% chance to put Poison Arrow on its target, for free.',
      does: (v) => [proc('hit', 'direct-damage', [{ do: 'fire', ability: 'poison-arrow', at: 'event' }], { chance: v })],
    }),
  ],
}

// ---------- Rain of Arrows: a short, dense volley on an area ----------

export const rainOfArrows: TreeDef = {
  ...archery,
  id: 'rain-of-arrows',
  color: '#c0a36e',
  ability: {
    name: 'Rain of Arrows',
    castTime: 'Instant',
    range: '40 range',
    cooldown: '20 sec cooldown',
    description: 'Fill the sky above an enemy with arrows, hurting everyone under them.',
  },
  spec: {
    cost: 3,
    cooldown: 20,
    range: 40,
    effects: [hostileZone(130, 6, 0.5, 10, { name: 'Rain of Arrows' })],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Rains arrows on a ${yd(e.radius)} yd area around the enemy nearest your crosshair for ${sec(e.duration)} sec. ` +
        `Every enemy inside takes ${int(e.amount)} damage every ${sec(e.interval)} sec. Costs ${counted(a.cost, a.resource)}.`
      )
    },
  },
  talents: [
    talent({
      id: 'heavy-rain',
      name: 'Heavy Rain',
      row: 0,
      col: 0,
      per: [6, 12, 18],
      text: 'Your zones deal {}% more damage.',
      does: (v) => [more('amount', { all: ['zone', 'damage'] }, v)],
    }),
    talent({
      id: 'wide-barrage',
      name: 'Wide Barrage',
      row: 0,
      col: 1,
      per: [2, 4],
      text: 'Your zones are {} yd wider.',
      does: (v) => [plus('radius', 'zone', v)],
    }),
    talent({
      id: 'quick-nock',
      name: 'Quick Nock',
      row: 0,
      col: 3,
      per: [3, 6],
      text: "Rain of Arrows' cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'rain-of-arrows', -v)],
    }),
    talent({
      id: 'pinned-down',
      name: 'Pinned Down',
      row: 1,
      col: 2,
      per: [6, 12],
      text: 'Enemies standing in your zones take {}% more damage from you.',
      does: (v) => [more('amount', 'damage', v, { inZone: true })],
    }),
    talent({
      id: 'arrow-recovery',
      name: 'Arrow Recovery',
      row: 1,
      col: 3,
      requires: 'quick-nock',
      per: [5, 10],
      text: "Each Rain of Arrows tick has a {}% chance to take 1 sec off Rain of Arrows' cooldown.",
      does: (v) => [proc('tick', 'rain-of-arrows', [cooldown('rain-of-arrows', 1)], { chance: v })],
    }),
    talent({
      id: 'twin-volleys',
      name: 'Twin Volleys',
      row: 2,
      col: 1,
      text: 'Rain of Arrows holds 2 charges.',
      does: () => [plus('charges', 'rain-of-arrows', 1)],
    }),
    talent({
      id: 'piercing-rain',
      name: 'Piercing Rain',
      row: 2,
      col: 3,
      per: [5, 10, 15],
      text: "Your zones' damage has +{}% critical chance.",
      does: (v) => [plus('critChance', { all: ['zone', 'damage'] }, v)],
    }),
    talent({
      id: 'cloudburst',
      name: 'Cloudburst',
      row: 3,
      col: 1,
      requires: 'twin-volleys',
      text: 'Rain of Arrows deals 4% more damage with every tick.',
      does: () => [plus('growth', 'rain-of-arrows', 4)],
    }),
    talent({
      id: 'last-volley',
      name: 'Last Volley',
      row: 3,
      col: 3,
      requires: 'piercing-rain',
      per: [1, 2],
      text: 'When one of your damaging zones ends, everyone inside takes {} sec worth of its damage at once.',
      does: (v) => [proc('expire', { all: ['zone', 'damage'] }, [{ do: 'burst', seconds: v }])],
    }),
  ],
}
