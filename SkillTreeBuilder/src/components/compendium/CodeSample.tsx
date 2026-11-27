import type { ReactNode } from 'react'
import type { Code, CodeId } from './templates.ts'

/** The bodies standing on the ground: players, the boss. */
const BODY = '#e6e4ee'

/** Three arms turning out from the middle, for the soak swirl. */
const SWIRL_ARMS = [0, 1, 2].map((arm) =>
  Array.from({ length: 25 }, (_, i) => {
    const t = i / 24
    const angle = t * 1.7 * Math.PI + (arm * 2 * Math.PI) / 3
    const r = 3 + 19 * t
    return `${(40 + r * Math.cos(angle)).toFixed(1)},${(40 + r * Math.sin(angle)).toFixed(1)}`
  }).join(' '),
)

/** A circle as a path, so holes can be cut out of an area with the even-odd rule. */
const ring = (cx: number, cy: number, r: number) => `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`

/** An area as the game draws it: a strong border, a see-through inside, and the fill growing from the middle. */
function Zone({ colour, fill = true }: { colour: string; fill?: boolean }) {
  return (
    <>
      <circle cx={40} cy={40} r={26} fill={colour} fillOpacity={0.18} stroke={colour} strokeWidth={4} />
      {fill && <circle cx={40} cy={40} r={15} fill={colour} fillOpacity={0.42} />}
    </>
  )
}

const RED = '#f20f0f'
const ORANGE = '#ff8c0d'

const DRAW: Record<CodeId, (c: string) => ReactNode> = {
  ORANGE: (c) => <Zone colour={c} />,
  RED: (c) => <Zone colour={c} />,
  BLUE: (c) => (
    <>
      {/* The room filled red, with two safe spots cut out of it. */}
      <path d={`${ring(40, 40, 30)}${ring(28, 47, 9)}${ring(52, 31, 9)}`} fill={RED} fillOpacity={0.4} fillRule="evenodd" />
      <circle cx={40} cy={40} r={30} fill="none" stroke={RED} strokeWidth={3} />
      <circle cx={28} cy={47} r={9} fill={c} fillOpacity={0.3} stroke={c} strokeWidth={3} />
      <circle cx={52} cy={31} r={9} fill={c} fillOpacity={0.3} stroke={c} strokeWidth={3} />
    </>
  ),
  SWIRL: (c) => (
    <>
      <circle cx={40} cy={40} r={26} fill={c} fillOpacity={0.12} stroke={c} strokeOpacity={0.55} strokeWidth={3} />
      {SWIRL_ARMS.map((points) => (
        <polyline key={points} points={points} fill="none" stroke={c} strokeWidth={3} strokeLinecap="round" />
      ))}
    </>
  ),
  VIOLET: (c) => (
    <>
      {/* Crystals feeding the ward on the boss, all one colour. */}
      {[-90, 30, 150].map((deg) => {
        const a = (deg * Math.PI) / 180
        const [x, y] = [40 + 30 * Math.cos(a), 40 + 30 * Math.sin(a)]
        return (
          <g key={deg}>
            <line x1={x} y1={y} x2={40 + 16 * Math.cos(a)} y2={40 + 16 * Math.sin(a)} stroke={c} strokeWidth={2} strokeOpacity={0.85} />
            <path d={`M${x},${y - 6}l4,6l-4,6l-4,-6z`} fill={c} />
          </g>
        )
      })}
      <circle cx={40} cy={40} r={8} fill={BODY} />
      <circle cx={40} cy={40} r={14} fill={c} fillOpacity={0.2} stroke={c} strokeWidth={4} />
    </>
  ),
  LINK: (c) => (
    <>
      <line x1={20} y1={55} x2={60} y2={25} stroke={c} strokeWidth={9} strokeOpacity={0.25} strokeLinecap="round" />
      <line x1={20} y1={55} x2={60} y2={25} stroke={c} strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={20} cy={55} r={6} fill={BODY} />
      <circle cx={60} cy={25} r={6} fill={BODY} />
    </>
  ),
  LIME: (c) => (
    <path
      d="M17,45 C13,30 29,17 43,20 C58,23 67,33 62,47 C57,61 40,65 29,60 C23,57 18,52 17,45 Z"
      fill={c}
      fillOpacity={0.42}
      stroke={c}
      strokeWidth={3}
    />
  ),
  RETICLE: (c) => (
    <>
      {/* A scope ring with four ticks and a centre dot, under the player it follows. */}
      <circle cx={40} cy={40} r={17} fill="none" stroke={c} strokeWidth={3} />
      <path d="M40,15v11M40,54v11M15,40h11M54,40h11" stroke={c} strokeWidth={3} strokeLinecap="round" />
      <circle cx={40} cy={40} r={3} fill={c} />
    </>
  ),
  SKY: (c) => (
    <>
      {/* The shadow of what falls, growing inside the zone. */}
      <Zone colour={ORANGE} fill={false} />
      <circle cx={40} cy={40} r={19} fill={c} fillOpacity={0.45} />
      <circle cx={40} cy={40} r={14} fill={c} fillOpacity={0.75} />
      <circle cx={40} cy={40} r={8} fill="#101014" fillOpacity={0.8} />
    </>
  ),
}

/**
 * A small drawing of one code as it shows on the ground, on a disc of floor (ground) or on its own for a chip beside a name.
 * Drawn here, not recorded: the colours are the game's where it has them.
 */
export function CodeSample({ code, size = 96, ground = true }: { code: Code; size?: number; ground?: boolean }) {
  return (
    <svg
      className="code-sample"
      width={size}
      height={size}
      viewBox="0 0 80 80"
      role={ground ? 'img' : undefined}
      aria-label={ground ? `${code.name}: ${code.look}` : undefined}
      aria-hidden={ground ? undefined : true}
    >
      {ground && <circle cx={40} cy={40} r={38} fill="#3a3834" stroke="#ffffff" strokeOpacity={0.08} />}
      {DRAW[code.id](code.colour)}
    </svg>
  )
}
