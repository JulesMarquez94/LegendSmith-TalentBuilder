import { isSlotOpen, slotLevel } from '../talents/levels.ts'
import type { ArtifactDef, SlotKind, TreeDef } from '../talents/types.ts'
import { ArtIcon } from './ArtIcon.tsx'
import { SLOT_KEYS } from './arena/keys.ts'
import { KIND_LABEL } from './labels.ts'

interface Props {
  kinds: readonly SlotKind[]
  trees: readonly (TreeDef | null)[]
  artifact: ArtifactDef
  /** Slots above it are still closed. */
  level: number
  /** Points spent and the cap, per slot ("4/12"), or null for an empty slot. */
  points: readonly (string | null)[]
  onChoose: (index: number) => void
}

/** The first block of the grid: every slot top to bottom, with its key and what it holds. Click to change it. */
export function SlotOverview({ kinds, trees, artifact, level, points, onChoose }: Props) {
  return (
    <section className="slot" aria-label="Overview">
      <header className="slot__head">
        <span className="slot__kind">Overview</span>
      </header>
      <ol className="overview">
        {kinds.map((kind, index) => {
          // The character skill tree has a tab of its own.
          if (kind === 'character') return null
          const tree = trees[index]
          const key = SLOT_KEYS[index] ?? 'Passive'
          if (!isSlotOpen(index, level)) {
            return (
              <li key={index}>
                <div className="overview__row overview__row--locked" aria-label={`Slot ${index + 1}, ${KIND_LABEL[kind]}: opens at level ${slotLevel(index)}`}>
                  <span className="overview__key">{key}</span>
                  <span className="overview__icon overview__icon--empty" aria-hidden="true" />
                  <span className="overview__text">
                    <span className="overview__name">Level {slotLevel(index)}</span>
                    <span className="overview__kind">
                      {index + 1} · {KIND_LABEL[kind]}
                    </span>
                  </span>
                </div>
              </li>
            )
          }
          // Slot 1 always holds the artifact, with or without a tree.
          const name = tree?.ability.name ?? (index === 0 ? artifact.name : 'Empty')
          return (
            <li key={index}>
              <button
                type="button"
                className={tree || index === 0 ? 'overview__row' : 'overview__row overview__row--empty'}
                aria-label={`Slot ${index + 1}, ${KIND_LABEL[kind]}: ${name}, key ${key}. Change it.`}
                onClick={() => onChoose(index)}
              >
                <span className="overview__key">{key}</span>
                {tree || index === 0 ? (
                  <ArtIcon
                    folder={tree?.artFolder}
                    icon={tree?.ability.icon}
                    label={name}
                    tint={tree?.color ?? artifact.color}
                    className="overview__icon"
                  />
                ) : (
                  <span className="overview__icon overview__icon--empty" aria-hidden="true" />
                )}
                <span className="overview__text">
                  <span className="overview__name">{name}</span>
                  <span className="overview__kind">
                    {index + 1} · {index === 0 && tree ? artifact.name : KIND_LABEL[kind]}
                  </span>
                </span>
                {points[index] && <span className="overview__points">{points[index]}</span>}
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
