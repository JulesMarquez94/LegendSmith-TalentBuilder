import { useEffect, useId, useRef } from 'react'
import { ArtIcon } from './ArtIcon.tsx'

/** One choice in the picker: an ability for a slot, or an artifact for slot 1. */
export interface PickerOption {
  id: string
  name: string
  color?: string
  artFolder?: string
  icon?: string
  /** Cast time, cost, cooldown… on one line. */
  meta: string
  description: string
  playtest?: boolean
  displayOnly?: boolean
  /** The weapon it was made with, for a label; `yours` when that's the weapon you hold. */
  madeFor?: { name: string; color: string; yours: boolean }
  /** The slot it's in now (0-based), or -1. */
  at: number
}

interface Props {
  slotIndex: number
  title: string
  subtitle: string
  options: readonly PickerOption[]
  /** Whether the slot holds something, so picking a slotted option swaps rather than moves. */
  slotFilled: boolean
  onPick: (id: string) => void
  onClose: () => void
}

/** A modal list of what fits a slot. Escape, Cancel or a click outside closes it. */
export function AbilityPicker({ slotIndex, title, subtitle, options, slotFilled, onPick, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const choose = (id: string) => {
    onPick(id)
    ref.current?.close()
  }

  return (
    <dialog
      ref={ref}
      className="picker"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close()
      }}
    >
      <div className="picker__body">
        <h2 id={titleId} className="picker__title">
          {title}
        </h2>
        <p className="picker__sub">{subtitle}</p>

        <ul className="picker__list">
          {options.map((option) => {
            const here = option.at === slotIndex
            return (
              <li key={option.id}>
                <button type="button" className="picker__option" disabled={here} onClick={() => choose(option.id)}>
                  <ArtIcon
                    folder={option.artFolder}
                    icon={option.icon}
                    label={option.name}
                    tint={option.color}
                    className="picker__icon"
                  />
                  <span className="picker__text">
                    <span className="picker__name">
                      {option.name}
                      {option.madeFor && (
                        <span
                          className="tag tag--weapon"
                          style={{ color: option.madeFor.color, borderColor: option.madeFor.color }}
                          title={`Made for the ${option.madeFor.name}. Any weapon of its role can use it.`}
                        >
                          {option.madeFor.name}
                        </span>
                      )}
                      {option.playtest && <span className="tag">Playtest</span>}
                      {option.displayOnly && <span className="tag">Display only</span>}
                      {here && <span className="picker__note">In this slot</span>}
                      {!here && option.at >= 0 && (
                        <span className="picker__note">
                          In slot {option.at + 1} · {slotFilled ? 'swaps' : 'moves here'}
                        </span>
                      )}
                    </span>
                    <span className="picker__meta">{option.meta}</span>
                    <span className="picker__desc">{option.description}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="picker__footer">
          <button type="button" className="btn" onClick={() => ref.current?.close()}>
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  )
}
