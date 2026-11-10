// The character screen's backdrop: a clearing in the woods at night, lit by a campfire. Drawn in a
// 1600 × 900 box, the same 16:9 as the screen, so the seats can be placed in percentages over it.

/** The same "random" stars and trees every time: a small seeded generator. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const STARS = (() => {
  const r = seeded(7)
  return Array.from({ length: 90 }, (_, i) => ({
    x: r() * 1600,
    y: r() * 400,
    size: 0.6 + r() * 1.4,
    alpha: 0.35 + r() * 0.6,
    twinkle: i % 7 === 0,
  }))
})()

/** A row of pines standing on `base`, as one path: each tree is two stacked triangles and a trunk. */
function pines(seed: number, base: number, from: number, to: number, minH: number, maxH: number, gap: number): string {
  const r = seeded(seed)
  let d = ''
  for (let x = from; x < to; x += gap * (0.6 + r() * 0.8)) {
    const h = minH + r() * (maxH - minH)
    const w = h * (0.34 + r() * 0.12)
    const b = base + r() * 24
    d += `M${x - w / 2},${b - h * 0.08} L${x},${b - h * 0.62} L${x + w / 2},${b - h * 0.08} Z `
    d += `M${x - w * 0.36},${b - h * 0.42} L${x},${b - h} L${x + w * 0.36},${b - h * 0.42} Z `
    d += `M${x - w * 0.05},${b} L${x - w * 0.05},${b - h * 0.1} L${x + w * 0.05},${b - h * 0.1} L${x + w * 0.05},${b} Z `
  }
  return d
}

const FAR_TREES = pines(3, 470, -40, 1660, 140, 280, 46)
// The near woods frame the clearing at the sides, leaving the middle open.
const NEAR_TREES = `${pines(11, 600, -60, 330, 380, 640, 70)} ${pines(19, 600, 1270, 1680, 380, 640, 70)}`

/** Where the fire sits, in the box's units (50% across, 70% down). */
const FIRE = { x: 800, y: 630 }

const STONES = Array.from({ length: 9 }, (_, i) => {
  const a = (i / 9) * Math.PI * 2
  return { x: FIRE.x + Math.cos(a) * 66, y: FIRE.y + 6 + Math.sin(a) * 16, rx: 13 + (i % 3) * 3 }
})

/** The night, the woods, the clearing and the fire. Decoration only. */
export function CampScene() {
  return (
    <svg className="camp__scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="camp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#060914" />
          <stop offset="55%" stopColor="#0f1729" />
          <stop offset="100%" stopColor="#151d2c" />
        </linearGradient>
        <radialGradient id="camp-moonglow">
          <stop offset="0%" stopColor="#e9e4cf" stopOpacity={0.28} />
          <stop offset="100%" stopColor="#e9e4cf" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="camp-firelight">
          <stop offset="0%" stopColor="#ff9b45" stopOpacity={0.55} />
          <stop offset="35%" stopColor="#ff7a2e" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#ff7a2e" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="camp-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10150f" />
          <stop offset="100%" stopColor="#050605" />
        </linearGradient>
      </defs>

      <rect width={1600} height={900} fill="url(#camp-sky)" />
      {STARS.map((s, i) => (
        <circle
          key={i}
          className={s.twinkle ? 'camp__twinkle' : undefined}
          cx={s.x}
          cy={s.y}
          r={s.size}
          fill="#fff"
          opacity={s.alpha}
        />
      ))}
      <circle cx={1330} cy={130} r={140} fill="url(#camp-moonglow)" />
      <circle cx={1330} cy={130} r={36} fill="#e9e4cf" />
      <circle cx={1318} cy={122} r={7} fill="#d3cdb5" />
      <circle cx={1342} cy={142} r={5} fill="#d3cdb5" />

      <path d={FAR_TREES} fill="#0c1322" />
      <path d="M-20,480 Q800,430 1620,480 L1620,900 L-20,900 Z" fill="url(#camp-ground)" />
      <ellipse className="camp__light" cx={FIRE.x} cy={FIRE.y} rx={620} ry={230} fill="url(#camp-firelight)" />
      <path d={NEAR_TREES} fill="#05070d" />

      {/* The fire: a ring of stones, crossed logs, flames and a few embers */}
      {STONES.map((s, i) => (
        <ellipse key={i} cx={s.x} cy={s.y} rx={s.rx} ry={8} fill="#3b3a38" stroke="#1d1c1b" strokeWidth={2} />
      ))}
      <g transform={`translate(${FIRE.x} ${FIRE.y})`}>
        <rect x={-58} y={-10} width={116} height={18} rx={9} fill="#4a3020" transform="rotate(-14)" />
        <rect x={-58} y={-10} width={116} height={18} rx={9} fill="#5a3a26" transform="rotate(14)" />
        <path
          className="camp__flame camp__flame--outer"
          d="M-40,0 C-46,-40 -18,-62 -10,-104 C2,-72 14,-88 18,-122 C36,-82 50,-46 40,0 Z"
          fill="#ff6a1f"
        />
        <path
          className="camp__flame camp__flame--mid"
          d="M-28,0 C-32,-30 -10,-48 -4,-80 C6,-56 18,-66 20,-88 C32,-58 36,-30 28,0 Z"
          fill="#ffa834"
        />
        <path className="camp__flame camp__flame--core" d="M-15,0 C-18,-20 -4,-32 0,-52 C6,-34 16,-30 15,0 Z" fill="#ffe9a8" />
        {[-24, -8, 10, 26, 2, -16].map((x, i) => (
          <circle
            key={i}
            className="camp__ember"
            cx={x}
            cy={-60}
            r={2.4}
            fill="#ffb347"
            style={{ animationDelay: `${i * 0.55}s` }}
          />
        ))}
      </g>
    </svg>
  )
}
