import type { CSSProperties } from 'react'
import type { Kit } from '../game/resolve.ts'
import type { ResolvedAbility } from '../game/types.ts'
import type { Ranks } from '../talents/rules.ts'
import type { ArtifactDef, SlotKind, TalentDef, TreeDef } from '../talents/types.ts'
import { ArtIcon } from './ArtIcon.tsx'
import { KIND_LABEL } from './labels.ts'
import { TalentTree } from './TalentTree.tsx'

interface Props {
  index: number
  kind: SlotKind
  /** The level that opens the slot, while it's still closed. */
  opensAt?: number
  tree: TreeDef | undefined
  ranks: Ranks
  pointsLeft: number
  cap: number
  artifact: ArtifactDef
  live: ResolvedAbility | null
  kit: Kit
  onChoose: () => void
  onRemove: () => void
  onLearn: (tree: TreeDef, talent: TalentDef) => void
  onUnlearn: (tree: TreeDef, talent: TalentDef) => void
  onTakeSide: (tree: TreeDef, talent: TalentDef) => void
}

export function SlotCard(props: Props) {
  const { index, kind, opensAt, tree, ranks, pointsLeft, cap, artifact, live, kit, onChoose, onRemove, onLearn, onUnlearn, onTakeSide } =
    props
  const isArtifact = kind === 'artifact'
  const label = KIND_LABEL[kind]

  if (opensAt !== undefined) {
    return (
      <section className="slot" aria-label={`Slot ${index + 1}: ${label}, opens at level ${opensAt}`}>
        <header className="slot__head">
          <span className="slot__num">{index + 1}</span>
          <span className="slot__kind">{label}</span>
        </header>
        <div className="slot__empty slot__empty--locked">
          <span className="slot__lock">Locked</span>
          Opens at level {opensAt}
        </div>
      </section>
    )
  }

  return (
    <section className="slot" aria-label={`Slot ${index + 1}: ${isArtifact ? `${label}, ${artifact.name}` : label}`}>
      <header className="slot__head">
        <span className="slot__num">{index + 1}</span>
        <span className="slot__kind">{label}</span>
        {isArtifact && <span className="slot__name">{artifact.name}</span>}
        {tree?.playtest && <span className="tag">Playtest</span>}
        {tree && !tree.spec && <span className="tag">Display only</span>}
        {(tree || isArtifact) && (
          <span className="slot__actions">
            <button type="button" className="btn" onClick={onChoose}>
              Change
            </button>
            {!isArtifact && (
              <button type="button" className="btn" aria-label={`Remove ${tree!.ability.name}`} onClick={onRemove}>
                ✕
              </button>
            )}
          </span>
        )}
      </header>

      {tree ? (
        <TalentTree
          tree={tree}
          ranks={ranks}
          pointsLeft={pointsLeft}
          cap={cap}
          live={live}
          kit={kit}
          onLearn={(talent) => onLearn(tree, talent)}
          onUnlearn={(talent) => onUnlearn(tree, talent)}
          onTakeSide={(talent) => onTakeSide(tree, talent)}
        />
      ) : isArtifact ? (
        <div className="artifact" style={{ '--tint': artifact.color } as CSSProperties}>
          <ArtIcon label={artifact.name} tint={artifact.color} className="artifact__icon" />
          <div className="artifact__name">{artifact.name}</div>
          <p className="artifact__note">{artifact.description}</p>
          <span className="tag">No tree yet</span>
        </div>
      ) : (
        <button type="button" className="slot__empty" onClick={onChoose}>
          <span className="slot__plus" aria-hidden="true">
            +
          </span>
          Add {/^[aeiou]/i.test(label) ? 'an' : 'a'} {label.toLowerCase()} ability
        </button>
      )}
    </section>
  )
}
