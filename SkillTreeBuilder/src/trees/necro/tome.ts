import { int, sec } from '../../game/format.ts'
import type { ArtifactDef, TreeDef } from '../../talents/types.ts'
import { apply, buff, dot, more, plus, proc, restore, stat, talent } from '../authoring.ts'

// The summoner's artifact. Its resource is imps: the main attack summons one, every imp attacks
// your target on its own, and the book's spells are paid for by sacrificing imps.

const tree: TreeDef = {
  id: 'tome-of-summoning',
  kind: 'artifact',
  role: 'damage',
  color: '#c89b4c',
  columns: 4,
  pointsPerRow: 2,

  ability: {
    name: 'Summon Imp',
    castTime: '1 sec cast',
    range: 'Self',
    description: 'Summon an imp that attacks your target. Your spells sacrifice imps.',
  },
  spec: {
    tags: ['main-attack', 'summon'],
    castTime: 1,
    effects: [{ type: 'restore', restore: 1, name: 'Summon Imp' }],
    minion: { type: 'minion', name: 'Imp', amount: 60, interval: 1.5, target: 'target' },
    text: (a) => {
      const imp = a.minion!
      return (
        `Summon an imp. Each imp hurls a firebolt at the enemy nearest your crosshair for ${int(imp.amount)} damage ` +
        `every ${sec(imp.interval)} sec. Your spells sacrifice imps to pay for themselves.`
      )
    },
  },

  talents: [
    // Row 1
    talent({
      id: 'imp-mastery',
      name: 'Imp Mastery',
      row: 0,
      col: 0,
      per: [10, 20, 30],
      text: 'Your imps deal {}% more damage.',
      does: (v) => [more('amount', 'minion', v)],
    }),
    talent({
      id: 'legion',
      name: 'Legion',
      row: 0,
      col: 1,
      per: [1, 2],
      text: 'You can command {} more imps.',
      does: (v) => [stat('maxResource', v)],
    }),
    talent({
      id: 'quick-summoning',
      name: 'Quick Summoning',
      row: 0,
      col: 2,
      per: [0.25, 0.5],
      text: 'Summon Imp casts {} sec faster.',
      does: (v) => [plus('castTime', 'main-attack', -v)],
    }),
    talent({
      id: 'dark-pact',
      name: 'Dark Pact',
      row: 0,
      col: 3,
      per: [1, 2, 3],
      text: 'You deal {}% more damage for each imp you command (Minion power).',
      does: (v) => [stat('minionPower', v)],
    }),

    // Row 2
    talent({
      id: 'frenzied-imps',
      name: 'Frenzied Imps',
      row: 1,
      col: 0,
      requires: 'imp-mastery',
      per: [10, 20],
      text: 'Your imps attack {}% faster.',
      does: (v) => [more('tickRate', 'minion', v)],
    }),
    talent({
      id: 'twin-summons',
      name: 'Twin Summons',
      row: 1,
      col: 2,
      per: [15, 30],
      text: 'Summon Imp has a {}% chance to summon a second imp.',
      does: (v) => [proc('cast', 'main-attack', [restore(1)], { chance: v })],
    }),
    talent({
      id: 'blood-price',
      name: 'Blood Price',
      row: 1,
      col: 3,
      per: [5, 10],
      text: 'Sacrificing imps gives you {}% haste for 6 sec.',
      does: (v) => [
        proc('cast', 'spell', [buff({ id: 'blood-price', name: 'Blood Price', duration: 6, stats: { haste: v } })]),
      ],
    }),

    // Row 3
    talent({
      id: 'infernal-bolts',
      name: 'Infernal Bolts',
      row: 2,
      col: 1,
      text: "Your imps' attacks have a 20% chance to leave Smoulder on the target: 30 damage every sec for 6 sec.",
      does: () => [
        proc('hit', 'minion', [apply(dot(30, 6, 1, 'event', { name: 'Smoulder' }))], { chance: 20 }),
      ],
    }),
    talent({
      id: 'fel-vigor',
      name: 'Fel Vigor',
      row: 2,
      col: 3,
      per: [5, 10, 15],
      text: "Your imps' attacks have +{}% critical chance.",
      does: (v) => [plus('critChance', 'minion', v)],
    }),

    // Row 4
    talent({
      id: 'imp-lord',
      name: 'Imp Lord',
      row: 3,
      col: 1,
      requires: 'infernal-bolts',
      text: "Your imps' critical hits have a 25% chance to summon another imp.",
      does: () => [proc('crit', 'minion', [restore(1)], { chance: 25 })],
    }),
    talent({
      id: 'unholy-pact',
      name: 'Unholy Pact',
      row: 3,
      col: 3,
      per: [5, 10, 15],
      text: 'Your spells that sacrifice imps deal {}% more damage.',
      does: (v) => [more('amount', { all: ['spell', 'damage'] }, v)],
    }),
  ],
}

export const tomeOfSummoning: ArtifactDef = {
  id: 'tome-of-summoning',
  name: 'Tome of Summoning',
  color: '#c89b4c',
  role: 'damage',
  roleKind: 'damage',
  resource: 'Imps',
  resourceStart: 0,
  traits: ['book'],
  stats: { maxResource: 15, resourceRegen: 0 },
  description: 'Damage. Summon imps that attack your target, then sacrifice them to pay for your spells.',
  tree,
}
