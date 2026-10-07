import { useId, type CSSProperties, type KeyboardEvent } from 'react'
import { artUrl } from '../art.ts'
import { pointsSpent, rankOf, talentState, type Ranks } from '../talents/rules.ts'
import type { TalentDef, TreeDef } from '../talents/types.ts'
import { ArtIcon } from './ArtIcon.tsx'
import { iconX, iconY, panelHeight, u } from './layout.ts'
import { TalentArrows } from './TalentArrows.tsx'
import { AbilityTooltip, TalentTooltip, Tooltip } from './Tooltip.tsx'
import { useHoverTarget } from './useHoverTarget.ts'

interface Props {
  tree: TreeDef
  ranks: Ranks
  /** Points this tree can still take (the shared pool, limited by the per-tree cap). */
  pointsLeft: number
  /** Most points the tree can hold. */
  cap: number
  onLearn: (talent: TalentDef) => void
  onUnlearn: (talent: TalentDef) => void
}

const UNLEARN_KEYS = new Set(['-', 'Backspace', 'Delete'])

export function TalentTree({ tree, ranks, pointsLeft, cap, onLearn, onUnlearn }: Props) {
  const tipId = useId()
  // `null` is the header icon.
  const [hover, hoverOn] = useHoverTarget<TalentDef | null>()
  const rows = tree.talents.reduce((n, t) => Math.max(n, t.row + 1), 1)
  const spent = pointsSpent(tree, ranks)
  const background = tree.artFolder && tree.background ? artUrl(tree.artFolder, tree.background) : undefined
  const describedBy = (target: TalentDef | null) => (hover?.target === target ? tipId : undefined)
  const { ability } = tree

  return (
    <section
      className={background ? 'tree' : 'tree tree--placeholder'}
      data-tooltip-side
      aria-label={`${ability.name} talents`}
      style={
        {
          height: u(panelHeight(rows)),
          backgroundImage: background && `url("${background}")`,
          '--tint': tree.color,
        } as CSSProperties
      }
      onContextMenu={(e) => e.preventDefault()}
    >
      <TalentArrows tree={tree} ranks={ranks} pointsLeft={pointsLeft} rows={rows} />

      <header className="tree__header">
        <button
          type="button"
          className="tree__emblem"
          aria-label={`${ability.name}, ${spent} of ${cap} points spent`}
          aria-describedby={describedBy(null)}
          {...hoverOn(null)}
        >
          <ArtIcon folder={tree.artFolder} icon={ability.icon} label={ability.name} tint={tree.color} />
          <span className="badge tree__spent">
            {spent}/{cap}
          </span>
        </button>
        <h2 className="tree__name">{ability.name}</h2>
      </header>
      <div className="tree__divider" />

      {tree.talents.map((talent) => {
        const rank = rankOf(ranks, talent)
        const state = talentState(tree, ranks, talent, pointsLeft)
        const onKeyDown = (e: KeyboardEvent) => {
          if (!UNLEARN_KEYS.has(e.key)) return
          e.preventDefault()
          onUnlearn(talent)
        }
        return (
          <button
            key={talent.id}
            type="button"
            className={`talent talent--${state}`}
            style={{ left: u(iconX(talent.col)), top: u(iconY(talent.row)) }}
            aria-label={`${talent.name}, rank ${rank} of ${talent.maxRank}`}
            aria-disabled={state === 'locked'}
            aria-describedby={describedBy(talent)}
            onClick={(e) => (e.shiftKey ? onUnlearn(talent) : onLearn(talent))}
            onContextMenu={(e) => {
              e.preventDefault()
              onUnlearn(talent)
            }}
            onKeyDown={onKeyDown}
            {...hoverOn(talent)}
          >
            <ArtIcon folder={tree.artFolder} icon={talent.icon} label={talent.name} tint={tree.color} />
            <span className="badge talent__rank">
              {rank}/{talent.maxRank}
            </span>
          </button>
        )
      })}

      {hover && (
        <Tooltip id={tipId} anchor={hover.el}>
          {hover.target ? (
            <TalentTooltip tree={tree} talent={hover.target} ranks={ranks} pointsLeft={pointsLeft} cap={cap} />
          ) : (
            <AbilityTooltip tree={tree} />
          )}
        </Tooltip>
      )}
    </section>
  )
}
