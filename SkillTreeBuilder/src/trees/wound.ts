import { counted, int, sec, yd } from '../game/format.ts'
import type { TreeDef } from '../talents/types.ts'
import { apply, damage, dot, more, plus, proc, spread, talent } from './authoring.ts'

// A spell, so any damage weapon can cast it: a solid direct hit that also opens a wound. The wound
// is a stacking DoT: each cast adds a stack, up to 10, and refreshes them all, so keep casting
// within 6 sec to hold it at full.

/** Wound Rot: 35 damage per stack every sec for 6 sec, up to 10 stacks. Infected adds to the same stacks. */
const woundRot = (target: 'same' | 'event') =>
  dot(35, 6, 1, target, { name: 'Wound Rot', key: 'festering-wound:rot', maxStacks: 10 })

export const festeringWound: TreeDef = {
  id: 'festering-wound',
  kind: 'damage',
  role: 'damage',
  color: '#c2d94c',
  columns: 4,
  pointsPerRow: 2,
  ability: {
    name: 'Festering Wound',
    castTime: 'Instant',
    range: '40 range',
    description: 'Strike an enemy and open a wound that festers: every cast adds a stack, up to 10, and refreshes them all.',
  },
  spec: {
    cost: 1,
    range: 40,
    effects: [damage(350), woundRot('same')],
    text: (a) => {
      const [hit, rot] = a.effects
      return (
        `Hits the enemy nearest your crosshair within ${yd(a.range)} yd for ${int(hit.amount)} damage and adds a stack ` +
        `of Wound Rot: ${int(rot.amount)} damage per stack every ${sec(rot.interval)} sec for ${sec(rot.duration)} sec, ` +
        `up to ${rot.maxStacks} stacks. Each cast refreshes every stack. Costs ${counted(a.cost, a.resource)}.`
      )
    },
  },
  talents: [
    // Row 1
    talent({
      id: 'cruel-strikes',
      name: 'Cruel Strikes',
      row: 0,
      col: 0,
      per: [8, 16],
      text: 'Your direct damage deals {}% more.',
      does: (v) => [more('amount', 'direct-damage', v)],
    }),
    talent({
      id: 'open-sores',
      name: 'Open Sores',
      row: 0,
      col: 1,
      per: [2, 4],
      text: 'Wound Rot stacks up to {} more times.',
      does: (v) => [plus('maxStacks', 'festering-wound', v)],
    }),
    talent({
      id: 'lingering-wounds',
      name: 'Lingering Wounds',
      row: 0,
      col: 3,
      per: [1, 2],
      text: 'Your damage-over-time effects last {} sec longer.',
      does: (v) => [plus('duration', 'dot', v)],
    }),

    // Row 2
    talent({
      id: 'twist-the-knife',
      name: 'Twist the Knife',
      row: 1,
      col: 0,
      requires: 'cruel-strikes',
      per: [3, 6],
      text: "Festering Wound's hit deals {}% more for each stack of Wound Rot on its target.",
      does: (v) => [
        more('amount', { all: ['festering-wound', 'direct-damage'] }, v, { stacksOf: 'festering-wound' }),
      ],
    }),
    talent({
      id: 'double-wound',
      name: 'Double Wound',
      row: 1,
      col: 2,
      text: 'Festering Wound adds 2 stacks of Wound Rot at a time.',
      does: () => [plus('stacks', { all: ['festering-wound', 'dot'] }, 1)],
    }),
    talent({
      id: 'infected',
      name: 'Infected',
      row: 1,
      col: 3,
      per: [10, 20],
      text: 'Your direct damage has a {}% chance to add a stack of Wound Rot to its target.',
      does: (v) => [proc('hit', 'direct-damage', [apply(woundRot('event'))], { chance: v })],
    }),

    // Row 3
    talent({
      id: 'burst-open',
      name: 'Burst Open',
      row: 2,
      col: 1,
      per: [2, 4],
      text: 'When Wound Rot runs out, every stack bursts for {} sec worth of its damage at once.',
      does: (v) => [proc('expire', { all: ['festering-wound', 'dot'] }, [{ do: 'burst', seconds: v }])],
    }),
    talent({
      id: 'spreading-infection',
      name: 'Spreading Infection',
      row: 2,
      col: 3,
      per: [5, 10],
      text: "Each tick of Wound Rot has a {}% chance to copy one stack to the nearest enemy within 8 yd that doesn't have it.",
      does: (v) => [proc('hit', { all: ['festering-wound', 'dot'] }, [spread('festering-wound', 8)], { chance: v })],
    }),

    // Row 4
    talent({
      id: 'virulence',
      name: 'Virulence',
      row: 3,
      col: 1,
      requires: 'burst-open',
      per: [1, 2],
      text: 'Your damage-over-time effects deal {}% more for each stack of Wound Rot on their target.',
      does: (v) => [more('amount', 'dot', v, { stacksOf: 'festering-wound' })],
    }),
  ],
}
