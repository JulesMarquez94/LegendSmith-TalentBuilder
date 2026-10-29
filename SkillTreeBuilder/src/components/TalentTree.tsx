import { useCallback, useId, useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { artUrl } from '../art.ts'
import type { Kit } from '../game/resolve.ts'
import type { ResolvedAbility } from '../game/types.ts'
import { pointsSpent, rankOf, talentState, type Ranks } from '../talents/rules.ts'
import type { TalentDef, TreeDef } from '../talents/types.ts'
import { ArtIcon } from './ArtIcon.tsx'
import { ChoicePicker, ChoiceTooltip, SplitIcon } from './ChoiceTalent.tsx'
import { choiceState, nodesOf, takenOf, type Pair } from './choices.ts'
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
  /** Takes one side of a choice pair, swapping out the other side if it had points. */
  onTakeSide: (talent: TalentDef) => void
  /** The ability with this build's numbers, for the header icon's card. */
  live?: ResolvedAbility | null
  kit?: Kit
}

const UNLEARN_KEYS = new Set(['-', 'Backspace', 'Delete'])

const isPair = (target: TalentDef | Pair): target is Pair => Array.isArray(target)

export function TalentTree({ tree, ranks, pointsLeft, cap, onLearn, onUnlearn, onTakeSide, live, kit }: Props) {
  const tipId = useId()
  // `null` is the header icon, a pair is a choice's split icon.
  const [hover, hoverOn] = useHoverTarget<TalentDef | Pair | null>()
  // The choice whose picker is open, and the split icon it opens from.
  const [picking, setPicking] = useState<{ pair: Pair; el: HTMLElement } | null>(null)
  const closePicker = useCallback(() => setPicking(null), [])
  // Kept per tree, so a pair stays the same array between renders (hover and the picker compare it).
  const nodes = useMemo(() => nodesOf(tree), [tree])
  const rows = tree.talents.reduce((n, t) => Math.max(n, t.row + 1), 1)
  const spent = pointsSpent(tree, ranks)
  const background = tree.artFolder && tree.background ? artUrl(tree.artFolder, tree.background) : undefined
  const describedBy = (target: TalentDef | Pair | null) => (hover?.target === target ? tipId : undefined)
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

      {nodes.map((node) => {
        if ('choice' in node) {
          const pair = node.choice
          const taken = takenOf(ranks, pair)
          const state = choiceState(tree, ranks, pair, pointsLeft)
          const open = picking?.pair === pair
          return (
            <button
              key={pair[0].id}
              type="button"
              className={`talent talent--${state} talent--choice`}
              style={{ left: u(iconX((pair[0].col + pair[1].col) / 2)), top: u(iconY(pair[0].row)) }}
              aria-label={
                `Choice: ${pair[0].name} or ${pair[1].name}, ` +
                (taken ? `you took ${taken.name}, rank ${rankOf(ranks, taken)} of ${taken.maxRank}` : 'nothing taken')
              }
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-describedby={describedBy(pair)}
              onClick={(e) => {
                if (e.shiftKey) {
                  if (taken) onUnlearn(taken)
                  return
                }
                setPicking(open ? null : { pair, el: e.currentTarget })
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                if (taken) onUnlearn(taken)
              }}
              onKeyDown={(e) => {
                if (!UNLEARN_KEYS.has(e.key) || !taken) return
                e.preventDefault()
                onUnlearn(taken)
              }}
              {...hoverOn(pair)}
            >
              <SplitIcon tree={tree} pair={pair} taken={taken} />
              <span className="badge talent__rank">
                {taken ? rankOf(ranks, taken) : 0}/{(taken ?? pair[0]).maxRank}
              </span>
            </button>
          )
        }
        const { talent } = node
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

      {hover && !picking && (
        <Tooltip id={tipId} anchor={hover.el}>
          {hover.target === null ? (
            <AbilityTooltip tree={tree} live={live} />
          ) : isPair(hover.target) ? (
            <ChoiceTooltip tree={tree} pair={hover.target} ranks={ranks} pointsLeft={pointsLeft} cap={cap} kit={kit} />
          ) : (
            <TalentTooltip tree={tree} talent={hover.target} ranks={ranks} pointsLeft={pointsLeft} cap={cap} kit={kit} />
          )}
        </Tooltip>
      )}

      {picking && (
        <ChoicePicker
          tree={tree}
          pair={picking.pair}
          ranks={ranks}
          pointsLeft={pointsLeft}
          cap={cap}
          kit={kit}
          anchor={picking.el}
          onTake={(talent) => {
            onTakeSide(talent)
            setPicking(null)
          }}
          onUnlearn={onUnlearn}
          onClose={closePicker}
        />
      )}
    </section>
  )
}
