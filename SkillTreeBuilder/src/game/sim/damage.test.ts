import { describe, expect, it } from 'vitest'
import type { Kit } from '../resolve.ts'
import { artifact, kitFor } from '../testkit.ts'
import { Arena } from './arena.ts'
import { SCENARIOS } from './scenarios.ts'

// The target dummies: a big dummy at (30, 12) and four small ones, nobody taking damage.
const DUMMIES = SCENARIOS.find((s) => s.id === 'dummies')!
const DT = 0.05
const run = (arena: Arena, seconds: number) => {
  for (let t = 0; t < seconds - 1e-9; t += DT) arena.step(DT)
}
/** Presses a slot and steps until its cast is done. */
const cast = (arena: Arena, slot: number) => {
  arena.press(slot)
  arena.step(DT)
  while (arena.cast) arena.step(DT)
}
const damageOf = (arena: Arena, name: string) => arena.meter.damageRows.get(name)
/** No crits, so damage numbers are exact. */
const noCrits = (kit: Kit): Kit => {
  const flat = (a: Kit['slots'][number]) => a && { ...a, effects: a.effects.map((e) => ({ ...e, critChance: 0 })) }
  return {
    ...kit,
    slots: kit.slots.map(flat),
    minion: kit.minion && { ...kit.minion, critChance: 0 },
  }
}

const book = artifact('tome-of-summoning')
const daggers = artifact('twin-daggers')

describe('the summoning book', () => {
  it('summons imps as its resource, and each imp attacks on its own', () => {
    const arena = new Arena(kitFor(book, [null, null, null, null, null, null]), DUMMIES, { seed: 1 })
    expect(arena.resource).toBe(0)
    cast(arena, 0)
    cast(arena, 0)
    expect(arena.imps).toHaveLength(2)
    run(arena, 3)
    expect(damageOf(arena, 'Imp')?.hits).toBeGreaterThanOrEqual(3)
  })

  it('pays for spells by sacrificing imps', () => {
    const arena = new Arena(kitFor(book, ['festering-rot', null, null, null, null, null]), DUMMIES, { seed: 1 })
    arena.press(1)
    arena.step(DT)
    expect(arena.notice?.text).toBe('Not enough imps')
    cast(arena, 0)
    run(arena, 1)
    cast(arena, 1)
    expect(arena.imps).toHaveLength(0)
  })

  it('rotates Plague through Pox, Blight and Malady, for free', () => {
    const arena = new Arena(kitFor(book, ['plague', null, null, null, null, null]), DUMMIES, { seed: 1 })
    for (let i = 0; i < 3; i++) {
      cast(arena, 1)
      run(arena, 1)
    }
    expect(arena.boss.dots.map((d) => d.name)).toEqual(['Pox', 'Blight', 'Malady'])
    expect(arena.meter.resourceSpent.size).toBe(0)
  })

  it('hits every afflicted enemy once per DoT on it with Harvest', () => {
    const arena = new Arena(noCrits(kitFor(book, ['plague', 'harvest', null, null, null, null])), DUMMIES, { seed: 1 })
    cast(arena, 1)
    run(arena, 1)
    cast(arena, 1)
    run(arena, 1)
    cast(arena, 0)
    run(arena, 1)
    cast(arena, 0)
    run(arena, 1)
    cast(arena, 2)
    // Pox and Blight on the big dummy: 220 for each.
    expect(damageOf(arena, 'Harvest')).toMatchObject({ hits: 1, damage: 440 })
  })

  it('lets you command up to 15 imps', () => {
    const arena = new Arena(kitFor(book, [null, null, null, null, null, null]), DUMMIES, { seed: 1 })
    for (let i = 0; i < 16; i++) cast(arena, 0)
    expect(arena.imps).toHaveLength(15)
    expect(arena.notice?.text).toBe('You command as many imps as you can')
  })

  it('has no cooldown on Harvest: only imps limit it', () => {
    const arena = new Arena(kitFor(book, ['plague', 'harvest', null, null, null, null]), DUMMIES, { seed: 1 })
    for (let i = 0; i < 4; i++) cast(arena, 0)
    cast(arena, 1)
    run(arena, 1)
    cast(arena, 2)
    run(arena, 1)
    cast(arena, 2)
    expect(arena.meter.casts.get('Harvest')).toBe(2)
    expect(arena.imps).toHaveLength(0)
  })

  it('keeps every Festering Rot stack on its own timer', () => {
    const arena = new Arena(noCrits(kitFor(book, ['festering-rot', null, null, null, null, null])), DUMMIES, { seed: 1 })
    for (let i = 0; i < 3; i++) cast(arena, 0)
    cast(arena, 1)
    run(arena, 5)
    cast(arena, 1)
    run(arena, 1)
    cast(arena, 1)
    expect(arena.boss.dots[0].stacks).toHaveLength(3)
    // The first stack rolls off on its own; the other two keep going.
    run(arena, 25)
    expect(arena.boss.dots[0].stacks).toHaveLength(2)
  })

  it('makes every enemy inside Miasma sick', () => {
    const arena = new Arena(kitFor(book, ['miasma', null, null, null, null, null]), DUMMIES, { seed: 1 })
    cast(arena, 0)
    cast(arena, 0)
    cast(arena, 1)
    run(arena, 1.5)
    // The big dummy and the two small ones nearest it are within 8 yd.
    expect(arena.enemies.filter((e) => e.dots.some((d) => d.name === 'Sickness')).length).toBeGreaterThanOrEqual(3)
  })

  it('hits the target and everything around it with Necrotic Explosion', () => {
    const arena = new Arena(kitFor(book, ['necrotic-explosion', null, null, null, null, null]), DUMMIES, { seed: 1 })
    cast(arena, 0)
    cast(arena, 1)
    expect(damageOf(arena, 'Necrotic Explosion')?.hits).toBeGreaterThanOrEqual(3)
  })
})

describe('the daggers', () => {
  it('build combo points with strikes and spend them all on a finisher', () => {
    const arena = new Arena(noCrits(kitFor(daggers, ['eviscerate', null, null, null, null, null])), DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 16 }
    for (let i = 0; i < 3; i++) {
      cast(arena, 0)
      run(arena, 1)
    }
    expect(arena.resource).toBe(3)
    cast(arena, 1)
    expect(arena.resource).toBe(0)
    expect(damageOf(arena, 'Eviscerate')).toMatchObject({ hits: 1, damage: 900 })
  })

  it('need you in melee range', () => {
    const arena = new Arena(kitFor(daggers, [null, null, null, null, null, null]), DUMMIES, { seed: 1 })
    arena.press(0)
    arena.step(DT)
    expect(arena.notice?.text).toBe('Get closer to an enemy')
  })
})

describe('group buffs and shared ultimates', () => {
  it('give the whole group their stats, you included', () => {
    const kit = kitFor(artifact('lifewarden-staff'), [null, null, null, null, null, 'vitality-aura'])
    expect(kit.groupStats.healthPct).toBe(8)
    expect(kit.character.stats.health).toBe(Math.round(2400 * 1.08))
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    expect(arena.allies.find((a) => a.name === 'Tank')!.maxHp).toBeCloseTo(30000 * 1.08)
  })

  it('share Fervor between roles and give its haste to the group', () => {
    const arena = new Arena(kitFor(book, [null, null, null, 'fervor', null, null]), DUMMIES, { seed: 1 })
    cast(arena, 4)
    expect(arena.stats().haste).toBe(30)
    expect(arena.groupStats().haste).toBe(30)
  })
})
