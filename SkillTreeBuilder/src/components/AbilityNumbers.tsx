import { useEffect, useRef, useState } from 'react'
import { abilityLines, abilityMeta, type NumberLine } from '../game/describe.ts'
import type { ResolvedAbility } from '../game/types.ts'
import type { SlotKind, TreeDef } from '../talents/types.ts'
import { ArtIcon } from './ArtIcon.tsx'
import { KIND_LABEL } from './labels.ts'

interface Props {
  kinds: readonly SlotKind[]
  trees: readonly (TreeDef | null)[]
  /** Each slot's ability with this build's gear and talents. */
  live: readonly (ResolvedAbility | null)[]
  /** The same abilities with no gear and no talents, to show what changed. */
  base: readonly (ResolvedAbility | null)[]
}

/** Every number on every slotted ability, live. A number flashes green when it improves and red when it drops. */
export function AbilityNumbers({ kinds, trees, live, base }: Props) {
  return (
    <section className="numbers" aria-label="Ability numbers">
      <header className="numbers__head">
        <h2 className="numbers__title">Ability numbers</h2>
        <p className="numbers__hint">
          Live with your Power, gear and talents. <span className="numbers__base">Grey</span> is the base: no Power, nothing
          equipped or learned. Power multiplies it, then talents multiply on top.
        </p>
      </header>
      <div className="numbers__grid">
        {trees.map((tree, i) => {
          if (!tree) return null
          const a = live[i]
          const baseLines = new Map((base[i] ? abilityLines(base[i]) : []).map((l) => [l.key, l]))
          return (
            <article key={tree.id} className="num-card">
              <header className="num-card__head">
                <ArtIcon folder={tree.artFolder} icon={tree.ability.icon} label={tree.ability.name} tint={tree.color} className="num-card__icon" />
                <div>
                  <div className="num-card__name">{tree.ability.name}</div>
                  <div className="num-card__kind">
                    {KIND_LABEL[kinds[i]]}
                    {a && ` · ${abilityMeta(a)}`}
                  </div>
                </div>
              </header>
              {a ? (
                <dl className="num-card__lines">
                  {abilityLines(a).map((line) => (
                    <div key={line.key} className="num-card__line">
                      <dt>{line.label}</dt>
                      <dd>
                        <Num line={line} />
                        <Base line={line} base={baseLines.get(line.key)} />
                        {line.detail && <small className="num-card__detail">{line.detail}</small>}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="num-card__none">Display only: this tree has no numbers or arena behaviour yet.</p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

const changed = (a: number, b: number) => Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(a))

/** A value that flashes when it changes: green if that's an upgrade, red if not. */
function Num({ line }: { line: NumberLine }) {
  const previous = useRef(line.value)
  const [flash, setFlash] = useState<'better' | 'worse' | null>(null)

  useEffect(() => {
    const before = previous.current
    previous.current = line.value
    if (!changed(before, line.value)) return
    setFlash(line.value > before === (line.better === 'up') ? 'better' : 'worse')
    const timer = setTimeout(() => setFlash(null), 1400)
    return () => clearTimeout(timer)
  }, [line.value, line.better])

  return <span className={flash ? `num num--${flash}` : 'num'}>{line.format(line.value)}</span>
}

function Base({ line, base }: { line: NumberLine; base: NumberLine | undefined }) {
  if (!base) return <span className="num-card__base">new</span>
  if (!changed(base.value, line.value)) return null
  return <span className="num-card__base">{base.format(base.value)}</span>
}
