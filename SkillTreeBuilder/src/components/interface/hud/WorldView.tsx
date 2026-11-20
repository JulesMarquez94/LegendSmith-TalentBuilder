import { useMemo, type CSSProperties, type PointerEvent } from 'react'
import type { ArtifactDef } from '../../../talents/types.ts'
import type { Appearance } from '../appearance.ts'
import { CharacterFigure } from '../CharacterFigure.tsx'
import type { HudSettings } from './settings.ts'
import type { HudSim } from './sim.ts'
import { NAMEPLATES } from './unity.ts'
import { project, relative, selectPlates, zoneMap, type Situation, type Vec } from './world.ts'

interface Props {
  sim: HudSim
  zone: string
  situation: Situation
  appearance: Appearance
  artifact: ArtifactDef
  settings: HudSettings['world']
  /** Left click: the Basic slot; right click: Ability 1. Off in the edit mode. */
  onClick?: (button: 0 | 2) => void
}

/** Props for the scenery: a few trees, rocks or puddles around each feature of the zone's map. */
function scenery(zone: string): { kind: 'wood' | 'water' | 'rock'; at: Vec }[] {
  const { features } = zoneMap(zone)
  return features.flatMap((f) =>
    [0, 2.1, 4.2].map((a) => ({ kind: f.kind, at: { x: f.at.x / 4 + Math.sin(a) * f.r * 0.3, y: f.at.y / 4 + Math.cos(a) * f.r * 0.3 } })),
  )
}

/**
 * What the camera sees behind the HUD: the ground, scenery, the enemies with their nameplates (picked
 * by the game's rules: nearest first, the target kept further out, never the boss), the target marker,
 * the damage numbers, the crosshair and you.
 */
export function WorldView({ sim, zone, situation, appearance, artifact, settings, onClick }: Props) {
  const props = useMemo(() => (situation === 'boss' ? [] : scenery(zone)), [zone, situation])
  const target = sim.target
  const plates = settings.plates
    ? selectPlates(
        sim.enemies.map((e) => ({
          id: e.id,
          distance: relative(e.at, sim.at, sim.heading).distance,
          alive: e.health > 0,
          boss: !!e.boss,
          enemy: true,
          health: e.health,
          maxHealth: e.maxHealth,
          targeted: e.id === target?.id,
        })),
        {
          showDistance: settings.distance,
          targetedShowDistance: Math.max(settings.distance, NAMEPLATES.targetedShowDistance),
          maxPlates: settings.maxPlates,
          showAtFullHealth: settings.fullHealth,
        },
      )
    : []
  const plated = new Set(plates.map((p) => p.id))

  const drawn = [
    ...props.map((p, i) => ({ key: `p${i}`, kind: p.kind, at: p.at, enemy: null })),
    ...sim.enemies.map((e) => ({ key: `e${e.id}`, kind: 'enemy' as const, at: e.at, enemy: e })),
  ]
    .map((d) => ({ ...d, screen: project(d.at, sim.at, sim.heading) }))
    .filter((d) => d.screen && d.screen.x > -0.2 && d.screen.x < 1.2)
    .sort((a, b) => a.screen!.scale - b.screen!.scale)

  const down = (e: PointerEvent) => {
    if (!onClick || (e.button !== 0 && e.button !== 2)) return
    e.preventDefault()
    onClick(e.button)
  }

  return (
    <div
      className={`hud-world hud-world--${situation}`}
      onPointerDown={down}
      onContextMenu={(e) => e.preventDefault()}
      style={{ '--sway': `${((sim.heading * 180) / Math.PI) % 360}` } as CSSProperties}
    >
      <div className="hud-world__sky" style={{ backgroundPositionX: `${(-sim.heading / (Math.PI * 2)) * 100}%` }} />
      <div className="hud-world__ground" />
      {drawn.map(({ key, kind, enemy, screen }) => {
        const s = screen!
        const place = { left: `${s.x * 100}%`, top: `${s.y * 100}%`, '--s': s.scale } as CSSProperties
        if (!enemy) return <span key={key} className={`hud-prop hud-prop--${kind}`} style={place} />
        const isTarget = enemy.id === target?.id
        return (
          <div key={key} className={enemy.boss ? 'hud-enemy hud-enemy--boss' : 'hud-enemy'} style={place}>
            <span className="hud-enemy__body" />
            {plated.has(enemy.id) && (
              <span className={isTarget ? 'hud-plate hud-plate--target' : 'hud-plate'}>
                {(settings.plateName || settings.plateLevel) && (
                  <span className="hud-plate__row">
                    {settings.plateName && <b style={{ color: NAMEPLATES.enemyName }}>{enemy.name}</b>}
                    {settings.plateLevel && <small>Lv {enemy.level}</small>}
                  </span>
                )}
                <span className="hud-plate__bar" style={{ width: `calc(${settings.plateWidth} * var(--px))`, background: NAMEPLATES.back }}>
                  <i
                    style={{
                      width: `${(enemy.health / enemy.maxHealth) * 100}%`,
                      background: isTarget ? NAMEPLATES.targetedFill : NAMEPLATES.enemyFill,
                    }}
                  />
                </span>
              </span>
            )}
            {isTarget && <span className="hud-enemy__marker" aria-hidden="true" />}
            {settings.numbers &&
              sim.numbers
                .filter((n) => n.enemyId === enemy.id)
                .map((n) => (
                  <span
                    key={n.id}
                    className={n.crit ? 'hud-number hud-number--crit' : 'hud-number'}
                    style={{ '--age': Math.min(1, (sim.t - n.born) / 1.2) } as CSSProperties}
                  >
                    {n.amount}
                  </span>
                ))}
          </div>
        )
      })}
      <CharacterFigure appearance={appearance} artifact={artifact} className="hud-world__you" />
      {settings.crosshair && (
        <span className="hud-crosshair" aria-hidden="true">
          <i />
        </span>
      )}
    </div>
  )
}
