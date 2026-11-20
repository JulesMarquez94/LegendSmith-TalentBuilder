import type { CSSProperties } from 'react'
import { ArtIcon } from '../../ArtIcon.tsx'
import type { HudKit, HudSlot } from './kit.ts'
import type { HudSettings } from './settings.ts'
import type { EffectIcon, HudSim } from './sim.ts'
import { barLabel, fill, keyOf, MICRO, type MicroAction } from './text.ts'
import {
  barText,
  BOSS_FRAME,
  CAST_COLOR,
  cooldownText,
  HEALTH_COLOR,
  KEYS,
  ROLE_STYLE,
  STAMINA_COLOR,
  type Scheme,
} from './unity.ts'
import { clock, type BossState, type Enemy, type GroupMember } from './world.ts'

/** A bar the HUD's way (AttributeBar): a dark track, a fill, a caption and its numbers; pips for combo points. */
function Bar({
  value,
  max,
  color,
  caption = '',
  text = '',
  pips = 0,
  className = '',
  style,
}: {
  value: number
  max: number
  color: string
  caption?: string
  text?: string
  pips?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={`hud-bar ${className}`} style={style}>
      <div className="hud-bar__fill" style={{ width: fill(value, max), background: color }} />
      {pips > 1 && (
        <div className="hud-bar__pips" aria-hidden="true">
          {Array.from({ length: pips - 1 }, (_, i) => (
            <i key={i} style={{ left: `${((i + 1) / pips) * 100}%` }} />
          ))}
        </div>
      )}
      {caption && <span className="hud-bar__caption">{caption}</span>}
      {text && <span className="hud-bar__text">{text}</span>}
    </div>
  )
}

/** Buffs first, then debuffs, each with its stacks and seconds left; an aura has no timer (EffectRowState). */
export function EffectRow({ icons, now, className = '' }: { icons: readonly EffectIcon[]; now: number; className?: string }) {
  const sorted = [...icons.filter((i) => !i.harmful), ...icons.filter((i) => i.harmful)]
  return (
    <div className={`hud-effects ${className}`}>
      {sorted.map((icon) => (
        <span
          key={`${icon.name}-${icon.harmful}`}
          className={icon.harmful ? 'hud-effect hud-effect--harmful' : 'hud-effect'}
          style={{ '--tint': icon.color } as CSSProperties}
          title={icon.name}
        >
          <ArtIcon label={icon.name} tint={icon.color} />
          {icon.stacks > 1 && <b className="hud-effect__stacks">{icon.stacks}</b>}
          {Number.isFinite(icon.endsAt) && <small className="hud-effect__time">{cooldownText(icon.endsAt - now)}</small>}
        </span>
      ))}
    </div>
  )
}

interface PlayerProps {
  kit: HudKit
  sim: HudSim
  settings: HudSettings['player']
}

/** The player bars slot: the role line, your effects above the bars, health and resource, stamina and the cast bar. */
export function PlayerBars({ kit, sim, settings }: PlayerProps) {
  const r = kit.resource
  const cast = sim.cast
  const counted = r.unity === 'imps'
  const resourceText = counted ? `${Math.floor(sim.resource)} / ${r.max}` : barLabel(sim.resource, r.max, settings.text)
  const minions = settings.minions ? kit.minions : []
  return (
    <div className={`hud-player hud-player--${settings.layout}`}>
      {settings.role && <div className="hud-player__role">{kit.roleLine}</div>}
      {(settings.effects || minions.length > 0) && (
        <div className="hud-player__row">
          {settings.effects && <EffectRow icons={sim.buffs} now={sim.t} />}
          {minions.map((m) => (
            <span key={m.name} className="hud-minions" title={`${m.name}s you command`}>
              <b>
                {sim.minions.length}/{m.max}
              </b>{' '}
              {m.name.toLowerCase()}s
              {sim.minions.length > 0 && <small>{cooldownText(sim.minions[0] - sim.t)}</small>}
            </span>
          ))}
        </div>
      )}
      <div className="hud-player__bars">
        <Bar value={sim.health} max={sim.maxHealth} color={HEALTH_COLOR} text={barLabel(sim.health, sim.maxHealth, settings.text)} />
        <Bar
          value={sim.resource}
          max={r.max}
          color={r.color}
          caption={r.label}
          text={resourceText}
          pips={r.pips ? r.max : 0}
        />
      </div>
      {settings.stamina && (
        <Bar className="hud-bar--stamina" value={sim.stamina} max={100} color={STAMINA_COLOR} style={{ opacity: sim.staminaAlpha }} />
      )}
      {settings.cast && (
        <Bar
          className="hud-bar--cast"
          value={cast ? sim.t - cast.start : 0}
          max={cast ? cast.end - cast.start : 1}
          color={CAST_COLOR}
          caption={cast ? cooldownText(cast.end - sim.t) : ''}
          text={cast?.name ?? ''}
          style={{ opacity: cast ? 1 : 0 }}
        />
      )}
    </div>
  )
}

interface ActionProps {
  kit: HudKit
  sim: HudSim
  settings: HudSettings['actions']
  /** Taller than wide: it stands on end. */
  vertical: boolean
  onUse: (index: number) => void
}

/** The seven tiles in control order, the passive group buff a little apart (ActionBar.cs), and the failure message above. */
export function ActionBar({ kit, sim, settings, vertical, onUse }: ActionProps) {
  const slots = kit.slots.filter((s) => settings.groupBuff || !s.passive)
  const scheme = settings.prompts
  return (
    <div className={vertical ? 'hud-actions hud-actions--vertical' : 'hud-actions'} style={{ '--n': slots.length } as CSSProperties}>
      {settings.messages && sim.message && (
        <div className="hud-actions__message" role="status">
          {sim.message.text}
        </div>
      )}
      <div className="hud-actions__row">
        {slots.map((slot) => (
          <ActionTile key={slot.id} slot={slot} sim={sim} settings={settings} scheme={scheme} onUse={() => onUse(kit.slots.indexOf(slot))} />
        ))}
      </div>
    </div>
  )
}

function ActionTile({
  slot,
  sim,
  settings,
  scheme,
  onUse,
}: {
  slot: HudSlot
  sim: HudSim
  settings: HudSettings['actions']
  scheme: Scheme
  onUse: () => void
}) {
  const sweep = sim.sweep(slot)
  const left = sim.cooldownLeft(slot)
  const charges = sim.charges(slot)
  const regen = slot.id === 'basic' && sim.kit.resource.regen === 0
  const unusable = slot.open && !slot.passive && !regen && slot.cost > sim.resource + 1e-6
  const state = [
    'hud-tile',
    slot.passive && 'hud-tile--passive',
    !slot.open && 'hud-tile--locked',
    unusable && 'hud-tile--unusable',
    sim.pressed?.slot === slot.id && 'hud-tile--pressed',
    sim.failed?.slot === slot.id && 'hud-tile--failed',
    sim.cast?.slot === slot.id && 'hud-tile--casting',
    left > 0 && 'hud-tile--cooling',
  ]
    .filter(Boolean)
    .join(' ')
  const key = keyOf(slot.key, scheme)
  return (
    <button
      type="button"
      className={state}
      title={`${slot.name}${key ? ` (${key})` : ' (passive)'}`}
      tabIndex={-1}
      onClick={onUse}
      style={{ '--sweep': `${sweep * 360}deg` } as CSSProperties}
    >
      <ArtIcon folder={slot.tree?.artFolder} icon={slot.tree?.ability.icon} label={slot.name} tint={slot.color} className="hud-tile__icon" />
      {settings.names && <span className="hud-tile__name">{slot.name}</span>}
      {sweep > 0 && <span className="hud-tile__sweep" />}
      {settings.cooldowns && left > 0 && <span className="hud-tile__cooldown">{cooldownText(left)}</span>}
      {!slot.open && <span className="hud-tile__lock">Lv {slot.unlock}</span>}
      {slot.charges > 1 && slot.open && <span className={charges > 0 ? 'hud-tile__charges' : 'hud-tile__charges hud-tile__charges--none'}>{charges}</span>}
      {settings.costs && slot.cost > 0 && slot.open && <span className="hud-tile__cost">{Math.round(slot.cost)}</span>}
      {key && <kbd className="hud-tile__key">{key}</kbd>}
    </button>
  )
}

/** The enemy your abilities would hit: its name, health and numbers, with your effects on it under the frame. */
export function TargetFrame({
  target,
  effects,
  now,
  settings,
}: {
  target: Enemy | null
  effects: readonly EffectIcon[]
  now: number
  settings: HudSettings['target']
}) {
  if (!target) return <div className="hud-target hud-target--none">No target</div>
  return (
    <div className="hud-target">
      <div className="hud-target__frame">
        <span className="hud-target__name">{target.name}</span>
        <Bar
          className="hud-target__bar"
          value={target.health}
          max={target.maxHealth}
          color={BOSS_FRAME.healthFill}
          text={barLabel(target.health, target.maxHealth, settings.text)}
        />
      </div>
      {settings.effects && effects.length > 0 && <EffectRow icons={effects} now={now} className="hud-effects--target" />}
    </div>
  )
}

/** The boss frame: name and difficulty, health with a tick at each phase, the phase and enrage, and the wind-up. */
export function BossFrame({ boss, settings }: { boss: BossState; settings: HudSettings['boss'] }) {
  const hard = boss.difficulty === 'hard'
  return (
    <div className="hud-boss">
      <div className="hud-boss__head">
        <span className="hud-boss__name">{boss.boss.name}</span>
        <span className="hud-boss__difficulty" style={{ color: hard ? BOSS_FRAME.hard : undefined }}>
          {BOSS_FRAME.difficulty[boss.difficulty]}
        </span>
      </div>
      <div className="hud-boss__bar" style={{ background: BOSS_FRAME.healthBack }}>
        <div className="hud-boss__fill" style={{ width: `${boss.health}%`, background: BOSS_FRAME.healthFill }} />
        {settings.ticks &&
          boss.boss.phases
            .filter((p) => p.fromHealth < 100)
            .map((p) => (
              <i
                key={p.name}
                className="hud-boss__tick"
                style={{ left: `${p.fromHealth}%`, background: boss.health <= p.fromHealth ? BOSS_FRAME.tickPassed : BOSS_FRAME.tick }}
              />
            ))}
        <span className="hud-boss__health">
          {settings.text === 'value'
            ? barText(boss.health * 900, 90000)
            : settings.text === 'both'
              ? `${barText(boss.health * 900, 90000)} · ${Math.round(boss.health)}%`
              : settings.text === 'percent'
                ? `${Math.round(boss.health)}%`
                : ''}
        </span>
      </div>
      {settings.foot && (
        <div className="hud-boss__foot">
          <span>{boss.phase.name}</span>
          <span style={{ color: boss.enrageIn > 0 ? BOSS_FRAME.enrage : 'var(--red)' }}>
            {boss.enrageIn > 0 ? `Enrage ${clock(boss.enrageIn)}` : BOSS_FRAME.enraged}
          </span>
        </div>
      )}
      {settings.cast && (
        <div className="hud-boss__cast" style={{ opacity: boss.casting ? 1 : 0 }}>
          <div className="hud-boss__cast-fill" style={{ width: `${(boss.casting?.progress ?? 0) * 100}%`, background: BOSS_FRAME.castFill }} />
          <span>
            {BOSS_FRAME.castLabel}
            {boss.casting && ` · ${boss.casting.name}`}
          </span>
        </div>
      )}
    </div>
  )
}

/** The running encounter, in a line or three: boss and difficulty, phase and time since the pull, the enrage. */
export function EncounterBar({ boss, settings }: { boss: BossState; settings: HudSettings['encounter'] }) {
  return (
    <div className="hud-encounter">
      <div className="hud-encounter__row">
        <b>{boss.boss.name}</b>
        <span>{BOSS_FRAME.difficulty[boss.difficulty]}</span>
      </div>
      <div className="hud-encounter__row">
        <span>{boss.phase.name}</span>
        {settings.elapsed && <span className="hud-encounter__time">{clock(boss.elapsed)}</span>}
      </div>
      {settings.enrage && (
        <div className="hud-encounter__enrage">{boss.enrageIn > 0 ? `Enrage ${clock(boss.enrageIn)}` : BOSS_FRAME.enraged}</div>
      )}
    </div>
  )
}

const PARTY_RESOURCE: Record<string, string> = {
  mana: 'rgb(70 130 230)',
  rage: 'rgb(210 60 50)',
  energy: 'rgb(230 200 60)',
}

/** The other seats' frames (Bots' PartyFrame): a role letter, the name, health and resource. */
export function PartyFrames({
  members,
  you,
  settings,
}: {
  members: readonly GroupMember[]
  you: { name: string; role: GroupMember['role']; health: number; maxHealth: number; resourceFill: number; resource: string }
  settings: HudSettings['party']
}) {
  const rows = [
    ...(settings.you ? [{ ...you, key: 'you', resourceKey: you.resource }] : []),
    ...members.map((m) => ({ ...m, key: m.name, resourceKey: m.resource as string })),
  ]
  return (
    <ol className="hud-party" aria-label="Group">
      {rows.map((m) => (
        <li key={m.key} className="hud-party__frame">
          {settings.roles && (
            <span className="hud-party__role" style={{ background: ROLE_STYLE[m.role].color }}>
              {ROLE_STYLE[m.role].letter}
            </span>
          )}
          <span className="hud-party__body">
            <span className="hud-party__name">
              {m.name}
              {settings.text !== 'none' && <small>{barLabel(m.health, m.maxHealth, settings.text)}</small>}
            </span>
            <span className="hud-party__bar">
              <i style={{ width: fill(m.health, m.maxHealth), background: 'rgb(80 190 90)' }} />
            </span>
            {settings.resource && (
              <span className="hud-party__bar hud-party__bar--resource">
                <i style={{ width: `${m.resourceFill * 100}%`, background: PARTY_RESOURCE[m.resourceKey] ?? 'rgb(200 200 200)' }} />
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** The key, then what it does. */
export function InteractPrompt({ text, scheme, settings }: { text: string; scheme: Scheme; settings: HudSettings['prompt'] }) {
  return (
    <div className="hud-prompt">
      {settings.key && <kbd className="hud-prompt__key">{KEYS.interact[scheme]}</kbd>}
      <span>{text}</span>
    </div>
  )
}

/** Quick buttons for the windows and the game menu; a lit one is open. */
export function MicroMenu({
  open,
  vertical,
  scheme,
  settings,
  onPick,
}: {
  open: ReadonlySet<MicroAction>
  vertical: boolean
  scheme: Scheme
  settings: HudSettings['micro']
  onPick: (action: MicroAction) => void
}) {
  return (
    <div className={vertical ? 'hud-micro hud-micro--vertical' : 'hud-micro'}>
      {MICRO.map((m) => (
        <button
          key={m.id}
          type="button"
          tabIndex={-1}
          className="hud-micro__button"
          aria-pressed={open.has(m.id)}
          title={`${m.name} (${m.key[scheme]})`}
          onClick={() => onPick(m.id)}
        >
          <span className="hud-micro__glyph" aria-hidden="true">
            {m.glyph}
          </span>
          {settings.names && <span className="hud-micro__name">{m.name}</span>}
          {settings.keys && m.key[scheme] !== '—' && <kbd className="hud-micro__key">{m.key[scheme]}</kbd>}
        </button>
      ))}
    </div>
  )
}
