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
  it('build combo points with strikes and spend them in steps of the cost', () => {
    const arena = new Arena(noCrits(kitFor(daggers, ['eviscerate', null, null, null, null, null])), DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 16 }
    for (let i = 0; i < 5; i++) {
      cast(arena, 0)
      run(arena, 1)
    }
    expect(arena.resource).toBe(5)
    // Eviscerate costs 2: with 5 points it pays two steps (4 points), keeps 1, and hits twice as hard.
    cast(arena, 1)
    expect(arena.resource).toBe(1)
    expect(damageOf(arena, 'Eviscerate')).toMatchObject({ hits: 1, damage: 1200 })
  })

  it('make each extra step stronger with Compounding, and count steps for procs', () => {
    const kit = noCrits(
      kitFor(daggers, ['rupture', null, null, null, null, null], {
        'twin-daggers': { compounding: 3, bandolier: 2, adrenaline: 2 },
      }),
    )
    const rupture = kit.slots[1]!
    expect(rupture.combo).toEqual({ maxSteps: 4, perStep: 1.3 })
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 16 }
    arena.resource = 6
    cast(arena, 1)
    expect(arena.resource).toBe(0)
    // Three steps at +30%: 1 + 2 × 1.3 = 3.6 times its 8 sec.
    expect(arena.enemies.flatMap((e) => e.dots).find((d) => d.name === 'Rupture')?.duration).toBeCloseTo(28.8)
    expect(arena.stats().haste).toBe(10)
  })

  it('pay a plain cost on a weapon without combo points', () => {
    const arena = new Arena(noCrits(kitFor(book, ['doom-bolt', null, null, null, null, null])), DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = 6
    cast(arena, 1)
    expect(arena.resource).toBe(3)
    expect(damageOf(arena, 'Doom Bolt')).toMatchObject({ hits: 1, damage: 2000 })
  })

  it('pay for a spell in steps too (Doom Bolt costs 3: two steps at 6 combo points)', () => {
    const kit = noCrits(kitFor(daggers, ['doom-bolt', null, null, null, null, null]))
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = 6
    cast(arena, 1)
    expect(arena.resource).toBe(0)
    expect(damageOf(arena, 'Doom Bolt')).toMatchObject({ hits: 1, damage: 4000 })
  })

  it('need you in melee range', () => {
    const arena = new Arena(kitFor(daggers, [null, null, null, null, null, null]), DUMMIES, { seed: 1 })
    arena.press(0)
    arena.step(DT)
    expect(arena.notice?.text).toBe('Get closer to an enemy')
  })
})

describe('the bow', () => {
  const bow = artifact('ashwood-longbow')

  it('starts with no focus and fills it by shooting', () => {
    const arena = new Arena(noCrits(kitFor(bow, [null, null, null, null, null, null])), DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 40 }
    expect(arena.resource).toBe(0)
    expect(arena.maxResource).toBe(100)
    cast(arena, 0)
    expect(arena.resource).toBe(10)
    expect(damageOf(arena, 'Swift Arrow')).toMatchObject({ hits: 1, damage: 220 })
  })

  it('has its own shots, and pays for shared spells in focus', () => {
    const onBow = kitFor(bow, ['aimed-shot', 'multi-shot', 'doom-bolt', null, null, null])
    expect(onBow.slots.slice(1, 4).map((a) => a!.cost)).toEqual([30, 20, 30])
    expect(kitFor(book, ['doom-bolt', null, null, null, null, null]).slots[1]!.text).toContain('Costs 3 imps')

    const arena = new Arena(noCrits(onBow), DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 40 }
    arena.resource = 50
    cast(arena, 2)
    // Multi-Shot hits the big dummy and the small ones around it.
    expect(damageOf(arena, 'Multi-Shot')?.hits).toBeGreaterThanOrEqual(3)
    expect(arena.resource).toBe(30)
  })

  it('counts costs and gains in tens of focus', () => {
    const kit = kitFor(bow, ['harvest', 'backstab', 'festering-rot', null, null, null])
    expect(kit.slots[1]!.cost).toBe(20)
    expect(kit.slots[2]!.effects.find((e) => e.type === 'restore')?.restore).toBe(20)
    expect(kit.slots[3]!.cost).toBe(10)
    expect(kit.slots[1]!.text).toContain('Costs 20 focus')
    // Talents in the bow's own tree add plain focus on top.
    const steady = kitFor(bow, [null, null, null, null, null, null], { 'ashwood-longbow': { 'steady-aim': 2 } })
    expect(steady.slots[0]!.effects.find((e) => e.type === 'restore')?.restore).toBe(14)
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
