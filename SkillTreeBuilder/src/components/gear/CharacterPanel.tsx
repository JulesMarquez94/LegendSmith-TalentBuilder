import { useId, useState, type CSSProperties, type HTMLAttributes } from 'react'
import { int, statValue } from '../../game/format.ts'
import { GEAR_PRESETS, RARITY_INFO, TRINKET_SLOTS, trinketName, type Gear, type TrinketSlot } from '../../game/gear.ts'
import type { CharacterSheet } from '../../game/resolve.ts'
import { SHEET_SECTIONS, STAT_INFO, TALENT_ONLY, withResource } from '../../game/stats.ts'
import type { CharStat } from '../../game/types.ts'
import type { ArtifactDef } from '../../talents/types.ts'
import { ArtIcon } from '../ArtIcon.tsx'
import { seatOf } from '../labels.ts'
import { StatIcon } from '../StatIcon.tsx'
import { Tooltip } from '../Tooltip.tsx'
import { useHoverTarget } from '../useHoverTarget.ts'
import { ForgeDialog } from './ForgeDialog.tsx'
import { ItemCard } from './ItemCard.tsx'

interface Props {
  artifact: ArtifactDef
  level: number
  character: CharacterSheet
  gear: Gear
  onGear: (gear: Gear) => void
}

type Hovered = { kind: 'slot'; slot: TrinketSlot } | { kind: 'stat'; stat: CharStat }

/** The gear set picker's groups, in the order the presets list them. */
const PRESET_GROUPS = [...new Set(GEAR_PRESETS.flatMap((p) => (p.group ? [p.group] : [])))]

/**
 * The character third of the overview's character screen: 12 trinkets around Power, Health and the
 * resource, then the other stats in sections (secondary, defensive, extra).
 */
export function CharacterPanel({ artifact, level, character, gear, onGear }: Props) {
  const tipId = useId()
  const [hover, hoverOn] = useHoverTarget<Hovered>()
  const [forging, setForging] = useState<TrinketSlot | null>(null)
  const { stats, lines } = character
  const left = TRINKET_SLOTS.slice(0, 6)
  const right = TRINKET_SLOTS.slice(6)
  const presetId = GEAR_PRESETS.find((p) => sameGear(p.gear, gear))?.id ?? ''

  const slotButton = (slot: TrinketSlot) => {
    const t = gear[slot]
    const hovered = hover?.target.kind === 'slot' && hover.target.slot === slot
    return (
      <button
        key={slot}
        type="button"
        className={t ? 'trinket' : 'trinket trinket--empty'}
        style={t ? ({ '--rc': RARITY_INFO[t.rarity].color } as CSSProperties) : undefined}
        aria-label={t ? `${trinketName(t)}, ${RARITY_INFO[t.rarity].label}, item level ${t.itemLevel}` : `${slot}, empty`}
        aria-describedby={hovered ? tipId : undefined}
        onClick={() => setForging(slot)}
        {...hoverOn({ kind: 'slot', slot })}
      >
        {t ? (
          <>
            <span className="trinket__slot">{slot[0]}</span>
            {/* The stat an item leans toward gets the bigger icon. */}
            <span className="trinket__icons">
              {t.stats.map((stat, i) => (
                <StatIcon key={stat} stat={stat} size={t.lean === undefined ? 18 : t.lean === i ? 22 : 13} />
              ))}
            </span>
            <span className="trinket__ilvl">{t.itemLevel}</span>
          </>
        ) : (
          <span className="trinket__type">{slot}</span>
        )}
      </button>
    )
  }

  const label = (stat: CharStat) => withResource(STAT_INFO[stat].label, artifact.resource)

  return (
    <aside className="char" data-tooltip-side aria-label="Character">
      <header className="char__head">
        <ArtIcon label={artifact.name} tint={artifact.color} className="char__artifact" />
        <div>
          <div className="char__title">Hero · Level {level}</div>
          <div className="char__sub">
            {seatOf(artifact)} · {artifact.name}
            {artifact.firstVersion && ' · First version'}
          </div>
        </div>
      </header>

      <div className="char__gear">
        <div className="char__col">{left.map(slotButton)}</div>
        <div className="char__vitals">
          <div className="char__main">
            <Vital label="Power" value={`+${statValue('power', stats.power)}`} color="#ffffff" {...hoverOn({ kind: 'stat', stat: 'power' })} />
            <Vital label="Health" value={int(stats.health)} color="#8fe3a0" {...hoverOn({ kind: 'stat', stat: 'health' })} />
          </div>
          {stats.maxResource > 0 && (
            <Vital
              label={artifact.resource}
              value={int(stats.maxResource)}
              sub={stats.resourceRegen ? `+${statValue('resourceRegen', stats.resourceRegen)}` : undefined}
              color="#5aa9ff"
              {...hoverOn({ kind: 'stat', stat: 'maxResource' })}
            />
          )}
          <p className="char__hint">Click a slot to make or change a trinket.</p>
        </div>
        <div className="char__col">{right.map(slotButton)}</div>
      </div>

      <div className="char__presets">
        <label className="char__preset">
          <span>Gear set</span>
          <select
            value={presetId}
            onChange={(e) => {
              const preset = GEAR_PRESETS.find((p) => p.id === e.target.value)
              if (preset) onGear(preset.gear)
            }}
          >
            {presetId === '' && <option value="">Custom</option>}
            {GEAR_PRESETS.filter((p) => !p.group).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            {PRESET_GROUPS.map((group) => (
              <optgroup key={group} label={group}>
                {GEAR_PRESETS.filter((p) => p.group === group).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      {SHEET_SECTIONS.map((section) => (
        <section key={section.title} className="stats" aria-label={section.title}>
          <h3 className="stats__title">{section.title}</h3>
          <dl className="stats__list">
            {section.stats
              .filter((stat) => !TALENT_ONLY.has(stat) || stats[stat] !== 0)
              .map((stat) => (
                <div key={stat} className="stats__row" tabIndex={0} {...hoverOn({ kind: 'stat', stat })}>
                  <dt style={{ color: STAT_INFO[stat].color }}>
                    <StatIcon stat={stat} size={13} />
                    {label(stat)}
                  </dt>
                  <dd>{statValue(stat, stats[stat])}</dd>
                </div>
              ))}
          </dl>
        </section>
      ))}

      {hover && (
        <Tooltip id={tipId} anchor={hover.el}>
          {hover.target.kind === 'slot' ? (
            gear[hover.target.slot] ? (
              <ItemCard trinket={gear[hover.target.slot]!} />
            ) : (
              <div className="item item--empty">
                <div className="item__name">{hover.target.slot}</div>
                <div className="item__req">Empty. Click to make a trinket for this slot.</div>
              </div>
            )
          ) : (
            <StatTip stat={hover.target.stat} line={lines[hover.target.stat]} resource={artifact.resource} />
          )}
        </Tooltip>
      )}

      {forging && <ForgeDialog slot={forging} gear={gear} onSave={onGear} onClose={() => setForging(null)} />}
    </aside>
  )
}

interface VitalProps extends HTMLAttributes<HTMLDivElement> {
  label: string
  value: string
  sub?: string
  color: string
}

function Vital({ label, value, sub, color, ...hover }: VitalProps) {
  return (
    <div className="vital" tabIndex={0} {...hover}>
      <span className="vital__label">{label}</span>
      <span className="vital__value" style={{ color }}>
        {value}
        {sub && <small> {sub}</small>}
      </span>
    </div>
  )
}

function StatTip({ stat, line, resource }: { stat: CharStat; line: CharacterSheet['lines'][CharStat]; resource: string }) {
  const info = STAT_INFO[stat]
  const part = (label: string, n: number) => (
    <div className="item__line">
      <span>{label}</span>
      <b>{statValue(stat, n)}</b>
    </div>
  )
  return (
    <div className="item" style={{ '--rc': info.color } as CSSProperties}>
      <div className="item__name">{withResource(info.label, resource)}</div>
      <div className="item__req">{withResource(info.help, resource)}</div>
      <div className="item__parts">
        {part('Base', line.base)}
        {line.gear !== 0 && part('Trinkets', line.gear)}
        {line.talents !== 0 && part('Talents', line.talents)}
        {part('Total', line.total)}
      </div>
    </div>
  )
}

function sameGear(a: Gear, b: Gear): boolean {
  return TRINKET_SLOTS.every((s) => JSON.stringify(a[s] ?? null) === JSON.stringify(b[s] ?? null))
}
