import { useState } from 'react'
import { hasArt } from './art.ts'
import { AbilityPicker } from './components/AbilityPicker.tsx'
import { SlotCard } from './components/SlotCard.tsx'
import { pointsLeftFor, ranksIn, totalSpent } from './talents/loadout.ts'
import { useLoadout } from './talents/useLoadout.ts'
import { validateCatalog, validateTree } from './talents/validate.ts'
import { ARTIFACT, POINT_RULES, SLOTS, STARTING_LOADOUT, TREES } from './trees/index.ts'

// Checked once at load, so a typo in tree data shows up here instead of as a talent that silently never unlocks.
const PROBLEMS = [
  ...validateCatalog(TREES, SLOTS, STARTING_LOADOUT.slots),
  ...TREES.flatMap((tree) => validateTree(tree, hasArt).map((p) => `${tree.ability.name}: ${p}`)),
]

const TREE_BY_ID = new Map(TREES.map((tree) => [tree.id, tree]))

export default function App() {
  const build = useLoadout(STARTING_LOADOUT, POINT_RULES)
  const [picking, setPicking] = useState<number | null>(null)
  const spent = totalSpent(build.loadout)

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__title">
          <span className="topbar__brand">LegendSmith</span>
          <span className="topbar__name">Talent Builder</span>
        </div>
        <p className="topbar__help">Click to learn · Right-click or Shift-click to unlearn</p>
        <div className="points">
          <span className="points__label">Talent points</span>
          <span className="points__left" aria-live="polite">
            {POINT_RULES.total - spent}
          </span>
          <span className="points__total">
            / {POINT_RULES.total} · max {POINT_RULES.perTree} per tree
          </span>
        </div>
        <button type="button" className="btn btn--lg" onClick={build.resetTalents} disabled={spent === 0}>
          Reset talents
        </button>
      </header>

      <main className="builder">
        {PROBLEMS.length > 0 && (
          <div className="data-problems" role="alert">
            <strong>Tree data needs fixing</strong>
            <ul>
              {PROBLEMS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="slots">
          {SLOTS.map((kind, index) => {
            const id = build.loadout.slots[index]
            const tree = id === null ? undefined : TREE_BY_ID.get(id)
            return (
              <SlotCard
                key={index}
                index={index}
                kind={kind}
                tree={tree}
                ranks={tree ? ranksIn(build.loadout, tree) : {}}
                pointsLeft={tree ? pointsLeftFor(build.loadout, tree, POINT_RULES) : 0}
                cap={POINT_RULES.perTree}
                artifact={ARTIFACT}
                onChoose={() => setPicking(index)}
                onRemove={() => build.slot(index, null)}
                onLearn={build.learn}
                onUnlearn={build.unlearn}
              />
            )
          })}
        </div>
      </main>

      {picking !== null && (
        <AbilityPicker
          slotIndex={picking}
          kind={SLOTS[picking]}
          trees={TREES.filter((tree) => tree.kind === SLOTS[picking])}
          slots={build.loadout.slots}
          onPick={(treeId) => build.slot(picking, treeId)}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  )
}
