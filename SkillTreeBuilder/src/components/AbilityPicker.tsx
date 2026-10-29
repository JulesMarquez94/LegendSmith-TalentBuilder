import { Fragment, useEffect, useId, useRef } from 'react'
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
  /** Why your weapon can't slot it ("Needs a blade"); shown, but not pickable. */
  locked?: string
  /** An artifact that's a first version, until its real design arrives. */
  firstVersion?: boolean
  /** Not had a design pass yet: greyed out and tagged, but still pickable. */
  wip?: boolean
  /** Options with the same group are listed together under it (artifacts by seat: "Tank", "Healer"…). */
  group?: string
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

/** A modal list of what fits a slot, in groups when the options have them. Escape, Cancel or a click outside closes it. */
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

  // Groups in the order their first option comes, so the caller decides the order.
  const groups = [...new Set(options.map((o) => o.group))]

  const list = (group: string | undefined) => (
    <ul className="picker__list">
      {options
        .filter((option) => option.group === group)
        .map((option) => {
          const here = option.at === slotIndex
          return (
            <li key={option.id}>
              <button
                type="button"
                className={['picker__option', option.locked && 'picker__option--locked', option.wip && 'picker__option--wip']
                  .filter(Boolean)
                  .join(' ')}
                disabled={here || option.locked !== undefined}
                onClick={() => choose(option.id)}
              >
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
                    {option.locked && <span className="tag tag--locked">{option.locked}</span>}
                    {option.wip && <span className="tag tag--wip">WIP</span>}
                    {option.playtest && <span className="tag">Playtest</span>}
                    {option.displayOnly && <span className="tag">Display only</span>}
                    {option.firstVersion && <span className="tag">First version</span>}
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
  )

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

        {groups.map((group) =>
          group === undefined ? (
            <Fragment key="">{list(group)}</Fragment>
          ) : (
            <section key={group} className="picker__group">
              <h3 className="picker__group-title">{group}</h3>
              {list(group)}
            </section>
          ),
        )}

        <div className="picker__footer">
          <button type="button" className="btn" onClick={() => ref.current?.close()}>
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  )
}
