import type { Ally, Arena } from '../../game/sim/arena.ts'
import { ARENA, type Vec } from '../../game/sim/scenarios.ts'

// Draws the arena top-down, in yards: the canvas is scaled so 1 unit = 1 yard.

const ROLE_COLOR: Record<Ally['role'], string> = { tank: '#7fa6d9', damage: '#e07a5f', healer: '#8fe3a0' }
const HEAL = '#8fe3a0'
const SHIELD = '#00afd7'
const DANGER = '#ff5a46'

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/** Canvas pixels to arena yards, for the crosshair. */
export function toYards(canvas: HTMLCanvasElement, clientX: number, clientY: number): Vec {
  const rect = canvas.getBoundingClientRect()
  return {
    x: ((clientX - rect.left) / rect.width) * ARENA.width,
    y: ((clientY - rect.top) / rect.height) * ARENA.height,
  }
}

export function drawArena(canvas: HTMLCanvasElement, arena: Arena, aim: Vec | null) {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  const w = Math.max(1, Math.round(rect.width * dpr))
  const h = Math.max(1, Math.round(rect.height * dpr))
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
  const g = canvas.getContext('2d')
  if (!g) return
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, w, h)
  g.scale(w / ARENA.width, h / ARENA.height)
  g.lineCap = 'round'
  g.textAlign = 'center'
  g.textBaseline = 'middle'

  const now = arena.time
  const font = (size: number, weight = 400) => `${weight} ${size}px Lexend, system-ui, sans-serif`
  const circle = (p: Vec, r: number) => {
    g.beginPath()
    g.arc(p.x, p.y, r, 0, Math.PI * 2)
  }
  const arc = (p: Vec, r: number, fraction: number) => {
    g.beginPath()
    g.arc(p.x, p.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, fraction)))
  }

  // Floor
  g.fillStyle = '#151515'
  g.fillRect(0, 0, ARENA.width, ARENA.height)
  g.strokeStyle = 'rgba(255,255,255,0.035)'
  g.lineWidth = 0.05
  for (let x = 5; x < ARENA.width; x += 5) {
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x, ARENA.height)
    g.stroke()
  }
  for (let y = 5; y < ARENA.height; y += 5) {
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(ARENA.width, y)
    g.stroke()
  }

  // Your heal range
  const player = arena.player
  const range = arena.kit.slots.reduce((r, a) => Math.max(r, a && !a.tags.has('main-attack') ? a.range : 0), 0)
  if (player.alive && range > 0) {
    g.setLineDash([0.6, 0.6])
    g.strokeStyle = 'rgba(231,183,37,0.18)'
    g.lineWidth = 0.08
    circle(player.pos, range)
    g.stroke()
    g.setLineDash([])
  }

  // Pools
  for (const hz of arena.hazards) {
    const armed = now >= hz.armAt
    g.fillStyle = rgba(DANGER, armed ? 0.24 : 0.08 + 0.1 * Math.max(0, 1 - (hz.armAt - now)))
    circle(hz.pos, hz.radius)
    g.fill()
    g.strokeStyle = rgba(DANGER, armed ? 0.8 : 0.55)
    g.lineWidth = 0.12
    if (!armed) g.setLineDash([0.5, 0.4])
    g.stroke()
    g.setLineDash([])
  }

  // Your zones (damaging ones dashed, so they read apart from heals)
  for (const z of arena.zones) {
    g.fillStyle = rgba(z.effect.color, z.hostile ? 0.18 : 0.13)
    circle(z.pos, z.radius)
    g.fill()
    g.strokeStyle = rgba(z.effect.color, 0.5)
    g.lineWidth = 0.1
    if (z.hostile) g.setLineDash([0.4, 0.3])
    g.stroke()
    g.setLineDash([])
    g.strokeStyle = rgba(z.effect.color, 0.9)
    g.lineWidth = 0.25
    arc(z.pos, z.radius, (z.endsAt - now) / z.duration)
    g.stroke()
    g.fillStyle = rgba(z.effect.color, 0.85)
    g.font = font(0.75, 400)
    g.fillText(z.name, z.pos.x, z.pos.y - z.radius + 0.9)
  }

  // Enemies: the boss, dummies and adds, with your DoTs on them
  const target = arena.mainTarget(40)
  for (const enemy of arena.enemies) {
    if (!enemy.alive) continue
    g.fillStyle = enemy.isBoss ? '#3a1d1d' : '#2c1d33'
    circle(enemy.pos, enemy.radius)
    g.fill()
    g.strokeStyle = enemy === target ? '#ffe9a0' : enemy.isBoss ? '#ff6b6b' : '#c27be0'
    g.lineWidth = enemy === target ? 0.22 : 0.15
    g.stroke()
    const top = enemy.pos.y - enemy.radius
    if (enemy.isBoss) {
      g.fillStyle = '#ffd0c8'
      g.font = font(0.85, 900)
      g.fillText(enemy.name, enemy.pos.x, top - 1.4)
    }
    if (Number.isFinite(enemy.maxHp)) {
      const w = enemy.radius * 2.4
      g.fillStyle = 'rgba(0,0,0,0.6)'
      g.fillRect(enemy.pos.x - w / 2, top - 0.75, w, 0.4)
      g.fillStyle = enemy.isBoss ? '#ff6b6b' : '#c27be0'
      g.fillRect(enemy.pos.x - w / 2, top - 0.75, (w * enemy.hp) / enemy.maxHp, 0.4)
    }
    enemy.dots.forEach((d, i) => {
      const x = enemy.pos.x - ((enemy.dots.length - 1) * 0.7) / 2 + i * 0.7
      const y = enemy.pos.y + enemy.radius + 0.6
      g.fillStyle = d.effect.color
      circle({ x, y }, 0.28)
      g.fill()
      if (d.stacks.length > 1) {
        g.fillStyle = '#fff'
        g.font = font(0.5, 900)
        g.fillText(String(d.stacks.length), x, y + 0.65)
      }
    })
  }

  // Your imps, circling you
  for (const imp of arena.imps) {
    const p = arena.impPos(imp)
    g.fillStyle = 'rgba(255,138,92,0.25)'
    circle(p, 0.65)
    g.fill()
    g.fillStyle = '#ff8a5c'
    circle(p, 0.35)
    g.fill()
  }

  // Allies
  for (const a of arena.allies) {
    const color = a.isPlayer ? '#e7b725' : ROLE_COLOR[a.role]
    g.fillStyle = a.alive ? rgba(color, 0.9) : '#444'
    circle(a.pos, 0.85)
    g.fill()
    if (!a.alive) {
      g.strokeStyle = '#999'
      g.lineWidth = 0.15
      g.beginPath()
      g.moveTo(a.pos.x - 0.5, a.pos.y - 0.5)
      g.lineTo(a.pos.x + 0.5, a.pos.y + 0.5)
      g.moveTo(a.pos.x + 0.5, a.pos.y - 0.5)
      g.lineTo(a.pos.x - 0.5, a.pos.y + 0.5)
      g.stroke()
    } else {
      const frac = a.hp / a.maxHp
      g.lineWidth = 0.28
      g.strokeStyle = 'rgba(0,0,0,0.65)'
      circle(a.pos, 1.3)
      g.stroke()
      g.strokeStyle = frac > 0.5 ? HEAL : frac > 0.25 ? '#ffd23f' : DANGER
      arc(a.pos, 1.3, frac)
      g.stroke()
      const shield = a.shields.reduce((s, x) => s + x.amount, 0)
      if (shield > 0) {
        g.strokeStyle = SHIELD
        g.lineWidth = 0.18
        arc(a.pos, 1.65, shield / a.maxHp)
        g.stroke()
      }
      a.hots.forEach((hot, i) => {
        g.fillStyle = hot.effect.color
        circle({ x: a.pos.x - ((a.hots.length - 1) * 0.55) / 2 + i * 0.55, y: a.pos.y - 2.05 }, 0.2)
        g.fill()
      })
    }
    g.fillStyle = a.isPlayer ? '#ffe9a0' : 'rgba(255,255,255,0.8)'
    g.font = font(0.72, a.isPlayer ? 900 : 400)
    g.fillText(a.name, a.pos.x, a.pos.y + 2.2)
  }

  // Facing and cast progress
  if (player.alive) {
    const f = arena.facing
    g.fillStyle = '#ffe9a0'
    g.beginPath()
    g.moveTo(player.pos.x + f.x * 1.25, player.pos.y + f.y * 1.25)
    g.lineTo(player.pos.x + f.x * 0.75 - f.y * 0.35, player.pos.y + f.y * 0.75 + f.x * 0.35)
    g.lineTo(player.pos.x + f.x * 0.75 + f.y * 0.35, player.pos.y + f.y * 0.75 - f.x * 0.35)
    g.closePath()
    g.fill()
    if (arena.cast) {
      g.strokeStyle = arena.cast.ability.color
      g.lineWidth = 0.22
      arc(player.pos, 2.05, (now - arena.cast.start) / (arena.cast.end - arena.cast.start))
      g.stroke()
    }
  }

  // Effects
  for (const fx of arena.fx) {
    const t = (now - fx.born) / fx.life
    const alpha = Math.max(0, 1 - t)
    if (fx.kind === 'beam') {
      g.strokeStyle = rgba(fx.color, alpha * 0.9)
      g.lineWidth = 0.22
      g.beginPath()
      g.moveTo(fx.from.x, fx.from.y)
      g.lineTo(fx.to.x, fx.to.y)
      g.stroke()
    } else if (fx.kind === 'ring') {
      g.strokeStyle = rgba(fx.color, alpha * 0.8)
      g.lineWidth = 0.2
      circle(fx.pos, fx.radius * (0.55 + 0.45 * t))
      g.stroke()
    } else {
      g.fillStyle = rgba(fx.color, alpha)
      g.font = font(fx.big ? 1.15 : 0.8, fx.big ? 900 : 400)
      g.fillText(fx.text, fx.pos.x + fx.dx * t, fx.pos.y - 2.6 - 2 * t)
    }
  }

  // Crosshair
  if (aim) {
    g.strokeStyle = 'rgba(255,255,255,0.7)'
    g.lineWidth = 0.08
    circle(aim, 0.6)
    g.stroke()
    g.beginPath()
    g.moveTo(aim.x - 1, aim.y)
    g.lineTo(aim.x - 0.3, aim.y)
    g.moveTo(aim.x + 0.3, aim.y)
    g.lineTo(aim.x + 1, aim.y)
    g.moveTo(aim.x, aim.y - 1)
    g.lineTo(aim.x, aim.y - 0.3)
    g.moveTo(aim.x, aim.y + 0.3)
    g.lineTo(aim.x, aim.y + 1)
    g.stroke()
  }
}
