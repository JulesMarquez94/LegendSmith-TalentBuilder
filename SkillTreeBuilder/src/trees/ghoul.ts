import { counted, int, sec } from '../game/format.ts'
import type { TreeDef } from '../talents/types.ts'
import { more, plus, proc, summon, talent } from './authoring.ts'

// A spell, so every damage weapon can raise ghouls. Ghouls are minions of their own: they fight for a
// while and then fall, unlike the summoning book's imps, which are its resource. "Your minions" talents
// reach both; "your ghouls" talents match Raise Ghoul's minions only.

/** Raise Ghoul's own minions. */
const GHOULS = { all: ['raise-ghoul', 'minion'] }

/** How often a ghoul attacks before talents: Frenzied Claws takes seconds off it. */
const ATTACK_EVERY = 2

export const raiseGhoul: TreeDef = {
  id: 'raise-ghoul',
  reviewed: true,
  kind: 'damage',
  role: 'damage',
  madeFor: 'tome-of-summoning',
  color: '#8fb85a',
  columns: 4,
  pointsPerRow: 2,
  ability: {
    name: 'Raise Ghoul',
    castTime: '2 sec cast',
    range: '20 range',
    description: 'Raise a ghoul that fights for you for 24 sec, clawing your target every 2 sec. Up to 3 at once.',
  },
  spec: {
    // A summon spell, so talents for summon spells (Quick Invocation) reach it.
    tags: ['summon'],
    cost: 3,
    castTime: 2,
    range: 20,
    effects: [summon(150, ATTACK_EVERY, 24, 3, { name: 'Ghoul' })],
    text: (a) => {
      const e = a.effects[0]
      return (
        `Raises a ghoul that claws the enemy nearest your crosshair for ${int(e.amount)} damage every ` +
        `${sec(e.interval)} sec for ${sec(e.duration)} sec. Up to ${e.max} at once: another replaces the oldest. ` +
        `Costs ${counted(a.cost, a.resource)}.`
      )
    },
  },
  talents: [
    talent({
      id: 'grave-patience',
      name: 'Grave Patience',
      row: 0,
      col: 0,
      per: [4, 8],
      text: 'Your ghouls last {} sec longer.',
      does: (v) => [plus('duration', GHOULS, v)],
    }),
    talent({
      id: 'unholy-might',
      name: 'Unholy Might',
      row: 0,
      col: 1,
      per: [6, 12, 18],
      text: 'Your minions deal {}% more damage.',
      does: (v) => [more('amount', 'minion', v)],
    }),
    talent({
      id: 'quick-rites',
      name: 'Quick Rites',
      row: 0,
      col: 3,
      per: [0.25, 0.5],
      text: 'Raise Ghoul casts {} sec faster.',
      does: (v) => [plus('castTime', 'raise-ghoul', -v)],
    }),
    talent({
      id: 'horde',
      name: 'Horde',
      row: 1,
      col: 0,
      requires: 'grave-patience',
      per: [1, 2],
      text: 'You can have {} more ghouls at once.',
      does: (v) => [plus('max', GHOULS, v)],
    }),
    talent({
      id: 'frenzied-claws',
      name: 'Frenzied Claws',
      row: 1,
      col: 1,
      requires: 'unholy-might',
      per: [0.25, 0.5],
      text: "Your ghouls' attacks come {} sec sooner.",
      // Attack speed that takes exactly that off the 2 sec (before haste).
      does: (v) => [more('tickRate', GHOULS, (ATTACK_EVERY / (ATTACK_EVERY - v) - 1) * 100)],
    }),
    talent({
      id: 'undying-hunger',
      name: 'Undying Hunger',
      row: 1,
      col: 3,
      per: [0.25, 0.5],
      text: 'Whenever you crit, your ghouls last {} sec longer. At most once a second.',
      does: (v) => [proc('crit', 'damage', [{ do: 'extendSummons', match: GHOULS, seconds: v }], { cooldown: 1 })],
    }),
    talent({
      id: 'corpse-explosion',
      name: 'Corpse Explosion',
      row: 2,
      col: 0,
      requires: 'horde',
      per: [150, 300],
      text: 'When one of your ghouls dies or expires, it explodes for {} damage to every enemy within 6 yd of its target.',
      does: (v) => [plus('explode', GHOULS, v)],
    }),
    talent({
      id: 'mounting-fury',
      name: 'Mounting Fury',
      row: 2,
      col: 2,
      requires: 'frenzied-claws',
      per: [2, 4],
      text: 'Each attack your ghouls make gives them {}% more damage, up to 10 times.',
      does: (v) => [plus('fury', GHOULS, v)],
    }),
    talent({
      id: 'volatile-remains',
      name: 'Volatile Remains',
      row: 3,
      col: 0,
      requires: 'corpse-explosion',
      text:
        "Corpse Explosion deals 60 more damage for each second the ghoul had left, shared out among the enemies it hits. " +
        'A ghoul replaced by a newer one, or taken early, explodes harder.',
      does: () => [plus('explodeLeft', GHOULS, 60)],
    }),
  ],
}
