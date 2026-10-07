import { useEffect, useId, useRef } from 'react'
import type { SlotKind, TreeDef } from '../talents/types.ts'
import { ArtIcon } from './ArtIcon.tsx'
import { KIND_LABEL } from './labels.ts'

interface Props {
  slotIndex: number
  kind: SlotKind
  /** The trees that fit this slot. */
  trees: readonly TreeDef[]
  slots: readonly (string | null)[]
  onPick: (treeId: string) => void
  onClose: () => void
}

/** A modal list of the abilities that fit a slot. Escape, Cancel or a click outside closes it. */
export function AbilityPicker({ slotIndex, kind, trees, slots, onPick, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const label = KIND_LABEL[kind].toLowerCase()
  const slotFilled = slots[slotIndex] !== null

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const choose = (treeId: string) => {
    onPick(treeId)
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
          Slot {slotIndex + 1} · {KIND_LABEL[kind]}
        </h2>
        <p className="picker__sub">Choose a {label} ability. Its talent tree goes into the slot.</p>

        <ul className="picker__list">
          {trees.map((tree) => {
            const at = slots.indexOf(tree.id)
            const here = at === slotIndex
            const { ability } = tree
            return (
              <li key={tree.id}>
                <button type="button" className="picker__option" disabled={here} onClick={() => choose(tree.id)}>
                  <ArtIcon
                    folder={tree.artFolder}
                    icon={ability.icon}
                    label={ability.name}
                    tint={tree.color}
                    className="picker__icon"
                  />
                  <span className="picker__text">
                    <span className="picker__name">
                      {ability.name}
                      {tree.playtest && <span className="tag">Playtest</span>}
                      {here && <span className="picker__note">In this slot</span>}
                      {!here && at >= 0 && (
                        <span className="picker__note">
                          In slot {at + 1} · {slotFilled ? 'swaps' : 'moves here'}
                        </span>
                      )}
                    </span>
                    <span className="picker__meta">
                      {[ability.castTime, ability.range, ability.cooldown].filter(Boolean).join(' · ')}
                    </span>
                    <span className="picker__desc">{ability.description}</span>
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
