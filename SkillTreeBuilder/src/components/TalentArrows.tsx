import { prerequisite, talentState, type Ranks } from '../talents/rules.ts'
import type { TalentDef, TreeDef } from '../talents/types.ts'
import { ICON, iconX, iconY, PANEL_WIDTH, panelHeight } from './layout.ts'

const GAP = 0.015 // between an arrow's ends and the icons
const HEAD = 0.09 // arrowhead length
const HALF = 0.055 // arrowhead half-width

interface Props {
  tree: TreeDef
  ranks: Ranks
  pointsLeft: number
  rows: number
}

/** Prerequisite arrows. They light up once the talent they point to can be learned. */
export function TalentArrows({ tree, ranks, pointsLeft, rows }: Props) {
  return (
    <svg className="tree__arrows" viewBox={`0 0 ${PANEL_WIDTH} ${panelHeight(rows)}`} aria-hidden="true">
      {tree.talents.map((talent) => {
        const pre = prerequisite(tree, talent)
        if (!pre) return null
        const { line, head } = arrow(pre, talent)
        const lit = talentState(tree, ranks, talent, pointsLeft) !== 'locked'
        return (
          <g key={talent.id} className={lit ? 'arrow arrow--lit' : 'arrow'}>
            <path d={line} />
            <polygon points={head} />
          </g>
        )
      })}
    </svg>
  )
}

/** Routed like WoW: sideways within a row, straight down a column, otherwise out to the side and then down. */
function arrow(from: TalentDef, to: TalentDef) {
  const fx = iconX(from.col)
  const fy = iconY(from.row)
  const tx = iconX(to.col)
  const ty = iconY(to.row)
  const mid = ICON / 2

  if (from.row === to.row) {
    const dir = to.col > from.col ? 1 : -1
    const start = dir > 0 ? fx + ICON + GAP : fx - GAP
    const tip = dir > 0 ? tx - GAP : tx + ICON + GAP
    const base = tip - dir * HEAD
    const y = fy + mid
    return { line: `M${start} ${y}H${base}`, head: `${tip},${y} ${base},${y - HALF} ${base},${y + HALF}` }
  }

  const x = tx + mid
  const tip = ty - GAP
  const base = tip - HEAD
  const head = `${x},${tip} ${x - HALF},${base} ${x + HALF},${base}`
  if (from.col === to.col) return { line: `M${x} ${fy + ICON + GAP}V${base}`, head }
  const start = to.col > from.col ? fx + ICON + GAP : fx - GAP
  return { line: `M${start} ${fy + mid}H${x}V${base}`, head }
}
