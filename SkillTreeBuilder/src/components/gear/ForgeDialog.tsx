import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import {
  defaultName,
  equip,
  GEAR_STATS,
  isValidPair,
  RARITIES,
  RARITY_INFO,
  SPECIAL_STATS,
  SPLIT_MAX,
  SPLIT_MIN,
  SPLIT_STEP,
  splitOf,
  trinketName,
  type Gear,
  type GearStat,
  type Trinket,
  type TrinketSlot,
} from '../../game/gear.ts'
import { STAT_INFO } from '../../game/stats.ts'
import { StatIcon } from '../StatIcon.tsx'
import { ItemCard } from './ItemCard.tsx'

interface Props {
  slot: TrinketSlot
  gear: Gear
  onSave: (gear: Gear) => void
  onClose: () => void
}

const DEFAULT: Omit<Trinket, 'slot'> = { rarity: 'rare', itemLevel: 100, stats: ['haste', 'potency'] }

/** Makes a test trinket for one slot: its name, rarity, item level, the two stats and how they're split. */
export function ForgeDialog({ slot, gear, onSave, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const worn = gear[slot]
  const [draft, setDraft] = useState<Trinket>(worn ?? { slot, ...DEFAULT })
  const valid = isValidPair(draft.stats[0], draft.stats[1])
  const clash = valid ? equip(gear, draft).cleared : undefined

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const close = () => ref.current?.close()
  const setStat = (i: 0 | 1, stat: GearStat) => {
    const stats: [GearStat, GearStat] = [...draft.stats]
    stats[i] = stat
    setDraft({ ...draft, stats })
  }
  const setSplit = (split: number) => {
    const next: Trinket = { ...draft, split }
    if (split === 100) delete next.split
    setDraft(next)
  }
  const setName = (name: string) => {
    const next: Trinket = { ...draft, name }
    if (!name.trim()) delete next.name
    setDraft(next)
  }
  const split = splitOf(draft)
  // A stat can't pair with itself, and Echo and Minion power can't share an item.
  const allowed = (i: 0 | 1, stat: GearStat) => {
    const other = draft.stats[i === 0 ? 1 : 0]
    return stat !== other && !(SPECIAL_STATS.has(stat) && SPECIAL_STATS.has(other))
  }

  return (
    <dialog
      ref={ref}
      className="picker forge"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close()
      }}
    >
      <div className="picker__body">
        <h2 id={titleId} className="picker__title">
          {slot}
        </h2>
        <p className="picker__sub">
          Make a test trinket. Rarity sets the two stats, item level sets Power and Health, and the balance splits
          the stats between them, up to 150% and 50%. Only the name is unique: you can't wear two items with the
          same name.
        </p>

        <div className="forge__grid">
          <div className="forge__form">
            <label className="forge__field">
              <span className="forge__label">Name</span>
              <input
                type="text"
                className="forge__name"
                maxLength={60}
                value={draft.name ?? ''}
                placeholder={defaultName(draft)}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <fieldset className="forge__field">
              <legend>Rarity</legend>
              <div className="segmented">
                {RARITIES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className="segmented__btn"
                    aria-pressed={draft.rarity === r}
                    style={{ '--rc': RARITY_INFO[r].color } as CSSProperties}
                    onClick={() => setDraft({ ...draft, rarity: r })}
                  >
                    {RARITY_INFO[r].label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="forge__field">
              <span className="forge__label">
                Item level <b>{draft.itemLevel}</b>
              </span>
              <input
                type="range"
                min={1}
                max={160}
                value={draft.itemLevel}
                onChange={(e) => setDraft({ ...draft, itemLevel: Number(e.target.value) })}
              />
            </label>

            {([0, 1] as const).map((i) => (
              <fieldset key={i} className="forge__field">
                <legend>{i === 0 ? 'First stat' : 'Second stat'}</legend>
                <div className="chips">
                  {GEAR_STATS.map((stat) => (
                    <button
                      key={stat}
                      type="button"
                      className="chip"
                      aria-pressed={draft.stats[i] === stat}
                      disabled={!allowed(i, stat)}
                      style={{ '--sc': STAT_INFO[stat].color } as CSSProperties}
                      onClick={() => setStat(i, stat)}
                    >
                      <StatIcon stat={stat} size={13} plain />
                      {STAT_INFO[stat].label}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}

            <label className="forge__field">
              <span className="forge__label">
                Balance{' '}
                <b>
                  {STAT_INFO[draft.stats[0]].label} {split}% · {STAT_INFO[draft.stats[1]].label} {200 - split}%
                </b>
              </span>
              <input
                type="range"
                min={SPLIT_MIN}
                max={SPLIT_MAX}
                step={SPLIT_STEP}
                value={split}
                onChange={(e) => setSplit(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="forge__preview">
            <ItemCard trinket={draft} />
            {clash && (
              <p className="forge__warn">
                Wearing this takes off your {clash}, {trinketName(gear[clash]!)}: only one “{trinketName(draft)}” can be
                worn.
              </p>
            )}
          </div>
        </div>

        <div className="picker__footer forge__footer">
          {worn && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                const next = { ...gear }
                delete next[slot]
                onSave(next)
                close()
              }}
            >
              Take off
            </button>
          )}
          <span className="forge__spacer" />
          <button type="button" className="btn" onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!valid}
            onClick={() => {
              onSave(equip(gear, draft).gear)
              close()
            }}
          >
            {worn ? 'Replace' : 'Equip'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
