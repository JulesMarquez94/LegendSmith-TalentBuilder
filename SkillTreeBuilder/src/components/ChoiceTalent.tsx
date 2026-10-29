import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Kit } from '../game/resolve.ts'
import { withResource } from '../game/stats.ts'
import { describeRank } from '../talents/description.ts'
import {
  canTakeSide,
  canUnlearn,
  isPrerequisiteMet,
  isRowUnlocked,
  pointsSpent,
  prerequisite,
  rankOf,
  rowRequirement,
  type Ranks,
} from '../talents/rules.ts'
import type { TalentDef, TreeDef } from '../talents/types.ts'
import { ArtIcon } from './ArtIcon.tsx'
import { takenOf, type Pair } from './choices.ts'
import { placeBeside } from './place.ts'
import { TipCard } from './Tooltip.tsx'

const points = (n: number) => `${n} point${n === 1 ? '' : 's'}`

/** Both icons in one, split corner to corner: the left side top left, the right side bottom right. */
export function SplitIcon({ tree, pair, taken, className = '' }: { tree: TreeDef; pair: Pair; taken?: TalentDef; className?: string }) {
  return (
    <span className={`split ${className}`} aria-hidden="true">
      {pair.map((t, i) => (
        <ArtIcon
          key={t.id}
          folder={tree.artFolder}
          icon={t.icon}
          label={t.name}
          tint={tree.color}
          className={`split__half split__half--${i === 0 ? 'left' : 'right'}${taken && taken !== t ? ' split__half--off' : ''}`}
        />
      ))}
    </span>
  )
}

interface TipProps {
  tree: TreeDef
  pair: Pair
  ranks: Ranks
  pointsLeft: number
  cap: number
  kit?: Kit
}

/** The split icon's hover card: what the choice is, and which side you took. */
export function ChoiceTooltip({ tree, pair, ranks, cap, kit }: TipProps) {
  const taken = takenOf(ranks, pair)
  const [left, right] = pair
  const row = left.row
  const icon = <SplitIcon tree={tree} pair={pair} taken={taken} className="tip__icon" />
  const atCap = !taken && pointsSpent(tree, ranks) >= cap
  return (
    <TipCard icon={icon} title={`${left.name} or ${right.name}`}>
      <div className="tip__meta">A choice: one or the other, not both</div>
      {!isRowUnlocked(tree, ranks, row) && (
        <div className="tip__req">
          Requires {points(rowRequirement(tree, row))} in {tree.ability.name} Talents
        </div>
      )}
      {atCap && (
        <div className="tip__req">
          {tree.ability.name} is at its {cap}-point limit
        </div>
      )}
      {taken && (
        <>
          <div className="tip__meta">
            You took {taken.name}, rank {rankOf(ranks, taken)}/{taken.maxRank}
          </div>
          <p className="tip__desc">
            {withResource(describeRank(taken.description, rankOf(ranks, taken)), kit?.resource ?? 'Resource')}
          </p>
        </>
      )}
      <div className="tip__hints">
        <div>Click to see both and choose</div>
        {taken && canUnlearn(tree, ranks, taken) && <div>Right-click to unlearn</div>}
      </div>
    </TipCard>
  )
}

/** Whether a side can be taken from the picker, and what its button says. */
function sideStatus(tree: TreeDef, ranks: Ranks, talent: TalentDef, other: TalentDef, pointsLeft: number, cap: number) {
  const rank = rankOf(ranks, talent)
  if (rank >= talent.maxRank) return { can: false, label: 'Chosen' }
  if (canTakeSide(tree, ranks, talent, pointsLeft)) {
    if (rank > 0) return { can: true, label: 'Chosen · click for the next rank' }
    return { can: true, label: rankOf(ranks, other) > 0 ? `Take this instead of ${other.name}` : 'Choose this' }
  }
  if (!isRowUnlocked(tree, ranks, talent.row)) {
    return { can: false, label: `Needs ${points(rowRequirement(tree, talent.row))} in ${tree.ability.name} talents` }
  }
  const pre = prerequisite(tree, talent)
  if (pre && !isPrerequisiteMet(tree, ranks, talent)) return { can: false, label: `Needs ${pre.name} at rank ${pre.maxRank}` }
  if (pointsSpent(tree, ranks) >= cap) return { can: false, label: `${tree.ability.name} is at its ${cap}-point limit` }
  if (pointsLeft <= 0) return { can: false, label: 'No talent points left' }
  return { can: false, label: `${other.name} can't come back out` }
}

interface PickerProps extends TipProps {
  anchor: HTMLElement
  onTake: (talent: TalentDef) => void
  onUnlearn: (talent: TalentDef) => void
  /** Stable: the picker listens for clicks outside and Escape with it. */
  onClose: () => void
}

/** Opens from the split icon: both talents side by side, left and right, to pick one. */
export function ChoicePicker({ tree, pair, ranks, pointsLeft, cap, kit, anchor, onTake, onUnlearn, onClose }: PickerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const text = (t: TalentDef, rank: number) => withResource(describeRank(t.description, rank), kit?.resource ?? 'Resource')

  useLayoutEffect(() => placeBeside(ref.current!, anchor))

  useEffect(() => {
    const el = ref.current!
    el.querySelector<HTMLButtonElement>('.choice__side:not([aria-disabled="true"])')?.focus()
    const away = (e: PointerEvent) => {
      if (!el.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose()
    }
    const escape = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      onClose()
      anchor.focus()
    }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', escape)
    }
  }, [anchor, onClose])

  // Left and right arrows move between the two sides.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    ref.current!.querySelectorAll<HTMLButtonElement>('.choice__side')[i === 0 ? 1 : 0]?.focus()
  }

  return createPortal(
    <div ref={ref} className="choice" role="dialog" aria-label={`Choose ${pair[0].name} or ${pair[1].name}`}>
      <div className="choice__head">
        Choose one <span className="choice__sub">· one or the other, not both</span>
      </div>
      <div className="choice__sides">
        {pair.map((t, i) => {
          const other = pair[i === 0 ? 1 : 0]
          const rank = rankOf(ranks, t)
          const status = sideStatus(tree, ranks, t, other, pointsLeft, cap)
          const classes = ['choice__side', rank > 0 && 'choice__side--chosen', !status.can && 'choice__side--off']
          return (
            <button
              key={t.id}
              type="button"
              className={classes.filter(Boolean).join(' ')}
              aria-disabled={!status.can}
              aria-pressed={rank > 0}
              onClick={() => status.can && onTake(t)}
              onContextMenu={(e) => {
                e.preventDefault()
                onUnlearn(t)
              }}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <span className="choice__side-head">
                <ArtIcon folder={tree.artFolder} icon={t.icon} label={t.name} tint={tree.color} className="choice__icon" />
                <span>
                  <span className="choice__name">{t.name}</span>
                  <span className="choice__where">
                    {i === 0 ? 'Left' : 'Right'} · Rank {rank}/{t.maxRank}
                  </span>
                </span>
              </span>
              <span className="choice__desc">{text(t, Math.max(rank, 1))}</span>
              <span className="choice__status">{status.label}</span>
            </button>
          )
        })}
      </div>
    </div>,
    document.body,
  )
}
