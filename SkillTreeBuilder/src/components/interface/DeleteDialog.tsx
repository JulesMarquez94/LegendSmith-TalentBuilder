import { useEffect, useId, useRef } from 'react'
import { raceOf } from './origins.ts'
import { kitLabel, nameOf, type Character } from './roster.ts'

interface Props {
  character: Character
  onDelete: () => void
  onClose: () => void
}

/** The confirm step before a character is deleted. Cancel has focus, so a stray Enter deletes nothing. */
export function DeleteDialog({ character, onDelete, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const name = nameOf(character)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    cancel.current?.focus()
  }, [])

  // The dialog's own close event comes a moment later: say so at once, so a quick second Delete opens it again.
  const finish = () => {
    ref.current?.close()
    onClose()
  }

  return (
    <dialog
      ref={ref}
      className="picker ui-confirm"
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        finish()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) finish()
      }}
    >
      <div className="picker__body">
        <h2 id={titleId} className="picker__title">
          Delete {name}?
        </h2>
        <p className="picker__sub">
          Level {character.level} {raceOf(character.race).name.toLowerCase()} · {kitLabel(character)}. Deleting can't be undone.
        </p>
        <div className="picker__footer ui-confirm__actions">
          <button ref={cancel} type="button" className="btn btn--lg" onClick={finish}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--lg btn--danger"
            onClick={() => {
              onDelete()
              finish()
            }}
          >
            Delete {name}
          </button>
        </div>
      </div>
    </dialog>
  )
}
