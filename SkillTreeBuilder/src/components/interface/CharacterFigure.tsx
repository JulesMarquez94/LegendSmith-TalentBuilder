import { useId } from 'react'
import type { ArtifactDef } from '../../talents/types.ts'
import { optionOf, type Appearance } from './appearance.ts'

interface Props {
  appearance: Appearance
  artifact: ArtifactDef
  className?: string
}

/** A hex colour mixed toward black (`by` 0–1), for the clothes' shading. */
function shade(hex: string, by: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * (1 - by))
  return `rgb(${ch(16)} ${ch(8)} ${ch(0)})`
}

/** The weapon in the figure's right hand (on the viewer's right), drawn from what the artifact is. */
function Weapon({ artifact, hand }: { artifact: ArtifactDef; hand: { x: number; y: number } }) {
  const { traits, color } = artifact
  const { x, y } = hand
  const wood = '#7a5a36'
  const steel = '#c9ccd3'
  if (traits.includes('bow'))
    return (
      <g fill="none" strokeLinecap="round">
        <path d={`M${x + 4},${y - 92} Q${x + 46},${y} ${x + 4},${y + 92}`} stroke={color} strokeWidth={6} />
        <path d={`M${x + 4},${y - 92} L${x + 4},${y + 92}`} stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
      </g>
    )
  if (traits.includes('staff'))
    return (
      <g>
        <path d={`M${x},${y - 140} L${x},${y + 96}`} stroke={wood} strokeWidth={6} strokeLinecap="round" />
        <circle cx={x} cy={y - 148} r={11} fill={color} />
        <circle cx={x - 3} cy={y - 151} r={4} fill="rgba(255,255,255,0.7)" />
      </g>
    )
  if (traits.includes('book'))
    return (
      <g>
        <rect x={x - 4} y={y - 22} width={30} height={38} rx={3} fill={shade(color, 0.25)} stroke={color} strokeWidth={2} />
        <path d={`M${x + 3},${y - 22} L${x + 3},${y + 16}`} stroke="rgba(0,0,0,0.35)" strokeWidth={2} />
        <circle cx={x + 14} cy={y - 3} r={5} fill={color} />
      </g>
    )
  if (traits.includes('dagger'))
    return (
      <g fill={steel}>
        <path d={`M${x - 3},${y + 4} L${x + 3},${y + 4} L${x},${y + 44} Z`} />
        <rect x={x - 7} y={y - 1} width={14} height={4} rx={1} fill={color} />
      </g>
    )
  if (traits.includes('shield'))
    return (
      <g>
        <path d={`M${x},${y - 6} L${x},${y - 112}`} stroke={steel} strokeWidth={6} strokeLinecap="round" />
        <rect x={x - 10} y={y - 6} width={20} height={5} rx={2} fill={color} />
      </g>
    )
  if (traits.includes('large') && traits.includes('blade'))
    return (
      <g>
        <path
          d={`M${x - 5},${y - 10} L${x + 5},${y - 10} L${x + 5},${y - 150} L${x},${y - 162} L${x - 5},${y - 150} Z`}
          fill={steel}
        />
        <rect x={x - 14} y={y - 12} width={28} height={6} rx={2} fill={color} />
      </g>
    )
  // A spear: a long haft with a point.
  return (
    <g>
      <path d={`M${x},${y + 96} L${x},${y - 146}`} stroke={wood} strokeWidth={5} strokeLinecap="round" />
      <path d={`M${x - 7},${y - 142} L${x + 7},${y - 142} L${x},${y - 172} Z`} fill={color} />
    </g>
  )
}

/**
 * A placeholder figure for the character previews, until the game has character art: body, skin and
 * hair from the appearance, clothes in the artifact's colour, holding a rough shape of the artifact.
 */
export function CharacterFigure({ appearance, artifact, className = '' }: Props) {
  const id = useId()
  const skin = optionOf(appearance, 'skin').color ?? '#e0b08c'
  const hairColor = optionOf(appearance, 'hairColor').color ?? '#4b3221'
  const hair = optionOf(appearance, 'hair').label
  const broad = appearance.body === 0
  const tunic = shade(artifact.color, 0.45)
  const sleeve = shade(artifact.color, 0.58)
  // Shoulders and waist, left and right.
  const [s1, s2] = broad ? [60, 140] : [68, 132]
  const [w1, w2] = broad ? [70, 130] : [78, 122]
  const left = { x: s1 - 9, y: 206 }
  const right = { x: s2 + 9, y: 206 }

  return (
    <svg
      className={`figure ${className}`}
      viewBox="0 0 200 330"
      role="img"
      aria-label={`${hair} hair, holding the ${artifact.name}`}
    >
      <defs>
        <radialGradient id={`${id}-aura`}>
          <stop offset="0%" stopColor={artifact.color} stopOpacity={0.45} />
          <stop offset="100%" stopColor={artifact.color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={100} cy={180} rx={100} ry={150} fill={`url(#${id}-aura)`} />
      <ellipse cx={100} cy={312} rx={66} ry={10} fill="rgba(0,0,0,0.5)" />

      {/* Long hair falls behind the shoulders. */}
      {hair === 'Long' && (
        <path d="M74,64 Q74,34 100,34 Q126,34 126,64 L130,128 Q118,134 112,118 L88,118 Q82,134 70,128 Z" fill={hairColor} />
      )}

      {/* Legs and boots */}
      <rect x={w1 + 6} y={204} width={22} height={100} rx={8} fill="#2a2a30" />
      <rect x={w2 - 28} y={204} width={22} height={100} rx={8} fill="#2a2a30" />
      <rect x={w1 + 2} y={290} width={28} height={16} rx={6} fill="#18181c" />
      <rect x={w2 - 30} y={290} width={28} height={16} rx={6} fill="#18181c" />

      {/* Arms, then the torso over them */}
      <rect x={s1 - 18} y={112} width={18} height={92} rx={9} fill={sleeve} />
      <rect x={s2} y={112} width={18} height={92} rx={9} fill={sleeve} />
      <path
        d={`M${s1},118 Q${s1},104 ${s1 + 16},102 L${s2 - 16},102 Q${s2},104 ${s2},118 L${w2},212 L${w1},212 Z`}
        fill={tunic}
      />
      <path d={`M${100 - 10},102 L100,124 L${100 + 10},102`} fill="none" stroke={artifact.color} strokeWidth={3} />
      <rect x={w1} y={196} width={w2 - w1} height={9} fill="#3a2a1c" />
      <rect x={96} y={195} width={8} height={11} rx={1} fill={artifact.color} />

      {/* Neck, head and hair */}
      <rect x={92} y={84} width={16} height={22} rx={4} fill={skin} />
      <ellipse cx={100} cy={66} rx={22} ry={26} fill={skin} />
      <ellipse cx={93} cy={58} rx={7} ry={9} fill="rgba(255,255,255,0.12)" />
      {hair === 'Shaved' ? (
        <path d="M78,62 Q78,40 100,40 Q122,40 122,62 Q112,50 100,49 Q88,50 78,62 Z" fill={hairColor} opacity={0.35} />
      ) : (
        <path d="M76,68 Q74,36 100,36 Q126,36 124,68 Q118,52 100,50 Q84,52 76,68 Z" fill={hairColor} />
      )}
      {hair === 'Topknot' && <circle cx={100} cy={31} r={10} fill={hairColor} />}

      {/* Hands, and the weapon in the right one */}
      <Weapon artifact={artifact} hand={right} />
      {artifact.traits.includes('dagger') && <Weapon artifact={artifact} hand={left} />}
      {artifact.traits.includes('shield') && (
        <path
          d={`M${left.x - 26},${left.y - 44} L${left.x + 20},${left.y - 44} L${left.x + 20},${left.y + 6} Q${left.x - 3},${left.y + 40} ${left.x - 26},${left.y + 6} Z`}
          fill={shade(artifact.color, 0.2)}
          stroke={artifact.color}
          strokeWidth={3}
        />
      )}
      <circle cx={left.x} cy={left.y} r={8} fill={skin} />
      <circle cx={right.x} cy={right.y} r={8} fill={skin} />
    </svg>
  )
}
