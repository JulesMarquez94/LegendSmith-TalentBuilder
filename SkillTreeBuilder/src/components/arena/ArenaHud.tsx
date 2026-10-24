import { useId, type CSSProperties } from 'react'
import { int, sec } from '../../game/format.ts'
import type { Ally, Arena } from '../../game/sim/arena.ts'
import type { TreeDef } from '../../talents/types.ts'
import { ArtIcon } from '../ArtIcon.tsx'
import { LiveAbility, TipCard, Tooltip } from '../Tooltip.tsx'
import { useHoverTarget } from '../useHoverTarget.ts'
import { SLOT_KEYS } from './keys.ts'

const ROLE_LABEL: Record<Ally['role'], string> = { tank: 'Tank', damage: 'Damage', healer: 'Healer' }

/** Party frames, most important first: you, then the group in order. */
export function PartyFrames({ arena }: { arena: Arena }) {
  return (
    <ol className="frames" aria-label="Party">
      {arena.allies.map((a) => {
        const frac = a.alive ? a.hp / a.maxHp : 0
        const shield = a.shields.reduce((s, x) => s + x.amount, 0)
        return (
          <li key={a.id} className={a.alive ? 'frame' : 'frame frame--dead'}>
            <div className="frame__top">
              <span className="frame__name">{a.isPlayer ? 'You' : a.name}</span>
              <span className="frame__role">{ROLE_LABEL[a.role]}</span>
              {arena.inZone(a) && a.alive && <span className="frame__zone" title="In one of your zones" />}
            </div>
            <div className="bar frame__bar">
              <div
                className="bar__fill"
                style={{ width: `${frac * 100}%`, background: frac > 0.5 ? '#3fa56a' : frac > 0.25 ? '#c9a227' : '#c0432f' }}
              />
              {shield > 0 && <div className="bar__shield" style={{ width: `${Math.min(1, shield / a.maxHp) * 100}%` }} />}
              <span className="bar__text">{a.alive ? `${int(a.hp)} / ${int(a.maxHp)}` : 'Dead'}</span>
            </div>
            {a.hots.length > 0 && (
              <div className="frame__hots">
                {a.hots.map((h) => (
                  <span key={h.key} className="hot" style={{ '--c': h.effect.color } as CSSProperties} title={h.name}>
                    {h.name.split(' ').map((w) => w[0]).join('')}
                    <small>{Math.ceil(h.endsAt - arena.time)}</small>
                  </span>
                ))}
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** A resource you count rather than pool (imps, combo points): shown as pips. */
const isCounted = (arena: Arena) => arena.maxResource <= 10 && arena.kit.character.stats.resourceRegen === 0

/** Your health, resource (mana, imps, combo points), cast bar and buffs. */
export function PlayerBars({ arena }: { arena: Arena }) {
  const p = arena.player
  const max = arena.maxResource
  const cast = arena.cast
  return (
    <div className="you">
      <div className="bar you__bar">
        <div className="bar__fill" style={{ width: `${(p.hp / p.maxHp) * 100}%`, background: '#3fa56a' }} />
        <span className="bar__text">
          Health {int(p.hp)} / {int(p.maxHp)}
        </span>
      </div>
      {max > 0 && isCounted(arena) && (
        <div className="pips" aria-label={`${arena.kit.resource} ${Math.floor(arena.resource)} of ${max}`}>
          <span className="pips__label">{arena.kit.resource}</span>
          {Array.from({ length: max }, (_, i) => (
            <i key={i} className={i < Math.floor(arena.resource + 1e-6) ? 'pip pip--on' : 'pip'} />
          ))}
        </div>
      )}
      {max > 0 && !isCounted(arena) && (
        <div className="bar you__bar you__resource">
          <div className="bar__fill" style={{ width: `${(arena.resource / max) * 100}%` }} />
          <span className="bar__text">
            {arena.kit.resource} {int(arena.resource)} / {int(max)} · +{sec(arena.resourceRegen())}/sec
            {arena.reservoir >= 1 && ` · Reservoir ${int(arena.reservoir)}`}
          </span>
        </div>
      )}
      <div className="bar you__bar you__cast" aria-hidden={!cast}>
        {cast && (
          <>
            <div
              className="bar__fill"
              style={{
                width: `${Math.min(1, (arena.time - cast.start) / (cast.end - cast.start)) * 100}%`,
                background: cast.ability.color,
              }}
            />
            <span className="bar__text">
              {cast.ability.name} · {sec(Math.max(0, cast.end - arena.time))} sec
            </span>
          </>
        )}
      </div>
      <div className="you__buffs">
        {arena.buffs.map((b) => (
          <span key={b.id} className="buff">
            {b.name}
            {b.stacks > 1 && ` ×${b.stacks}`} <small>{sec(Math.max(0, b.endsAt - arena.time))}</small>
          </span>
        ))}
      </div>
    </div>
  )
}

/** The six slot buttons, with cooldown sweeps, charges and costs. Click works like the key. */
export function ActionBar({ arena, trees, onUse }: { arena: Arena; trees: readonly (TreeDef | null)[]; onUse: (slot: number) => void }) {
  const tipId = useId()
  const [hover, hoverOn] = useHoverTarget<number>()
  const hovered = hover ? arena.current(hover.target) : null

  return (
    <div className="actions" data-tooltip-side>
      {trees.map((tree, i) => {
        const base = arena.kit.slots[i]
        if (!tree) {
          return (
            <div key={i} className="action action--empty">
              <span className="action__key">{SLOT_KEYS[i]}</span>
            </div>
          )
        }
        const a = arena.current(i)
        const cd = base ? arena.cooldowns.get(base.treeId) : undefined
        const waiting = cd && cd.charges < 1 && cd.rechargeAt !== null ? (cd.rechargeAt - arena.time) / cd.duration : 0
        const gcd = base && base.gcd > 0 && arena.time < arena.gcdUntil ? (arena.gcdUntil - arena.time) / (arena.gcdUntil - arena.gcdStart) : 0
        const sweep = Math.max(waiting, gcd)
        const short = a !== null && arena.resource + 1e-6 < a.cost
        const left = cd && cd.charges < 1 && cd.rechargeAt !== null ? cd.rechargeAt - arena.time : 0
        return (
          <button
            key={i}
            type="button"
            className={[
              'action',
              !a && 'action--inert',
              a?.passive && 'action--passive',
              short && 'action--oom',
              arena.cast?.slot === i && 'action--casting',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ '--sweep': `${sweep * 360}deg` } as CSSProperties}
            aria-describedby={hover?.target === i ? tipId : undefined}
            onClick={() => onUse(i)}
            {...hoverOn(i)}
          >
            <ArtIcon folder={tree.artFolder} icon={tree.ability.icon} label={tree.ability.name} tint={tree.color} />
            {sweep > 0 && <span className="action__sweep" />}
            {left > 0 && <span className="action__timer">{left >= 10 ? Math.ceil(left) : sec(Math.round(left * 10) / 10)}</span>}
            <span className="action__key">{SLOT_KEYS[i]}</span>
            {cd && cd.max > 1 && <span className="action__charges">{cd.charges}</span>}
            {a && a.cost > 0 && <span className="action__cost">{int(a.cost)}</span>}
            {a?.passive && <span className="action__cost">Passive</span>}
          </button>
        )
      })}
      {hover && (
        <Tooltip id={tipId} anchor={hover.el}>
          {hovered ? (
            <TipCard icon={null} title={hovered.name}>
              <LiveAbility ability={hovered} />
            </TipCard>
          ) : (
            <TipCard icon={null} title={trees[hover.target]?.ability.name ?? 'Empty'}>
              <p className="tip__desc">No numbers or arena behaviour for this one yet.</p>
            </TipCard>
          )}
        </Tooltip>
      )}
    </div>
  )
}
