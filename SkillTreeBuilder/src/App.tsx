import { useEffect, useMemo, useState } from 'react'
import { hasArt } from './art.ts'
import { AbilityNumbers } from './components/AbilityNumbers.tsx'
import { AbilityPicker, type PickerOption } from './components/AbilityPicker.tsx'
import { ArenaView } from './components/arena/ArenaView.tsx'
import { CharacterPanel } from './components/gear/CharacterPanel.tsx'
import { KIND_LABEL, SEATS, seatOf } from './components/labels.ts'
import { SlotCard } from './components/SlotCard.tsx'
import { abilityMeta } from './game/describe.ts'
import type { Gear } from './game/gear.ts'
import { buildKit } from './game/resolve.ts'
import { save, savedGear, savedLoadout } from './saved.ts'
import { pointsLeftFor, ranksIn, totalSpent } from './talents/loadout.ts'
import { canMake, fitsKind, NEEDS_LABEL, slotKinds } from './talents/slots.ts'
import type { ArtifactDef, TreeDef } from './talents/types.ts'
import { useLoadout } from './talents/useLoadout.ts'
import { validateCatalog, validateTree } from './talents/validate.ts'
import { ARTIFACTS, POINT_RULES, STARTING_LOADOUT, TREES } from './trees/index.ts'

// Checked once at load, so a typo in tree data shows up here instead of as a talent that silently never unlocks.
const PROBLEMS = [
  ...validateCatalog(TREES, ARTIFACTS, STARTING_LOADOUT),
  ...TREES.flatMap((tree) => validateTree(tree, hasArt).map((p) => `${tree.ability.name}: ${p}`)),
]

const TREE_BY_ID = new Map(TREES.map((tree) => [tree.id, tree]))

type View = 'build' | 'arena'

export default function App() {
  const build = useLoadout(savedLoadout, POINT_RULES, TREES)
  const [gear, setGear] = useState<Gear>(savedGear)
  const [view, setView] = useState<View>('build')
  const [picking, setPicking] = useState<number | null>(null)
  const { loadout } = build
  const spent = totalSpent(loadout)
  const artifact = ARTIFACTS.find((a) => a.id === loadout.artifact) ?? ARTIFACTS[0]
  const kinds = slotKinds(artifact)

  // One kit with everything applied, and one bare (no gear, no talents) to show what changed.
  const { trees, kit, bare } = useMemo(() => {
    const held = ARTIFACTS.find((a) => a.id === loadout.artifact) ?? ARTIFACTS[0]
    const trees = loadout.slots.map((id) => (id === null ? null : (TREE_BY_ID.get(id) ?? null)))
    return {
      trees,
      kit: buildKit({ artifact: held, trees, ranks: loadout.ranks, gear, catalog: TREES }),
      bare: buildKit({ artifact: held, trees, ranks: {}, gear: {}, catalog: TREES }),
    }
  }, [loadout, gear])

  useEffect(() => save({ loadout, gear }), [loadout, gear])

  const options = (slot: number): PickerOption[] => {
    if (slot === 0) {
      // Grouped by seat, two of each: tanks, healers, melee damage, ranged damage.
      const seat = (a: ArtifactDef) => SEATS.indexOf(seatOf(a))
      return [...ARTIFACTS]
        .sort((a, b) => seat(a) - seat(b))
        .map((a) => ({
          id: a.id,
          name: a.name,
          color: a.color,
          meta: `${seatOf(a)} · ${a.resource}`,
          description: a.description,
          firstVersion: a.firstVersion,
          group: seatOf(a),
          at: a.id === artifact.id ? 0 : -1,
        }))
    }
    const fitting = TREES.filter((tree) => fitsKind(tree, kinds[slot], artifact)).map((tree: TreeDef) => {
      const live = tree.spec ? kit.resolve(tree.id) : null
      const maker = ARTIFACTS.find((a) => a.id === tree.madeFor)
      return {
        id: tree.id,
        name: tree.ability.name,
        color: tree.color,
        artFolder: tree.artFolder,
        icon: tree.ability.icon,
        meta: live ? abilityMeta(live) : [tree.ability.castTime, tree.ability.range, tree.ability.cooldown].filter(Boolean).join(' · '),
        description: live?.text ?? tree.ability.description,
        playtest: tree.playtest,
        displayOnly: !tree.spec,
        madeFor: maker && { name: maker.name, color: maker.color, yours: maker.id === artifact.id },
        locked: canMake(tree, artifact) ? undefined : `Needs ${NEEDS_LABEL[tree.needs!]}`,
        at: loadout.slots.indexOf(tree.id),
      }
    })
    // Made for your weapon first, then everything else it can use, then strikes it can't make.
    const rank = (o: PickerOption) => (o.locked ? 2 : o.madeFor?.yours ? 0 : 1)
    return fitting.sort((a, b) => rank(a) - rank(b))
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__title">
          <span className="topbar__brand">LegendSmith</span>
          <span className="topbar__name">Talent Builder</span>
        </div>
        <nav className="tabs" aria-label="View">
          <button type="button" className="tabs__tab" aria-pressed={view === 'build'} onClick={() => setView('build')}>
            Build
          </button>
          <button type="button" className="tabs__tab" aria-pressed={view === 'arena'} onClick={() => setView('arena')}>
            Test arena
          </button>
        </nav>
        {view === 'build' && <p className="topbar__help">Click to learn · Right-click or Shift-click to unlearn</p>}
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

      {/* Both views stay mounted, so a paused fight survives a trip to the build view for new gear or talents. */}
      <main className="builder" hidden={view !== 'build'}>
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

        <div className="build">
          <CharacterPanel artifact={artifact} character={kit.character} gear={gear} onGear={setGear} />

          <div className="build__trees">
            <div className="slots">
              {kinds.map((kind, index) => {
                const tree = trees[index] ?? undefined
                return (
                  <SlotCard
                    key={index}
                    index={index}
                    kind={kind}
                    tree={tree}
                    ranks={tree ? ranksIn(loadout, tree) : {}}
                    pointsLeft={tree ? pointsLeftFor(loadout, tree, POINT_RULES) : 0}
                    cap={POINT_RULES.perTree}
                    artifact={artifact}
                    live={kit.slots[index] ?? null}
                    kit={kit}
                    onChoose={() => setPicking(index)}
                    onRemove={() => build.slot(index, null)}
                    onLearn={build.learn}
                    onUnlearn={build.unlearn}
                  />
                )
              })}
            </div>
            <AbilityNumbers kinds={kinds} trees={trees} live={kit.slots} base={bare.slots} />
          </div>
        </div>
      </main>
      <main className="builder builder--arena" hidden={view !== 'arena'}>
        <ArenaView kit={kit} trees={trees} active={view === 'arena'} />
      </main>

      {picking !== null && (
        <AbilityPicker
          slotIndex={picking}
          title={picking === 0 ? 'Slot 1 · Artifact' : `Slot ${picking + 1} · ${KIND_LABEL[kinds[picking]]}`}
          subtitle={
            picking === 0
              ? 'Choose the weapon you hold. It sets your role and what fits the other slots; abilities that no longer fit come out.'
              : `Choose a ${KIND_LABEL[kinds[picking]].toLowerCase()} ability. Its talent tree goes into the slot. ` +
                'Spells work with any weapon; weapon strikes and shots need a weapon that can make them.'
          }
          options={options(picking)}
          slotFilled={loadout.slots[picking] !== null}
          onPick={(id) => {
            const chosen = ARTIFACTS.find((a) => a.id === id)
            if (picking === 0 && chosen) build.hold(chosen)
            else build.slot(picking, id)
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  )
}
