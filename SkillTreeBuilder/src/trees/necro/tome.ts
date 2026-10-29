import { int, sec } from '../../game/format.ts'
import type { BuffSpec, CharStats } from '../../game/types.ts'
import type { ArtifactDef, TreeDef } from '../../talents/types.ts'
import { buff, more, plus, proc, restore, stat, talent } from '../authoring.ts'

// The summoner's artifact. Its resource is imps: the main attack, a 2 sec cast, summons one for
// 14 sec, every imp attacks your target on its own, and the book's spells are paid for by
// sacrificing imps, the ones with the least time left first.

/** Dark Bargain's buffs: each sacrificed imp gives one of them at random, for this long. */
const BARGAIN_SECONDS = 10

const bargain = (id: string, name: string, stats: Partial<CharStats>): BuffSpec => ({
  id: `dark-bargain-${id}`,
  name: `Dark Bargain: ${name}`,
  duration: BARGAIN_SECONDS,
  maxStacks: Infinity,
  keepsTimer: true,
  stats,
})

const tree: TreeDef = {
  id: 'tome-of-summoning',
  reviewed: true,
  kind: 'artifact',
  role: 'damage',
  color: '#c89b4c',
  columns: 4,
  pointsPerRow: 2,

  ability: {
    name: 'Summon Imp',
    castTime: '2 sec cast',
    range: 'Self',
    description: 'Summon an imp that fights for you for 14 sec. Your spells sacrifice imps.',
  },
  spec: {
    tags: ['main-attack', 'summon'],
    castTime: 2,
    effects: [{ type: 'restore', restore: 1, name: 'Summon Imp' }],
    minion: { type: 'minion', name: 'Imp', amount: 40, interval: 1.5, duration: 14, target: 'target', tags: ['imp'] },
    text: (a) => {
      const imp = a.minion!
      return (
        `Summon an imp for ${sec(imp.duration)} sec. Each imp hurls a firebolt at the enemy nearest your crosshair ` +
        `for ${int(imp.amount)} damage every ${sec(imp.interval)} sec. Your spells sacrifice imps to pay for ` +
        'themselves, the ones with the least time left first.'
      )
    },
  },

  talents: [
    // Row 1
    talent({
      id: 'lasting-pact',
      name: 'Lasting Pact',
      row: 0,
      col: 0,
      per: [5, 10],
      text: 'Your imps stay {} sec longer.',
      does: (v) => [plus('duration', 'imp', v)],
    }),
    talent({
      id: 'infernal-haste',
      name: 'Infernal Haste',
      row: 0,
      col: 1,
      per: [3, 6],
      text: 'You have +{}% haste.',
      does: (v) => [stat('haste', v)],
    }),
    talent({
      id: 'quick-summons',
      name: 'Quick Summons',
      row: 0,
      col: 3,
      per: [0.25, 0.5],
      text: 'Summon Imp casts {} sec faster.',
      does: (v) => [plus('castTime', 'main-attack', -v)],
    }),

    // Row 2
    talent({
      id: 'bloodbound',
      name: 'Bloodbound',
      row: 1,
      col: 0,
      requires: 'lasting-pact',
      per: [2, 4],
      text: 'Your damage has a {}% chance to add 1 sec to every imp you command.',
      does: (v) => [proc('hit', 'damage', [{ do: 'extendImps', seconds: 1 }], { chance: v })],
    }),
    talent({
      id: 'frenzied-imps',
      name: 'Frenzied Imps',
      row: 1,
      col: 1,
      per: [10, 20],
      text: 'Your minions attack {}% faster: your imps and any others.',
      does: (v) => [more('tickRate', 'minion', v)],
    }),
    talent({
      id: 'quick-invocation',
      name: 'Quick Invocation',
      row: 1,
      col: 3,
      requires: 'quick-summons',
      per: [4, 8],
      text:
        'Every second you spend moving gives you a stack of Quick Invocation: your next summon spell casts {}% ' +
        'faster for each stack, and instantly at 100%.',
      does: (v) => [
        proc('moving', 'moving', [
          buff({
            id: 'quick-invocation',
            name: 'Quick Invocation',
            duration: Infinity,
            maxStacks: Math.ceil(100 / v),
            consumeOn: 'summon',
            mods: [more('castTime', 'summon', -v)],
          }),
        ]),
      ],
    }),

    // Row 3
    talent({
      id: 'spawning',
      name: 'Spawning',
      row: 2,
      col: 1,
      requires: 'frenzied-imps',
      per: [2, 4],
      text: "Your imps' attacks have a {}% chance to summon another imp, at most once every 15 sec.",
      does: (v) => [proc('hit', 'imp', [restore(1)], { chance: v, cooldown: 15 })],
    }),
    talent({
      id: 'stubborn-imps',
      name: 'Stubborn Imps',
      row: 2,
      col: 2,
      per: [5, 10],
      text: 'Each imp you sacrifice has a {}% chance to survive, and isn’t spent.',
      does: (v) => [stat('spareChance', v)],
    }),

    // Row 4
    talent({
      id: 'dark-bargain',
      name: 'Dark Bargain',
      row: 3,
      col: 2,
      requires: 'stubborn-imps',
      text:
        `Every imp you sacrifice gives you, at random, +1% haste, +1% critical chance, +2% echo or +0.05% minion ` +
        `power for ${BARGAIN_SECONDS} sec. Each stacks, but a new stack doesn’t refresh its timer.`,
      does: () => [
        proc('sacrifice', 'sacrifice', [
          {
            do: 'oneOf',
            actions: [
              buff(bargain('haste', 'Haste', { haste: 1 })),
              buff(bargain('crit', 'Critical', { crit: 1 })),
              buff(bargain('echo', 'Echo', { echo: 2 })),
              buff(bargain('minion-power', 'Minion power', { minionPower: 0.05 })),
            ],
          },
        ]),
      ],
    }),
    talent({
      id: 'twin-summons',
      name: 'Twin Summons',
      row: 3,
      col: 3,
      requires: 'quick-invocation',
      text: 'Every third Summon Imp summons 2 imps instead of 1.',
      does: () => [proc('cast', 'main-attack', [restore(1)], { every: 3 })],
    }),
  ],
}

export const tomeOfSummoning: ArtifactDef = {
  id: 'tome-of-summoning',
  name: 'Tome of Summoning',
  color: '#c89b4c',
  role: 'damage',
  roleKind: 'damage',
  reach: 'ranged',
  resource: 'Imps',
  resourceStart: 0,
  traits: ['book'],
  stats: { maxResource: 15, resourceRegen: 0 },
  description: 'Damage. Summon imps that fight for you for 14 sec, then sacrifice them to pay for your spells.',
  tree,
}
