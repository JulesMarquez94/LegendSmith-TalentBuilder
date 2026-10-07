import type { CSSProperties } from 'react'
import type { Ranks } from '../talents/rules.ts'
import type { SlotKind, TalentDef, TreeDef } from '../talents/types.ts'
import { ArtIcon } from './ArtIcon.tsx'
import { KIND_LABEL } from './labels.ts'
import { TalentTree } from './TalentTree.tsx'

interface Props {
  index: number
  kind: SlotKind
  tree: TreeDef | undefined
  ranks: Ranks
  pointsLeft: number
  cap: number
  artifact: { name: string; color: string }
  onChoose: () => void
  onRemove: () => void
  onLearn: (tree: TreeDef, talent: TalentDef) => void
  onUnlearn: (tree: TreeDef, talent: TalentDef) => void
}

export function SlotCard(props: Props) {
  const { index, kind, tree, ranks, pointsLeft, cap, artifact, onChoose, onRemove, onLearn, onUnlearn } = props
  const label = KIND_LABEL[kind]

  return (
    <section className="slot" aria-label={`Slot ${index + 1}: ${label}`}>
      <header className="slot__head">
        <span className="slot__num">{index + 1}</span>
        <span className="slot__kind">{label}</span>
        {tree?.playtest && <span className="tag">Playtest</span>}
        {tree && (
          <span className="slot__actions">
            <button type="button" className="btn" onClick={onChoose}>
              Change
            </button>
            <button type="button" className="btn" aria-label={`Remove ${tree.ability.name}`} onClick={onRemove}>
              ✕
            </button>
          </span>
        )}
      </header>

      {kind === 'artifact' ? (
        <div className="artifact" style={{ '--tint': artifact.color } as CSSProperties}>
          <ArtIcon label={artifact.name} tint={artifact.color} className="artifact__icon" />
          <div className="artifact__name">{artifact.name}</div>
          <p className="artifact__note">
            Your artifact's main ability goes here. Later it will decide which abilities fit the other slots.
          </p>
          <span className="tag">Coming later</span>
        </div>
      ) : tree ? (
        <TalentTree
          tree={tree}
          ranks={ranks}
          pointsLeft={pointsLeft}
          cap={cap}
          onLearn={(talent) => onLearn(tree, talent)}
          onUnlearn={(talent) => onUnlearn(tree, talent)}
        />
      ) : (
        <button type="button" className="slot__empty" onClick={onChoose}>
          <span className="slot__plus" aria-hidden="true">
            +
          </span>
          Add a {label.toLowerCase()} ability
        </button>
      )}
    </section>
  )
}
