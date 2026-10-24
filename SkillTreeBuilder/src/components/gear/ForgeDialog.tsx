import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import {
  equip,
  GEAR_STATS,
  isValidPair,
  RARITIES,
  RARITY_INFO,
  SPECIAL_STATS,
  trinketName,
  uniqueName,
  type Gear,
  type GearStat,
  type Trinket,
  type TrinketSlot,
} from '../../game/gear.ts'
import { STAT_INFO } from '../../game/stats.ts'
import { ItemCard } from './ItemCard.tsx'

interface Props {
  slot: TrinketSlot
  gear: Gear
  onSave: (gear: Gear) => void
  onClose: () => void
}

const DEFAULT: Omit<Trinket, 'slot'> = { rarity: 'rare', itemLevel: 100, stats: ['haste', 'potency'] }

/** Makes a test trinket for one slot: rarity, item level and the two stats. */
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
        <p className="picker__sub">Make a test trinket. Rarity sets the two stats, item level sets Power and Health.</p>

        <div className="forge__grid">
          <div className="forge__form">
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
                      {STAT_INFO[stat].label}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="forge__preview">
            <ItemCard trinket={draft} />
            {clash && (
              <p className="forge__warn">
                Wearing this takes off your {trinketName(gear[clash]!)}: only one “{uniqueName(draft)}” can be worn.
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
