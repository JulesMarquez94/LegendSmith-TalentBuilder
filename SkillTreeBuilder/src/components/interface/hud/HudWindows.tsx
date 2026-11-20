import { useState, type CSSProperties } from 'react'
import { int, statValue } from '../../../game/format.ts'
import { GEAR_PRESETS, RARITY_INFO, requiredLevel, TRINKET_SLOTS, trinketName, type Gear } from '../../../game/gear.ts'
import { SHEET_SECTIONS, STAT_INFO, TALENT_ONLY } from '../../../game/stats.ts'
import { KIND_LABEL } from '../../labels.ts'
import { ArtIcon } from '../../ArtIcon.tsx'
import type { Appearance } from '../appearance.ts'
import { CharacterFigure } from '../CharacterFigure.tsx'
import type { HudKit } from './kit.ts'
import type { HudSettings } from './settings.ts'
import { BAG_SIZE, KEYS, type Scheme } from './unity.ts'
import { bagView, freeSlots, type BagItem } from './world.ts'

/** The gear sets you can put on in one go: a few of the builder's presets. */
const GEAR_SETS = ['none', 'common-crit', 'rare-100', 'even-mix', 'main-haste', 'main-crit'].flatMap((id) => {
  const preset = GEAR_PRESETS.find((p) => p.id === id)
  if (!preset) return []
  const levels = Object.values(preset.gear).map((t) => requiredLevel(t.itemLevel))
  return [{ ...preset, level: levels.length > 0 ? Math.max(...levels) : 1 }]
})

const sameGear = (a: Gear, b: Gear) => JSON.stringify(a) === JSON.stringify(b)

function Close({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <button type="button" className="hud-window__close" aria-label={label} tabIndex={-1} onClick={onClose}>
      ✕
    </button>
  )
}

interface CharacterProps {
  name: string
  level: number
  appearance: Appearance
  kit: HudKit
  gear: Gear
  bag: readonly BagItem[]
  scheme: Scheme
  settings: HudSettings['character']
  onGear: (gear: Gear) => void
  onClose: () => void
}

/**
 * The character screen, laid out as the game's (HUD UI_HUD.uxml): the character side (head, trinkets
 * around the vitals, the bag, the artifact, the model, the stats) and the trees side with the slots.
 * Gear sets are new: one click puts a whole set on.
 */
export function CharacterScreen({ name, level, appearance, kit, gear, bag, scheme, settings, onGear, onClose }: CharacterProps) {
  const { stats } = kit.kit.character
  const trinkets = bag.filter((i) => i.category === 'Trinkets')
  const left = TRINKET_SLOTS.slice(0, 6)
  const right = TRINKET_SLOTS.slice(6)
  const slotButton = (slot: (typeof TRINKET_SLOTS)[number]) => {
    const t = gear[slot]
    return (
      <span
        key={slot}
        className={t ? 'hud-char__trinket' : 'hud-char__trinket hud-char__trinket--empty'}
        style={t ? ({ '--rc': RARITY_INFO[t.rarity].color } as CSSProperties) : undefined}
        title={t ? `${trinketName(t)} · item level ${t.itemLevel}` : `${slot}, empty`}
      >
        {t ? (
          <>
            <b>{slot[0]}</b>
            <small>{t.itemLevel}</small>
          </>
        ) : (
          <small>{slot}</small>
        )}
      </span>
    )
  }
  const sections = settings.stats === 'all' ? SHEET_SECTIONS : []

  return (
    <section className="hud-window hud-char" aria-label="Character">
      <header className="hud-window__head">
        <b className="hud-window__title">CHARACTER</b>
        <span className="hud-char__summary">
          {name} · Level {level}
        </span>
        <span className="hud-window__hint">
          {KEYS.character[scheme]} or {KEYS.menu[scheme]} to close
        </span>
        <Close onClose={onClose} label="Close the character screen" />
      </header>
      <div className={settings.trees ? 'hud-char__body' : 'hud-char__body hud-char__body--side'}>
        <div className="hud-char__side">
          <div className="hud-char__head">
            <ArtIcon label={kit.artifact.name} tint={kit.artifact.color} className="hud-char__artifact" />
            <span>
              <b>
                {name} · Level {level}
              </b>
              <small>{kit.roleLine}</small>
            </span>
          </div>
          <div className="hud-char__gear">
            <div className="hud-char__column">{left.map(slotButton)}</div>
            <div className="hud-char__vitals">
              <span className="hud-char__vital">
                <small>Power</small>
                <b>+{statValue('power', stats.power)}</b>
              </span>
              <span className="hud-char__vital hud-char__vital--health">
                <small>Health</small>
                <b>{int(stats.health * (1 + stats.healthPct / 100))}</b>
              </span>
              <span className="hud-char__vital hud-char__vital--resource">
                <small>{kit.resource.name}</small>
                <b>{int(kit.resource.max)}</b>
                {kit.resource.regen > 0 && <em>+{kit.resource.regen} /sec</em>}
              </span>
              <CharacterFigure appearance={appearance} artifact={kit.artifact} className="hud-char__figure" />
            </div>
            <div className="hud-char__column">{right.map(slotButton)}</div>
          </div>
          <div className="hud-char__section">
            <h4>
              Gear sets <span className="tag">New</span>
            </h4>
            <div className="hud-char__sets">
              {GEAR_SETS.map((set) => (
                <button
                  key={set.id}
                  type="button"
                  tabIndex={-1}
                  className="hud-char__set"
                  aria-pressed={sameGear(set.gear, gear)}
                  disabled={set.level > level}
                  title={set.level > level ? `Needs level ${set.level}` : set.name}
                  onClick={() => onGear(set.gear)}
                >
                  {set.name.split(' · ')[0]}
                  {set.level > level && <small>Lv {set.level}</small>}
                </button>
              ))}
            </div>
          </div>
          <div className="hud-char__section">
            <h4>
              Bag {trinkets.length} / {BAG_SIZE}
            </h4>
            <div className="hud-char__bag">
              {trinkets.map((t) => (
                <span key={t.id} className="hud-char__bag-item" style={{ color: t.color }} title={t.detail}>
                  {t.name}
                </span>
              ))}
            </div>
          </div>
          {sections.map((section) => {
            const shown = section.stats.filter((s) => !TALENT_ONLY.has(s) || stats[s] !== 0)
            if (shown.length === 0) return null
            return (
              <div key={section.title} className="hud-char__section">
                <h4>{section.title}</h4>
                <dl className="hud-char__stats">
                  {shown.map((s) => (
                    <div key={s}>
                      <dt style={{ color: STAT_INFO[s].color }}>{STAT_INFO[s].label.replace('@Resource', kit.resource.name)}</dt>
                      <dd>{statValue(s, stats[s])}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )
          })}
        </div>
        {settings.trees && (
          <div className="hud-char__trees">
            {kit.slots.map((slot, i) => (
              <div key={slot.id} className={slot.open ? 'hud-char__card' : 'hud-char__card hud-char__card--locked'}>
                <span className="hud-char__card-head">
                  Slot {i + 1} · {slot.tree ? KIND_LABEL[slot.tree.kind] : slot.passive ? 'Group buff' : 'Ability'}
                  {slot.key && <kbd>{slot.key[scheme]}</kbd>}
                </span>
                <ArtIcon folder={slot.tree?.artFolder} icon={slot.tree?.ability.icon} label={slot.name} tint={slot.color} className="hud-char__card-icon" />
                <b>{slot.name}</b>
                <small>{slot.open ? (slot.tree ? `${slot.tree.talents.length} talents · 0 points spent` : 'Unity only: no tree yet') : `Opens at level ${slot.unlock}`}</small>
              </div>
            ))}
            <div className={level >= 8 ? 'hud-char__card' : 'hud-char__card hud-char__card--locked'}>
              <span className="hud-char__card-head">Slot 8 · Character skills</span>
              <b>Character tree</b>
              <small>{level >= 8 ? 'Nothing to spec yet' : 'Opens at level 8'}</small>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

interface BagsProps {
  items: readonly BagItem[]
  settings: HudSettings['bags']
  onClose: () => void
}

/** One bag of 30 that sorts itself into categories, with a search box. New: the game's bag is a list on the character screen. */
export function Bags({ items, settings, onClose }: BagsProps) {
  const [query, setQuery] = useState('')
  const groups = bagView(items, settings.search ? query : '', settings.categories)
  return (
    <section className="hud-window hud-bags" aria-label="Bags">
      <header className="hud-window__head">
        <b className="hud-window__title">BAG</b>
        <span className="hud-bags__count">
          {items.length} / {BAG_SIZE}
        </span>
        <Close onClose={onClose} label="Close the bags" />
      </header>
      {settings.search && (
        <input
          className="hud-bags__search"
          type="search"
          placeholder="Search the bag"
          aria-label="Search the bag"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      <div className="hud-bags__list">
        {groups.length === 0 && <p className="hud-bags__empty">Nothing matches “{query}”.</p>}
        {groups.map((g) => (
          <div key={g.category} className="hud-bags__group">
            {settings.categories && <h4>{g.category}</h4>}
            <div className="hud-bags__slots">
              {g.items.map((item) => (
                <span
                  key={item.id}
                  className={settings.rarity && item.rarity ? 'hud-bags__item hud-bags__item--rarity' : 'hud-bags__item'}
                  style={{ '--rc': item.color } as CSSProperties}
                  title={`${item.name}\n${item.detail}`}
                >
                  <ArtIcon label={item.name} tint={item.color} />
                  {item.count > 1 && <b>{item.count}</b>}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <footer className="hud-bags__foot">{freeSlots(items)} free</footer>
    </section>
  )
}
