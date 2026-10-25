import { counted, int, sec } from '../game/format.ts'
import type { TreeDef } from '../talents/types.ts'
import { apply, damage, dot, hostileZone, more, plus, proc, summon, talent } from './authoring.ts'

// A spell, so every damage weapon can raise ghouls. Ghouls are minions of their own: they fight for a
// while and then fall, unlike the summoning book's imps, which are its resource. "Your minions" talents
// reach both; "your ghouls" talents match Raise Ghoul's minions only, so its rot, pools and explosions
// never feed their own procs.

/** Raise Ghoul's own minions (the ghouls and the Ghoul Lord), not the rot and pools they leave. */
const GHOULS = { all: ['raise-ghoul', 'minion'] }

export const raiseGhoul: TreeDef = {
  id: 'raise-ghoul',
  kind: 'damage',
  role: 'damage',
  madeFor: 'tome-of-summoning',
  color: '#8fb85a',
  columns: 4,
  pointsPerRow: 2,
  ability: {
    name: 'Raise Ghoul',
    castTime: '1.5 sec cast',
    range: '20 range',
    description: 'Raise a ghoul that fights for you for 20 sec. You can have up to 3 ghouls at once.',
  },
  spec: {
    cost: 2,
    castTime: 1.5,
    range: 20,
    effects: [summon(90, 1.5, 20, 3, { name: 'Ghoul' })],
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
      id: 'ravenous',
      name: 'Ravenous',
      row: 0,
      col: 0,
      per: [8, 16, 24],
      text: 'Your minions deal {}% more damage.',
      does: (v) => [more('amount', 'minion', v)],
    }),
    talent({
      id: 'grave-pact',
      name: 'Grave Pact',
      row: 0,
      col: 2,
      per: [4.5, 9],
      text: 'Your ghouls last {} sec longer.',
      does: (v) => [plus('duration', GHOULS, v)],
    }),
    talent({
      id: 'rotting-claws',
      name: 'Rotting Claws',
      row: 1,
      col: 0,
      requires: 'ravenous',
      text: "Your ghouls' attacks leave Grave Rot on their target: 25 damage every sec for 6 sec.",
      does: () => [proc('hit', GHOULS, [apply(dot(25, 6, 1, 'event', { name: 'Grave Rot' }))])],
    }),
    talent({
      id: 'horde',
      name: 'Horde',
      row: 1,
      col: 2,
      requires: 'grave-pact',
      per: [1, 2],
      text: 'You can have {} more ghouls at once.',
      does: (v) => [plus('max', GHOULS, v)],
    }),
    talent({
      id: 'frenzied-pack',
      name: 'Frenzied Pack',
      row: 2,
      col: 2,
      requires: 'horde',
      per: [8, 16, 24],
      text: 'Your minions attack {}% faster.',
      does: (v) => [more('tickRate', 'minion', v)],
    }),
    talent({
      id: 'unhallowed-ground',
      name: 'Unhallowed Ground',
      row: 2,
      col: 3,
      per: [40, 80, 120],
      text: "Every 5th attack from your ghouls leaves a pool of decay under its target: {} damage every sec for 5 sec.",
      does: (v) => [
        proc('hit', GHOULS, [apply(hostileZone(v, 5, 1, 4, { name: 'Unhallowed Ground', target: 'event' }))], {
          every: 5,
        }),
      ],
    }),
    talent({
      id: 'ghoul-lord',
      name: 'Ghoul Lord',
      row: 3,
      col: 1,
      requires: 'frenzied-pack',
      text: 'Every 4th Raise Ghoul also raises a Ghoul Lord: 200 damage every 1.5 sec for 20 sec.',
      does: () => [proc('cast', 'raise-ghoul', [apply(summon(200, 1.5, 20, 1, { name: 'Ghoul Lord' }))], { every: 4 })],
    }),
    talent({
      id: 'corpse-explosion',
      name: 'Corpse Explosion',
      row: 3,
      col: 3,
      requires: 'unhallowed-ground',
      per: [150, 300, 450],
      text: 'When one of your ghouls falls, it explodes for {} damage to every enemy within 6 yd of its target.',
      does: (v) => [proc('expire', GHOULS, [apply(damage(v, 'event', { radius: 6, name: 'Corpse Explosion' }))])],
    }),
  ],
}
