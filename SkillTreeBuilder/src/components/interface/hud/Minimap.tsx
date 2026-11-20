import { useId, useMemo } from 'react'
import type { HudSettings } from './settings.ts'
import { mapPoint, northOnMap, zoneMap, type Vec } from './world.ts'

interface Props {
  zone: string
  at: Vec
  heading: number
  /** The time of day, ms since 1970. */
  time: number
  settings: HudSettings['minimap']
  /** Where your group stands. */
  party: readonly Vec[]
  enemies: readonly { at: Vec; boss?: boolean }[]
  objectives: readonly Vec[]
  /** + and −: zoom by one step. Off in the edit mode. */
  onZoom?: (steps: number) => void
}

const CARDINALS = ['N', 'E', 'S', 'W'] as const

/** A point kept on the map: past the edge, it sits on the rim (objectives point the way). */
function onRim(p: Vec, circle: boolean): Vec {
  if (circle) {
    const d = Math.hypot(p.x, p.y)
    return d > 0.92 ? { x: (p.x / d) * 0.92, y: (p.y / d) * 0.92 } : p
  }
  const m = Math.max(Math.abs(p.x), Math.abs(p.y))
  return m > 0.92 ? { x: (p.x / m) * 0.92, y: (p.y / m) * 0.92 } : p
}

const inside = (p: Vec, circle: boolean) => (circle ? Math.hypot(p.x, p.y) <= 1 : Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1)

/**
 * The area from above, centred on you: woods, water and paths, your group, enemies and objective markers.
 * Circle or square, north up or turning with you, zoomed out no further than its setting allows.
 */
export function Minimap({ zone, at, heading, time, settings, party, enemies, objectives, onZoom }: Props) {
  const clip = useId()
  const map = useMemo(() => zoneMap(zone), [zone])
  const circle = settings.shape === 'circle'
  const turn = settings.rotation === 'turn'
  const radius = settings.radius
  const place = (p: Vec) => mapPoint(p, at, heading, radius, turn)
  const north = northOnMap(heading, turn)
  const clockAt = new Date(time)

  return (
    <div className={`hud-map hud-map--${settings.shape}`}>
      {settings.clock && (
        <span className="hud-map__clock">
          {clockAt.getHours()}:{String(clockAt.getMinutes()).padStart(2, '0')}
        </span>
      )}
      <div className="hud-map__frame">
        <svg className="hud-map__svg" viewBox="-1.12 -1.12 2.24 2.24" role="img" aria-label={`Minimap of ${zone}`}>
          <defs>
            <clipPath id={clip}>{circle ? <circle r={1} /> : <rect x={-1} y={-1} width={2} height={2} rx={0.06} />}</clipPath>
          </defs>
          <g clipPath={`url(#${clip})`}>
            <rect x={-1.2} y={-1.2} width={2.4} height={2.4} fill="#2b3326" />
            {map.features.map((f, i) => {
              const p = place(f.at)
              return (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={f.r / radius}
                  fill={f.kind === 'water' ? '#28506e' : f.kind === 'rock' ? '#4a4840' : '#1f3a22'}
                  opacity={0.9}
                />
              )
            })}
            {map.paths.map((path, i) => (
              <polyline
                key={i}
                points={path.map((pt) => place(pt)).map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#a08b62"
                strokeWidth={4 / radius}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.75}
              />
            ))}
            {settings.enemies &&
              enemies.map((e, i) => {
                const p = place(e.at)
                return inside(p, circle) ? (
                  <circle key={i} cx={p.x} cy={p.y} r={e.boss ? 0.07 : 0.035} fill={e.boss ? '#ff3b2f' : '#e05a4a'} stroke="#000" strokeWidth={0.01} />
                ) : null
              })}
            {settings.party &&
              party.map((m, i) => {
                const p = place(m)
                return <circle key={i} cx={p.x} cy={p.y} r={0.04} fill="#5ab4ff" stroke="#0b2236" strokeWidth={0.012} />
              })}
          </g>
          {settings.objectives &&
            objectives.map((o, i) => {
              const p = onRim(place(o), circle)
              return (
                <rect
                  key={i}
                  x={p.x - 0.05}
                  y={p.y - 0.05}
                  width={0.1}
                  height={0.1}
                  transform={`rotate(45 ${p.x} ${p.y})`}
                  fill="#e7b725"
                  stroke="#3a2c00"
                  strokeWidth={0.015}
                />
              )
            })}
          {/* You: an arrow pointing where you face, always in the middle. */}
          <path
            d="M0,-0.09 L0.06,0.06 L0,0.03 L-0.06,0.06 Z"
            fill="#ffffff"
            stroke="#000"
            strokeWidth={0.012}
            transform={turn ? undefined : `rotate(${(heading * 180) / Math.PI})`}
          />
          {circle ? (
            <circle r={1} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={0.025} />
          ) : (
            <rect x={-1} y={-1} width={2} height={2} rx={0.06} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={0.025} />
          )}
          {settings.cardinals &&
            CARDINALS.map((label, i) => {
              // Each cardinal is a quarter turn clockwise from the one before.
              const a = (i * Math.PI) / 2
              const x = north.x * Math.cos(a) - north.y * Math.sin(a)
              const y = north.x * Math.sin(a) + north.y * Math.cos(a)
              const edge = circle ? 1 : 1 / Math.max(Math.abs(x), Math.abs(y))
              return (
                <text
                  key={label}
                  x={x * edge}
                  y={y * edge}
                  className={label === 'N' ? 'hud-map__cardinal hud-map__cardinal--north' : 'hud-map__cardinal'}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {label}
                </text>
              )
            })}
        </svg>
        {onZoom && (
          <div className="hud-map__zoom">
            <button type="button" tabIndex={-1} aria-label="Zoom in" onClick={() => onZoom(-1)}>
              +
            </button>
            <button type="button" tabIndex={-1} aria-label="Zoom out" onClick={() => onZoom(1)}>
              −
            </button>
          </div>
        )}
      </div>
      {settings.zone && (
        <span className="hud-map__zone">
          {zone} <small>{radius} m</small>
        </span>
      )}
    </div>
  )
}
