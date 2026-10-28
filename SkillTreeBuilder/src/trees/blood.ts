import { pct, sec } from '../game/format.ts'
import type { TreeDef } from '../talents/types.ts'
import { more, plus, proc, selfBuff, talent } from './authoring.ts'

// The damage dealer's ultimate: a long burst of haste for you alone (Fervor shares a shorter one with
// your group). Like every ultimate, its tree is small: 9 ranks, 6 points to spend.

export const bloodFrenzy: TreeDef = {
  id: 'blood-frenzy',
  kind: 'cooldown',
  role: 'damage',
  color: '#d4473f',
  columns: 4,
  pointsPerRow: 2,
  ability: {
    name: 'Blood Frenzy',
    castTime: 'Instant',
    range: 'Self',
    cooldown: '3 min cooldown',
    description: 'Fly into a frenzy: +20% haste for 30 sec.',
  },
  spec: {
    cooldown: 180,
    effects: [selfBuff({ id: 'blood-frenzy', name: 'Blood Frenzy', duration: 30, stats: { haste: 20 } })],
    text: (a) => {
      const e = a.effects[0]
      const charges = a.charges > 1 ? ` Holds ${a.charges} charges.` : ''
      return `You fly into a frenzy: +${pct(e.buff?.stats?.haste ?? 0)}% haste for ${sec(e.duration)} sec.${charges}`
    },
  },
  talents: [
    // Row 1
    talent({
      id: 'bloodlust',
      name: 'Bloodlust',
      row: 0,
      col: 1,
      per: [5, 10],
      text: 'Blood Frenzy gives +{}% more haste.',
      does: (v) => [plus('strength', 'blood-frenzy', v)],
    }),
    talent({
      id: 'lingering-rage',
      name: 'Lingering Rage',
      row: 0,
      col: 2,
      per: [5, 10],
      text: 'Blood Frenzy lasts {} sec longer.',
      does: (v) => [plus('duration', 'blood-frenzy', v)],
    }),

    // Row 2
    talent({
      id: 'quickened-pulse',
      name: 'Quickened Pulse',
      row: 1,
      col: 0,
      per: [30, 60],
      text: "Blood Frenzy's cooldown is {} sec shorter.",
      does: (v) => [plus('cooldown', 'blood-frenzy', -v)],
    }),
    talent({
      id: 'endless-frenzy',
      name: 'Endless Frenzy',
      row: 1,
      col: 2,
      requires: 'lingering-rage',
      per: [0.2, 0.4],
      text: 'Every ability you use while Blood Frenzy is up makes it last {} sec longer.',
      does: (v) => [proc('cast', '*', [{ do: 'extendBuff', buff: 'blood-frenzy', seconds: v }])],
    }),

    // Row 3
    talent({
      id: 'twin-frenzy',
      name: 'Twin Frenzy',
      row: 2,
      col: 0,
      requires: 'quickened-pulse',
      text: 'Blood Frenzy holds 2 charges, but lasts half as long.',
      does: () => [plus('charges', 'blood-frenzy', 1), more('duration', 'blood-frenzy', -50)],
    }),
  ],
}
