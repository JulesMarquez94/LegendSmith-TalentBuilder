import { counted, int, pct, sec, yd } from '../../game/format.ts'
import type { TreeDef } from '../../talents/types.ts'
import {
  apply,
  buff,
  cooldown,
  damage,
  dot,
  more,
  plus,
  proc,
  restoreShare,
  selfBuff,
  shield,
  stat,
  talent,
} from '../authoring.ts'

// FIRST VERSIONS, improvised until the real designs arrive: the tank's role abilities, so a tank's
// three role slots aren't empty. Provoke, Stand Firm and Tremor fit any tank weapon; Shield Block
// needs a shield. Costs are in points, so they mean the same in rage or momentum, and the talents
// aim only at their own ability or at families (shields, area damage), as on every shared tree.

const tank = { role: 'tank', kind: 'tank', columns: 4, pointsPerRow: 2 } as const

/** "You take 40% less damage": a buff effect's damage reduction. */
const reduction = (n: number | undefined) => `${pct(n ?? 0)}%`

// ---------- Provoke: a taunt ----------

export const provoke: TreeDef = {
  ...tank,
  id: 'provoke',
  color: '#ffb347',
  ability: {
    name: 'Provoke',
    castTime: 'Instant',
    range: '30 range',
    cooldown: '8 sec cooldown',
    description: 'Taunt an enemy: it attacks only you for a while.',
  },
  spec: {
    range: 30,
    cooldown: 8,
    gcd: 0,
    effects: [damage(80, 'target', { taunt: 6 })],
    text: (a) => {
      const [hit] = a.effects
      const area = hit.radius > 0 ? ` and every enemy within ${yd(hit.radius)} yd of it` : ''
      return (
        `Taunts the enemy nearest your crosshair within ${yd(a.range)} yd${area}: they take ${int(hit.amount)} damage ` +
        `and attack only you for ${sec(hit.taunt)} sec. Off the global cooldown.`
      )
    },
  },
  talents: [
    // Row 1
    talent({
      id: 'carrying-voice',
      name: 'Carrying Voice',
      row: 0,
      col: 0,
      per: [5, 10, 15],
      text: 'Provoke reaches {} yd farther.',
      does: (v) => [plus('range', 'provoke', v)],
    }),
    talent({
      id: 'quick-temper',
      name: 'Quick Temper',
      row: 0,
      col: 1,
      per: [1, 2, 3],
      text: "Provoke's cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'provoke', -v)],
    }),
    talent({
      id: 'grudge',
      name: 'Grudge',
      row: 0,
      col: 3,
      per: [2, 4, 6],
      text: 'Provoke taunts for {} sec longer.',
      does: (v) => [plus('taunt', 'provoke', v)],
    }),

    // Row 2
    talent({
      id: 'defiance',
      name: 'Defiance',
      row: 1,
      col: 0,
      per: [5, 10],
      text: 'When you cast Provoke, you take {}% less damage for 6 sec.',
      does: (v) => [
        proc('cast', 'provoke', [buff({ id: 'defiance', name: 'Defiance', duration: 6, stats: { damageReduction: v } })]),
      ],
    }),
    talent({
      id: 'challenging-roar',
      name: 'Challenging Roar',
      row: 1,
      col: 2,
      text: 'Provoke also taunts every enemy within 8 yd of its target.',
      does: () => [plus('radius', 'provoke', 8)],
    }),

    // Row 3
    talent({
      id: 'spite',
      name: 'Spite',
      row: 2,
      col: 1,
      per: [10, 20, 30],
      text: 'Provoke gives you {}% of your maximum @resource.',
      does: (v) => [proc('cast', 'provoke', [restoreShare(v)])],
    }),
    talent({
      id: 'brazen',
      name: 'Brazen',
      row: 2,
      col: 3,
      per: [300, 600],
      text: 'When you cast Provoke, you shield yourself for {} for 6 sec.',
      does: (v) => [proc('cast', 'provoke', [apply(shield(v, 6, 'self', { name: 'Brazen' }))])],
    }),

    // Row 4
    talent({
      id: 'bring-it-on',
      name: 'Bring It On',
      row: 3,
      col: 0,
      requires: 'defiance',
      text: 'Provoke holds 2 charges.',
      does: () => [plus('charges', 'provoke', 1)],
    }),
  ],
}

// ---------- Stand Firm: a defensive cooldown ----------

export const standFirm: TreeDef = {
  ...tank,
  id: 'stand-firm',
  color: '#9fb4c8',
  ability: {
    name: 'Stand Firm',
    castTime: 'Instant',
    range: 'Self',
    cooldown: '45 sec cooldown',
    description: 'Brace yourself: you take much less damage for a few seconds.',
  },
  spec: {
    cooldown: 45,
    gcd: 0,
    effects: [selfBuff({ id: 'stand-firm', name: 'Stand Firm', duration: 8, stats: { damageReduction: 40 } })],
    text: (a) => {
      const [brace] = a.effects
      return (
        `You take ${reduction(brace.buff?.stats?.damageReduction)} less damage for ${sec(brace.duration)} sec. ` +
        'Off the global cooldown.'
      )
    },
  },
  talents: [
    // Row 1
    talent({
      id: 'set-feet',
      name: 'Set Feet',
      row: 0,
      col: 0,
      per: [10, 20],
      text: "Stand Firm's damage reduction is {}% stronger.",
      does: (v) => [more('strength', 'stand-firm', v)],
    }),
    talent({
      id: 'endurance',
      name: 'Endurance',
      row: 0,
      col: 1,
      per: [2, 4, 6],
      text: 'Stand Firm lasts {} sec longer.',
      does: (v) => [plus('duration', 'stand-firm', v)],
    }),
    talent({
      id: 'veteran',
      name: 'Veteran',
      row: 0,
      col: 3,
      per: [5, 10, 15],
      text: "Stand Firm's cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'stand-firm', -v)],
    }),

    // Row 2
    talent({
      id: 'second-breath',
      name: 'Second Breath',
      row: 1,
      col: 0,
      per: [600, 1200],
      text: 'When you cast Stand Firm, you shield yourself for {} for 8 sec.',
      does: (v) => [proc('cast', 'stand-firm', [apply(shield(v, 8, 'self', { name: 'Second Breath' }))])],
    }),
    talent({
      id: 'grit',
      name: 'Grit',
      row: 1,
      col: 2,
      per: [15, 30],
      text: 'When you cast Stand Firm, you gain {}% of your maximum @resource.',
      does: (v) => [proc('cast', 'stand-firm', [restoreShare(v)])],
    }),

    // Row 3
    talent({
      id: 'shared-burden',
      name: 'Shared Burden',
      row: 2,
      col: 1,
      per: [5, 10],
      text: 'When you cast Stand Firm, you and your group take {}% less damage for 8 sec.',
      does: (v) => [
        proc('cast', 'stand-firm', [
          buff({ id: 'shared-burden', name: 'Shared Burden', duration: 8, stats: { damageReduction: v }, group: true }),
        ]),
      ],
    }),
    talent({
      id: 'hardened',
      name: 'Hardened',
      row: 2,
      col: 3,
      per: [1, 2, 3],
      text: 'You take {}% less damage.',
      does: (v) => [stat('damageReduction', v)],
    }),

    // Row 4
    talent({
      id: 'immovable',
      name: 'Immovable',
      row: 3,
      col: 0,
      requires: 'set-feet',
      text: 'Stand Firm holds 2 charges.',
      does: () => [plus('charges', 'stand-firm', 1)],
    }),
  ],
}

// ---------- Tremor: area damage that taunts ----------

export const tremor: TreeDef = {
  ...tank,
  id: 'tremor',
  color: '#c9a66b',
  ability: {
    name: 'Tremor',
    castTime: 'Instant',
    range: 'Self',
    cooldown: '6 sec cooldown',
    description: 'Stamp the ground: damage every enemy around you and taunt them all.',
  },
  spec: {
    cost: 2,
    cooldown: 6,
    effects: [damage(260, 'self', { radius: 8, taunt: 4 })],
    text: (a) => {
      const [quake] = a.effects
      return (
        `Every enemy within ${yd(quake.radius)} yd of you takes ${int(quake.amount)} damage and attacks only you ` +
        `for ${sec(quake.taunt)} sec. Costs ${counted(a.cost, a.resource)}.`
      )
    },
  },
  talents: [
    // Row 1
    talent({
      id: 'heavy-footing',
      name: 'Heavy Footing',
      row: 0,
      col: 0,
      per: [8, 16, 24],
      text: 'Your area damage deals {}% more.',
      does: (v) => [more('amount', 'aoe', v)],
    }),
    talent({
      id: 'wide-stance',
      name: 'Wide Stance',
      row: 0,
      col: 1,
      per: [2, 4, 6],
      text: 'Tremor reaches {} yd farther.',
      does: (v) => [plus('radius', 'tremor', v)],
    }),
    talent({
      id: 'rumble',
      name: 'Rumble',
      row: 0,
      col: 3,
      per: [1, 2, 3],
      text: 'Tremor taunts for {} sec longer.',
      does: (v) => [plus('taunt', 'tremor', v)],
    }),

    // Row 2
    talent({
      id: 'quaking-ground',
      name: 'Quaking Ground',
      row: 1,
      col: 1,
      requires: 'wide-stance',
      per: [1, 2],
      text: "Tremor's cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'tremor', -v)],
    }),
    talent({
      id: 'thick-skull',
      name: 'Thick Skull',
      row: 1,
      col: 3,
      per: [1, 2],
      text: 'Each enemy Tremor hits makes you take {}% less damage for 6 sec, stacking up to 5 times.',
      does: (v) => [
        proc('hit', { all: ['tremor', 'direct-damage'] }, [
          buff({ id: 'thick-skull', name: 'Thick Skull', duration: 6, maxStacks: 5, stats: { damageReduction: v } }),
        ]),
      ],
    }),

    // Row 3
    talent({
      id: 'fractured-ground',
      name: 'Fractured Ground',
      row: 2,
      col: 0,
      per: [30, 60],
      text: 'Tremor leaves every enemy it hits bleeding for {} damage every sec for 6 sec.',
      does: (v) => [
        proc('hit', { all: ['tremor', 'direct-damage'] }, [apply(dot(v, 6, 1, 'event', { name: 'Fractured Ground' }))]),
      ],
    }),
    talent({
      id: 'war-drums',
      name: 'War Drums',
      row: 2,
      col: 2,
      per: [2, 4],
      text: 'Each enemy Tremor hits gives you {}% of your maximum @resource.',
      does: (v) => [proc('hit', { all: ['tremor', 'direct-damage'] }, [restoreShare(v)])],
    }),

    // Row 4
    talent({
      id: 'epicenter',
      name: 'Epicenter',
      row: 3,
      col: 1,
      requires: 'quaking-ground',
      text: "Tremor's critical hits take 1 sec off its cooldown.",
      does: () => [proc('crit', { all: ['tremor', 'direct-damage'] }, [cooldown('tremor', 1)])],
    }),
  ],
}

// ---------- Shield Block: needs a shield ----------

export const shieldBlock: TreeDef = {
  ...tank,
  id: 'shield-block',
  madeFor: 'sword-and-shield',
  needs: 'shield',
  color: '#8fb3e0',
  ability: {
    name: 'Shield Block',
    castTime: 'Instant',
    range: 'Self',
    cooldown: '12 sec recharge',
    description: 'Raise your shield to soak the next hits.',
  },
  spec: {
    cost: 3,
    cooldown: 12,
    charges: 2,
    gcd: 0,
    effects: [shield(2000, 6, 'self')],
    text: (a) => {
      const [block] = a.effects
      return (
        `Raise your shield: it soaks the next ${int(block.amount)} damage you take within ${sec(block.duration)} sec. ` +
        `Costs ${counted(a.cost, a.resource)}. Off the global cooldown.`
      )
    },
  },
  talents: [
    // Row 1
    talent({
      id: 'reinforced-rim',
      name: 'Reinforced Rim',
      row: 0,
      col: 0,
      per: [8, 16, 24],
      text: 'Your shields absorb {}% more.',
      does: (v) => [more('amount', 'shield', v)],
    }),
    talent({
      id: 'steady-arm',
      name: 'Steady Arm',
      row: 0,
      col: 1,
      per: [2, 4, 6],
      text: 'Shield Block lasts {} sec longer.',
      does: (v) => [plus('duration', 'shield-block', v)],
    }),
    talent({
      id: 'practiced-guard',
      name: 'Practiced Guard',
      row: 0,
      col: 3,
      per: [1.5, 3, 4.5],
      text: 'Shield Block recharges {} sec faster.',
      does: (v) => [plus('cooldown', 'shield-block', -v)],
    }),

    // Row 2
    talent({
      id: 'counterweight',
      name: 'Counterweight',
      row: 1,
      col: 1,
      per: [4, 8],
      text: 'When you cast Shield Block, you take {}% less damage for 6 sec.',
      does: (v) => [
        proc('cast', 'shield-block', [
          buff({ id: 'counterweight', name: 'Counterweight', duration: 6, stats: { damageReduction: v } }),
        ]),
      ],
    }),
    talent({
      id: 'spiked-shield',
      name: 'Spiked Shield',
      row: 1,
      col: 3,
      per: [150, 300],
      text: 'When you cast Shield Block, every enemy within 5 yd of you takes {} damage.',
      does: (v) => [
        proc('cast', 'shield-block', [apply(damage(v, 'self', { radius: 5, name: 'Spiked Shield' }))]),
      ],
    }),

    // Row 3
    talent({
      id: 'brace',
      name: 'Brace',
      row: 2,
      col: 0,
      per: [15, 30],
      text: 'Shield Block costs {}% less.',
      does: (v) => [more('cost', 'shield-block', -v)],
    }),
    talent({
      id: 'unbroken',
      name: 'Unbroken',
      row: 2,
      col: 2,
      text: 'Shield Block holds 3 charges.',
      does: () => [plus('charges', 'shield-block', 1)],
    }),

    // Row 4
    talent({
      id: 'bastion',
      name: 'Bastion',
      row: 3,
      col: 0,
      requires: 'reinforced-rim',
      per: [300, 600],
      text: 'When you cast Shield Block, every ally within 40 yd is shielded for {} for 6 sec.',
      does: (v) => [proc('cast', 'shield-block', [apply(shield(v, 6, 'all', { name: 'Bastion' }))])],
    }),
  ],
}

/** The tank's role abilities, for its three role slots. */
export const TANK_ABILITIES: readonly TreeDef[] = [provoke, standFirm, tremor, shieldBlock]
