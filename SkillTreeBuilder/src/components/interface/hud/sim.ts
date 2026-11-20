// The little game behind the HUD prototype: enough of it for every element to have something true to
// show. Using a slot casts, spends, starts its cooldown and the global one, or fails with the game's
// message; stamina fades when full; ghouls come and go. It isn't the arena: no real fight is simulated.

import type { HudKit, HudSlot } from './kit.ts'
import { failureText, STAMINA, type ActionSlotId } from './unity.ts'
import { bossAt, pickTarget, sampleEnemies, walk, type BossState, type Enemy, type Situation, type Vec } from './world.ts'

/** A buff or debuff in an effect row (HudRules EffectRowState): buffs first, then debuffs; no timer for an aura. */
export interface EffectIcon {
  name: string
  color: string
  harmful: boolean
  stacks: number
  /** Seconds into the sim it ends; Infinity for an aura. */
  endsAt: number
}

export interface CombatNumber {
  id: number
  enemyId: number
  amount: number
  crit: boolean
  heal: boolean
  born: number
}

interface SlotState {
  charges: number
  /** When the next charge comes back, or null when full. */
  rechargeAt: number | null
}

/** How long a pressed or failed slot shows, and the failure message (DEF_Hud). */
const PRESSED = 0.12
const FAILED = 0.35
const MESSAGE = 1.5

export class HudSim {
  t = 0
  at: Vec = { x: 0, y: 0 }
  heading = 0
  /** −1 to 1: S and W, A and D. */
  input = { forward: 0, turn: 0 }
  health: number
  readonly maxHealth: number
  resource: number
  stamina: number = STAMINA.max
  staminaAlpha = 0
  private staminaFullFor = STAMINA.fadeDelay + STAMINA.fadeDuration
  private staminaSpentAt = -Infinity
  slots = new Map<ActionSlotId, SlotState>()
  gcd: { start: number; end: number } | null = null
  cast: { slot: ActionSlotId; name: string; start: number; end: number } | null = null
  message: { text: string; until: number } | null = null
  pressed: { slot: ActionSlotId; until: number } | null = null
  failed: { slot: ActionSlotId; until: number } | null = null
  enemies: Enemy[]
  numbers: CombatNumber[] = []
  /** When each ghoul leaves. */
  minions: number[] = []
  buffs: EffectIcon[] = []
  /** Your effects on enemies, by enemy id. */
  debuffs = new Map<number, EffectIcon[]>()
  /** The time of day, for the minimap's clock (ms since 1970). */
  clock = Date.now()
  private nextNumber = 1
  private hits = 0

  readonly kit: HudKit
  readonly level: number
  readonly situation: Situation

  constructor(kit: HudKit, level: number, situation: Situation) {
    this.kit = kit
    this.level = level
    this.situation = situation
    this.maxHealth = Math.round(kit.kit.character.stats.health * (1 + kit.kit.character.stats.healthPct / 100))
    this.health = Math.round(this.maxHealth * 0.86)
    this.resource = kit.resource.startsFull ? kit.resource.max : Math.round(kit.resource.max * 0.4)
    this.enemies = sampleEnemies(level, situation)
    for (const s of kit.slots) this.slots.set(s.id, { charges: Math.max(1, s.charges), rechargeAt: null })
    const buff = kit.slots.find((s) => s.passive && s.open)
    if (buff) this.buffs.push({ name: buff.name, color: buff.color, harmful: false, stacks: 1, endsAt: Infinity })
    if (situation === 'boss') this.buffs.push({ name: 'Steady bleed', color: '#c0432f', harmful: true, stacks: 1, endsAt: 9 })
    if (kit.minions.length > 0) this.minions = [16, 21]
  }

  get boss(): BossState | null {
    return this.situation === 'boss' ? bossAt(this.t + 42) : null
  }

  get target(): Enemy | null {
    return pickTarget(this.enemies, this.at, this.heading)
  }

  get moving() {
    return this.input.forward !== 0
  }

  /** Seconds left on a slot's cooldown (for a slot with charges: until the next one, when none is left). */
  cooldownLeft(slot: HudSlot): number {
    const s = this.slots.get(slot.id)
    if (!s || s.charges > 0 || s.rechargeAt === null) return 0
    return Math.max(0, s.rechargeAt - this.t)
  }

  /** 0–1 of the slot's face the sweep covers: its own cooldown, or the global one. */
  sweep(slot: HudSlot): number {
    if (slot.passive || !slot.open) return 0
    const left = this.cooldownLeft(slot)
    if (left > 0) return left / Math.max(0.01, slot.cooldown)
    if (this.gcd && slot.gcd > 0 && this.t < this.gcd.end) return (this.gcd.end - this.t) / (this.gcd.end - this.gcd.start)
    return 0
  }

  charges(slot: HudSlot) {
    return this.slots.get(slot.id)?.charges ?? 0
  }

  private fail(slot: HudSlot, text: string) {
    this.failed = { slot: slot.id, until: this.t + FAILED }
    this.message = { text, until: this.t + MESSAGE }
    return text
  }

  /** Presses a slot's key: returns the failure message, or null when it went off (or started casting). */
  use(index: number): string | null {
    const slot = this.kit.slots[index]
    if (!slot || slot.passive) return null
    const resource = this.kit.resource.unity ?? 'mana'
    this.pressed = { slot: slot.id, until: this.t + PRESSED }
    if (!slot.open) return this.fail(slot, failureText('locked', resource, slot.unlock))
    if (this.cast) return null
    if (this.cooldownLeft(slot) > 0) return this.fail(slot, failureText('cooldown', resource))
    if (this.gcd && slot.gcd > 0 && this.t < this.gcd.end) return null
    const gains = slot.id === 'basic' && this.kit.resource.regen === 0
    if (!gains && slot.cost > this.resource + 1e-6) {
      if (this.kit.resource.unity) return this.fail(slot, failureText('resource', this.kit.resource.unity))
      return this.fail(slot, `Not enough ${this.kit.resource.name.toLowerCase()}`)
    }
    if (gains && this.kit.resource.unity === 'imps' && this.resource >= this.kit.resource.max)
      return this.fail(slot, failureText('minionCap', 'imps'))
    const hurts = this.kit.role !== 'Healer' && ['basic', 'ability1', 'ability2', 'ability3'].includes(slot.id) && slot.tree?.kind !== 'mobility'
    if (hurts && !this.target) return this.fail(slot, failureText('noTarget', resource))
    if (slot.castTime > 0) {
      if (this.moving) return this.fail(slot, "You can't cast while moving")
      this.cast = { slot: slot.id, name: slot.name, start: this.t, end: this.t + slot.castTime }
      if (slot.gcd > 0) this.gcd = { start: this.t, end: this.t + Math.max(slot.gcd, 0.5) }
      return null
    }
    if (slot.gcd > 0) this.gcd = { start: this.t, end: this.t + slot.gcd }
    this.finish(slot)
    return null
  }

  /** The cast lands: pay, gain, start the cooldown, and show what it did. */
  private finish(slot: HudSlot) {
    const r = this.kit.resource
    if (slot.id === 'basic' && r.regen === 0) {
      const gain = r.unity === 'focus' ? 10 : r.unity === 'rage' ? 5 : r.max >= 50 ? 10 : 1
      this.resource = Math.min(r.max, this.resource + gain)
    } else this.resource = Math.max(0, this.resource - slot.cost)
    const s = this.slots.get(slot.id)
    if (s && slot.cooldown > 0) {
      s.charges -= 1
      if (s.rechargeAt === null) s.rechargeAt = this.t + slot.cooldown
    }
    const kind = slot.tree?.kind
    if (kind === 'cooldown' || slot.id === 'big') this.buffs.push({ name: slot.name, color: slot.color, harmful: false, stacks: 1, endsAt: this.t + 20 })
    if (this.kit.minions.some((m) => m.slot === slot.id)) {
      const m = this.kit.minions.find((x) => x.slot === slot.id)!
      this.minions = [...this.minions, this.t + m.duration].sort((a, b) => a - b).slice(-m.max)
    }
    const heals = this.kit.role === 'Healer' && slot.id !== 'basic'
    if (heals && slot.id !== 'mobility') this.health = Math.min(this.maxHealth, this.health + this.maxHealth * 0.12)
    const target = this.target
    if (target && !heals && slot.id !== 'mobility' && slot.id !== 'big') {
      this.hits += 1
      const crit = this.hits % 4 === 0
      const amount = Math.round((180 + slot.cost * 9 + this.level * 14) * (crit ? 1.5 : 1))
      target.health = Math.max(0, target.health - amount)
      this.numbers.push({ id: this.nextNumber++, enemyId: target.id, amount, crit, heal: false, born: this.t })
      const dot = slot.tree?.spec?.effects.find((e) => e.type === 'dot')
      if (dot) {
        const list = (this.debuffs.get(target.id) ?? []).filter((d) => d.name !== slot.name)
        this.debuffs.set(target.id, [...list, { name: slot.name, color: slot.color, harmful: true, stacks: 1, endsAt: this.t + (dot.duration ?? 12) }])
      }
    }
  }

  /** A line in the message spot above the action bar, for 1.5 sec. */
  say(text: string) {
    this.message = { text, until: this.t + MESSAGE }
  }

  /** V: a dodge, paid with stamina. */
  dodge(): string | null {
    if (this.stamina < STAMINA.dodgeCost) {
      this.message = { text: 'Not enough stamina', until: this.t + MESSAGE }
      return this.message.text
    }
    this.stamina -= STAMINA.dodgeCost
    this.staminaSpentAt = this.t
    this.at = walk(this.at, this.heading, { forward: 1, turn: 0 }, 0.6, 8).at
    return null
  }

  tick(step: number, now = Date.now()) {
    const dt = Math.max(0, step)
    this.t += dt
    this.clock = now
    if (this.input.forward !== 0 || this.input.turn !== 0) {
      const step = walk(this.at, this.heading, this.input, dt)
      this.at = step.at
      this.heading = step.heading
      // Walking breaks a cast.
      if (this.cast && this.input.forward !== 0) this.cast = null
    }
    if (this.cast && this.t >= this.cast.end) {
      const slot = this.kit.slots.find((s) => s.id === this.cast!.slot)
      this.cast = null
      if (slot) this.finish(slot)
    }
    for (const [id, s] of this.slots) {
      const slot = this.kit.slots.find((x) => x.id === id)
      while (slot && s.rechargeAt !== null && this.t >= s.rechargeAt) {
        s.charges = Math.min(Math.max(1, slot.charges), s.charges + 1)
        s.rechargeAt = s.charges < Math.max(1, slot.charges) ? s.rechargeAt + slot.cooldown : null
      }
    }
    const r = this.kit.resource
    this.resource = Math.min(r.max, this.resource + r.regen * dt)
    // Rage drains out of combat; the fight keeps it up a little.
    if (r.unity === 'rage' && this.situation === 'explore') this.resource = Math.max(0, this.resource - 2 * dt)
    if (this.t - this.staminaSpentAt > STAMINA.regenDelay) this.stamina = Math.min(STAMINA.max, this.stamina + STAMINA.regen * dt)
    this.staminaAlpha = this.fadeStamina(dt)
    // Some damage comes in during the boss fight, some healing out of it.
    const hurt = this.situation === 'boss' ? 0.018 + 0.02 * Math.max(0, Math.sin(this.t / 3)) : -0.01
    this.health = Math.max(this.maxHealth * 0.12, Math.min(this.maxHealth, this.health - this.maxHealth * hurt * dt))
    this.minions = this.minions.filter((m) => m > this.t)
    this.buffs = this.buffs.filter((b) => b.endsAt > this.t || (b.name === 'Steady bleed' && this.situation === 'boss' && this.refreshBleed(b)))
    for (const [id, list] of this.debuffs) this.debuffs.set(id, list.filter((d) => d.endsAt > this.t))
    this.numbers = this.numbers.filter((n) => this.t - n.born < 1.2)
    for (const e of this.enemies) if (e.health <= 0 && !e.boss) e.health = e.maxHealth
    if (this.message && this.t >= this.message.until) this.message = null
    if (this.pressed && this.t >= this.pressed.until) this.pressed = null
    if (this.failed && this.t >= this.failed.until) this.failed = null
  }

  private refreshBleed(b: EffectIcon) {
    b.endsAt = this.t + 9
    b.stacks = b.stacks === 1 ? 2 : 1
    return true
  }

  /** Shown while stamina is below full; once full, 2 sec more, then fading over 0.4 sec (HudRules StaminaFade). */
  private fadeStamina(dt: number): number {
    if (this.stamina < STAMINA.max - 0.001) {
      this.staminaFullFor = 0
      return 1
    }
    this.staminaFullFor += dt
    const fading = this.staminaFullFor - STAMINA.fadeDelay
    if (fading <= 0) return 1
    return fading >= STAMINA.fadeDuration ? 0 : 1 - fading / STAMINA.fadeDuration
  }
}
