import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { abilityLines } from '../game/describe.ts'
import { reach, type Kit } from '../game/resolve.ts'
import { withResource } from '../game/stats.ts'
import type { ResolvedAbility } from '../game/types.ts'
import { describeRank } from '../talents/description.ts'
import {
  canLearn,
  canUnlearn,
  isPrerequisiteMet,
  isRowUnlocked,
  pointsSpent,
  prerequisite,
  rival,
  isRivalTaken,
  rankOf,
  rowRequirement,
  type Ranks,
} from '../talents/rules.ts'
import type { TalentDef, TreeDef } from '../talents/types.ts'
import { ArtIcon } from './ArtIcon.tsx'

const EDGE = 8
const GAP = 10

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, max))

/**
 * Floats level with `anchor`, beside its nearest `[data-tooltip-side]` ancestor (the tree panel,
 * as in the deck) so it never covers other talents. Falls back to beside the anchor itself, then
 * below or above it, when the screen is too narrow.
 */
export function Tooltip({ id, anchor, children }: { id: string; anchor: HTMLElement; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  // Placed after every render (before paint), since the content grows and shrinks as ranks change.
  useLayoutEffect(() => {
    const el = ref.current!
    el.style.left = '0px'
    const tip = el.getBoundingClientRect()
    const a = anchor.getBoundingClientRect()
    const side = anchor.closest('[data-tooltip-side]')?.getBoundingClientRect() ?? a
    const vw = document.documentElement.clientWidth
    const vh = document.documentElement.clientHeight
    const fits = (x: number) => x >= EDGE && x + tip.width <= vw - EDGE
    let left = [side.right + GAP, side.left - GAP - tip.width, a.right + GAP, a.left - GAP - tip.width].find(fits)
    let top = a.top
    if (left === undefined) {
      left = clamp(a.left + a.width / 2 - tip.width / 2, EDGE, vw - EDGE - tip.width)
      top = a.bottom + GAP + tip.height > vh - EDGE ? a.top - GAP - tip.height : a.bottom + GAP
    }
    top = clamp(top, EDGE, vh - EDGE - tip.height)
    el.style.left = `${left}px`
    el.style.top = `${top}px`
    el.style.visibility = 'visible'
  })

  return createPortal(
    <div ref={ref} id={id} role="tooltip" className="tooltip">
      {children}
    </div>,
    document.body,
  )
}

export function TipCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="tip">
      {icon}
      <div className="tip__card">
        <div className="tip__title">{title}</div>
        {children}
      </div>
    </div>
  )
}

const points = (n: number) => `${n} point${n === 1 ? '' : 's'}`

interface TalentTooltipProps {
  tree: TreeDef
  talent: TalentDef
  ranks: Ranks
  pointsLeft: number
  /** Most points the tree can hold. */
  cap: number
  /** The build's live kit, to show which slotted abilities the talent reaches. */
  kit?: Kit
}

export function TalentTooltip({ tree, talent, ranks, pointsLeft, cap, kit }: TalentTooltipProps) {
  const rank = rankOf(ranks, talent)
  const pre = prerequisite(tree, talent)
  const other = rival(tree, talent)
  const learnable = canLearn(tree, ranks, talent, pointsLeft)
  const unlearnable = canUnlearn(tree, ranks, talent)
  const atCap = pointsSpent(tree, ranks) >= cap && rank < talent.maxRank
  const reaches = kit && talent.effects ? reach(talent.effects(Math.max(rank, 1)), kit) : []
  // Shared trees say "@resource"; show the held artifact's (mana for the staff).
  const text = (r: number) => withResource(describeRank(talent.description, r), kit?.resource ?? 'Resource')
  const icon = (
    <ArtIcon folder={tree.artFolder} icon={talent.icon} label={talent.name} tint={tree.color} className="tip__icon" />
  )

  return (
    <TipCard icon={icon} title={talent.name}>
      <div className="tip__meta">
        Rank {rank}/{talent.maxRank}
      </div>
      {!isRowUnlocked(tree, ranks, talent.row) && (
        <div className="tip__req">
          Requires {points(rowRequirement(tree, talent.row))} in {tree.ability.name} Talents
        </div>
      )}
      {pre && !isPrerequisiteMet(tree, ranks, talent) && (
        <div className="tip__req">
          Requires {points(pre.maxRank)} in {pre.name}
        </div>
      )}
      {other &&
        (isRivalTaken(tree, ranks, talent) ? (
          <div className="tip__req">You took {other.name}: it's one or the other</div>
        ) : (
          <div className="tip__meta">A choice: this or {other.name}, not both</div>
        ))}
      {atCap && (
        <div className="tip__req">
          {tree.ability.name} is at its {cap}-point limit
        </div>
      )}
      <p className="tip__desc">{text(Math.max(rank, 1))}</p>
      {rank > 0 && rank < talent.maxRank && (
        <>
          <div className="tip__next">Next rank:</div>
          <p className="tip__desc">{text(rank + 1)}</p>
        </>
      )}
      {kit && talent.effects && (
        <div className="tip__reach">
          {reaches.length > 0 ? `Affects: ${reaches.join(', ')}` : 'Affects nothing you have slotted'}
        </div>
      )}
      {(learnable || unlearnable) && (
        <div className="tip__hints">
          {learnable && <div>Click to learn</div>}
          {unlearnable && <div>Right-click to unlearn</div>}
        </div>
      )}
    </TipCard>
  )
}

/** The tree's ability card, with any abilities it applies listed underneath. */
export function AbilityTooltip({ tree, live }: { tree: TreeDef; live?: ResolvedAbility | null }) {
  const { ability, effects = [] } = tree
  const icon = (
    <ArtIcon folder={tree.artFolder} icon={ability.icon} label={ability.name} tint={tree.color} className="tip__icon" />
  )
  if (live) {
    return (
      <TipCard icon={icon} title={ability.name}>
        <LiveAbility ability={live} />
      </TipCard>
    )
  }

  return (
    <TipCard icon={icon} title={ability.name}>
      <div className="tip__meta tip__meta--split">
        <span>{ability.castTime}</span>
        <span>{ability.range}</span>
      </div>
      {ability.cooldown && <div className="tip__meta tip__meta--end">{ability.cooldown}</div>}
      <p className="tip__desc">{ability.description}</p>
      {effects.length > 0 && (
        <ul className="tip__effects">
          {effects.map((effect) => (
            <li key={effect.name} className="tip__effect">
              <ArtIcon
                folder={tree.artFolder}
                icon={effect.icon}
                label={effect.name}
                tint={tree.color}
                className="tip__effect-icon"
              />
              <div>
                <div className="tip__effect-name">{effect.name}</div>
                <div className="tip__effect-desc">{effect.description}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </TipCard>
  )
}

/** A playable ability's card with its live numbers: gear and talents already applied. */
export function LiveAbility({ ability }: { ability: ResolvedAbility }) {
  return (
    <>
      <p className="tip__desc">{ability.text}</p>
      <dl className="tip__lines">
        {abilityLines(ability).map((line) => (
          <div key={line.key} className="tip__line">
            <dt>{line.label}</dt>
            <dd>
              {line.format(line.value)}
              {line.detail && <small> · {line.detail}</small>}
            </dd>
          </div>
        ))}
      </dl>
    </>
  )
}
