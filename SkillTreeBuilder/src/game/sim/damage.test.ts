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
    arena.resource = 5
    cast(arena, 2)
    // Pox and Blight on the big dummy: 550 for each.
    expect(damageOf(arena, 'Harvest')).toMatchObject({ hits: 1, damage: 1100 })
  })

  it('lets you command up to 15 imps', () => {
    const arena = new Arena(kitFor(book, [null, null, null, null, null, null]), DUMMIES, { seed: 1 })
    arena.resource = 15
    cast(arena, 0)
    expect(arena.imps).toHaveLength(15)
    expect(arena.notice?.text).toBe('You command as many imps as you can')
  })

  it('summons each imp for 14 sec, in a 2 sec cast', () => {
    const arena = new Arena(kitFor(book, [null, null, null, null, null, null]), DUMMIES, { seed: 1 })
    arena.press(0)
    run(arena, 1.9)
    expect(arena.imps).toHaveLength(0)
    run(arena, 0.2)
    expect(arena.imps).toHaveLength(1)
    run(arena, 13.8)
    expect(arena.imps).toHaveLength(1)
    run(arena, 0.3)
    expect(arena.imps).toHaveLength(0)
    expect(arena.resource).toBe(0)
  })

  it('sacrifices the imp with the least time left first', () => {
    const arena = new Arena(kitFor(book, ['festering-rot', null, null, null, null, null]), DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    cast(arena, 0)
    run(arena, 1)
    cast(arena, 0)
    const [older, newer] = arena.imps
    cast(arena, 1)
    expect(arena.imps).toEqual([newer])
    expect(older.endsAt).toBeLessThan(newer.endsAt)
  })

  it('has no cooldown on Harvest: only imps limit it', () => {
    const arena = new Arena(kitFor(book, ['plague', 'harvest', null, null, null, null]), DUMMIES, { seed: 1 })
    arena.resource = 10
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
    const arena = new Arena(noCrits(kitFor(book, ['festering-rot', null, null, null, null, null])), DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = 6
    cast(arena, 1)
    expect(arena.resource).toBe(5)
  })

  it('let Doom Bolt spend all their combo points too', () => {
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

describe("the summoning book's tree", () => {
  const tomeKit = (ranks: Record<string, number>, slots: (string | null)[] = [null, null, null, null, null, null]) =>
    noCrits(kitFor(book, slots, { 'tome-of-summoning': ranks }))
  /** The same kit with every talent proc made certain, for procs that roll a small chance. */
  const certain = (kit: Kit): Kit => ({ ...kit, procs: kit.procs.map((p) => ({ ...p, proc: { ...p.proc, chance: 100 } })) })
  const ready = (kit: Kit, imps = 0) => {
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = imps
    return arena
  }
  const moving = { move: { x: 1, y: 0 }, aim: null, held: new Set<number>() }

  it('makes imps last longer and Summon Imp cast faster', () => {
    const kit = tomeKit({ 'lasting-pact': 2, 'quick-summons': 2, 'infernal-haste': 2 })
    expect(kit.slots[0]!.minion!.duration).toBe(24)
    expect(kit.slots[0]!.castTime).toBeCloseTo(1.5 / 1.06)
    expect(kit.character.stats.haste).toBe(6)
  })

  it('builds Quick Invocation while you move, for an instant summon at 100%', () => {
    const arena = ready(tomeKit({ 'quick-invocation': 2 }))
    for (let t = 0; t < 13; t += DT) arena.step(DT, moving)
    expect(arena.buffs.find((b) => b.id === 'quick-invocation')?.stacks).toBe(13)
    expect(arena.current(0)!.castTime).toBe(0)
    // Instant, so it goes off even on the move, and uses the stacks up.
    arena.press(0)
    arena.step(DT, moving)
    expect(arena.imps).toHaveLength(1)
    expect(arena.buffs.some((b) => b.id === 'quick-invocation')).toBe(false)
  })

  it('lengthens every imp on a hit with Bloodbound', () => {
    const arena = ready(certain(tomeKit({ bloodbound: 2 })), 2)
    run(arena, DT)
    const before = arena.imps.map((i) => i.endsAt)
    run(arena, 1.5)
    // At least one imp attack landed, adding a second to both imps.
    arena.imps.forEach((imp, i) => expect(imp.endsAt).toBeGreaterThanOrEqual(before[i] + 1))
  })

  it('summons an extra imp from an imp attack with Spawning, at most once every 15 sec', () => {
    const arena = ready(certain(tomeKit({ spawning: 2 })), 1)
    run(arena, 1.5)
    expect(arena.imps).toHaveLength(2)
    run(arena, 10)
    expect(arena.imps).toHaveLength(2)
  })

  it('spares sacrificed imps with Stubborn Imps', () => {
    const base = tomeKit({ 'stubborn-imps': 2 }, ['festering-rot', null, null, null, null, null])
    expect(base.character.stats.spareChance).toBe(10)
    const kit: Kit = { ...base, character: { ...base.character, stats: { ...base.character.stats, spareChance: 100 } } }
    const arena = ready(kit, 3)
    cast(arena, 1)
    expect(arena.resource).toBe(3)
    expect(arena.meter.resourceSpent.get('Festering Rot') ?? 0).toBe(0)
  })

  it('gives a stacking buff for every sacrificed imp with Dark Bargain, without refreshing it', () => {
    const arena = ready(tomeKit({ 'dark-bargain': 1 }, ['doom-bolt', null, null, null, null, null]), 6)
    cast(arena, 1)
    const bargains = arena.buffs.filter((b) => b.id.startsWith('dark-bargain'))
    expect(bargains.reduce((n, b) => n + b.stacks, 0)).toBe(6)
    const ends = new Map(bargains.map((b) => [b.id, b.endsAt]))
    run(arena, 2)
    arena.resource = 3
    cast(arena, 1)
    for (const b of arena.buffs.filter((x) => ends.has(x.id))) expect(b.endsAt).toBe(ends.get(b.id))
  })

  it('summons 2 imps on every third Summon Imp with Twin Summons', () => {
    const arena = ready(tomeKit({ 'twin-summons': 1 }))
    for (let i = 0; i < 3; i++) cast(arena, 0)
    expect(arena.imps).toHaveLength(4)
  })
})

describe("Harvest's tree", () => {
  // Plague puts Pox on the big dummy; the four small ones around it have nothing.
  /** No crits at all: buffs make the arena resolve abilities again, from your stats. */
  const harvestKit = (ranks: Record<string, number>) => {
    const kit = noCrits(kitFor(book, ['plague', 'harvest', null, null, null, null], { harvest: ranks }))
    return { ...kit, character: { ...kit.character, stats: { ...kit.character.stats, crit: 0 } } }
  }
  /** Pox on the big dummy, the global cooldown over, and imps to spend. */
  const plagued = (kit: Kit, imps = 15) => {
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    cast(arena, 1)
    run(arena, 1)
    arena.resource = imps
    return arena
  }
  const certain = (kit: Kit): Kit => ({ ...kit, procs: kit.procs.map((p) => ({ ...p, proc: { ...p.proc, chance: 100 } })) })

  it('costs 5 and is instant', () => {
    const harvest = harvestKit({}).slots[2]!
    expect(harvest.cost).toBe(5)
    expect(harvest.castTime).toBe(0)
    expect(harvestKit({ 'reapers-due': 1 }).slots[2]!.cost).toBe(4)
  })

  it('deals more for each DoT on the target with Bountiful Harvest', () => {
    const arena = plagued(harvestKit({ 'bountiful-harvest': 2 }))
    cast(arena, 2)
    // One DoT: 550, 10% more for it.
    expect(damageOf(arena, 'Harvest')!.damage).toBeCloseTo(550 * 1.1)
  })

  it('splashes each hit onto the enemies around it with Chaff, much more on a lone target with Lone Reaper', () => {
    const chaff = plagued(harvestKit({ chaff: 2 }))
    cast(chaff, 2)
    const splash = damageOf(chaff, 'Harvest splash')!
    expect(splash.hits).toBe(4)
    expect(splash.damage / splash.hits).toBeCloseTo(550 * 0.3)

    const lone = plagued(harvestKit({ chaff: 2, 'lone-reaper': 2 }))
    cast(lone, 2)
    const hit = 550 * 1.4
    expect(damageOf(lone, 'Harvest')!.damage).toBeCloseTo(hit)
    expect(damageOf(lone, 'Harvest splash')!.damage / 4).toBeCloseTo(hit * 0.3 * 3)
  })

  it('adds Potency to its damage with Ripening', () => {
    const kit = harvestKit({ ripening: 1 })
    expect(kit.resolve('harvest', [], { ...kit.character.stats, potency: 25 })!.effects[0].amount).toBeCloseTo(550 * 1.25)
  })

  it('grows with every DoT tick with Reaping, and uses the stacks up', () => {
    const arena = plagued(harvestKit({ reaping: 1 }))
    run(arena, 2.5)
    // Pox ticks once a second: one tick during setup, two more since.
    const stacks = arena.buffs.find((b) => b.id === 'reaping')!.stacks
    expect(stacks).toBe(3)
    cast(arena, 2)
    expect(damageOf(arena, 'Harvest')!.damage).toBeCloseTo(550 * 1.03)
    expect(arena.buffs.some((b) => b.id === 'reaping')).toBe(false)
  })

  it('makes the next Harvest free with Windfall', () => {
    const arena = plagued(certain(harvestKit({ windfall: 2 })), 5)
    expect(arena.current(2)!.cost).toBe(0)
    cast(arena, 2)
    expect(arena.resource).toBe(5)
  })

  it('goes off on its own every 10 sec, for free, with Endless Harvest', () => {
    const kit = harvestKit({ 'endless-harvest': 1 })
    expect(kit.slots[2]!.autocast).toBe(10)
    const arena = plagued(kit, 5)
    arena.press(2)
    arena.step(DT)
    expect(arena.notice?.text).toBe('Harvest goes off on its own')
    run(arena, 9.5)
    expect(damageOf(arena, 'Harvest')).toBeDefined()
    expect(arena.meter.casts.get('Harvest')).toBe(1)
    expect(arena.resource).toBe(5)
  })
})

describe('casting and moving', () => {
  it("won't start a cast while you walk, and keeps you still while you cast", () => {
    const arena = new Arena(kitFor(book, [null, null, null, null, null, null]), DUMMIES, { seed: 1 })
    const start = { ...arena.player.pos }
    arena.press(0)
    arena.step(DT, { move: { x: 1, y: 0 }, aim: null, held: new Set() })
    expect(arena.cast).toBeNull()
    expect(arena.notice?.text).toBe("You can't cast while moving")
    arena.press(0)
    arena.step(DT)
    expect(arena.cast?.ability.name).toBe('Summon Imp')
    const casting = { ...arena.player.pos }
    for (let t = 0; t < 1; t += DT) arena.step(DT, { move: { x: 1, y: 0 }, aim: null, held: new Set() })
    expect(arena.player.pos).toEqual(casting)
    expect(arena.player.pos.x).toBeGreaterThan(start.x)
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
    expect(damageOf(arena, 'Swift Arrow')).toMatchObject({ hits: 1, damage: 330 })
  })

  it('has its own shots, and pays for shared spells in focus', () => {
    const onBow = kitFor(bow, ['aimed-shot', 'multi-shot', 'doom-bolt', null, null, null])
    expect(onBow.slots.slice(1, 4).map((a) => a!.cost)).toEqual([30, 20, 30])
    expect(kitFor(book, ['doom-bolt', null, null, null, null, null]).slots[1]!.text).toContain('Costs at least 3 imps')

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
    expect(kit.slots[1]!.cost).toBe(50)
    expect(kit.slots[2]!.effects.find((e) => e.type === 'restore')?.restore).toBe(20)
    expect(kit.slots[3]!.cost).toBe(10)
    expect(kit.slots[1]!.text).toContain('Costs 50 focus')
    // Talents in the bow's own tree add plain focus on top.
    const fletched = kitFor(bow, [null, null, null, null, null, null], { 'ashwood-longbow': { fletching: 2 } })
    expect(fletched.slots[0]!.effects.find((e) => e.type === 'restore')?.restore).toBe(14)
  })
})

describe("the bow's tree", () => {
  const bow = artifact('ashwood-longbow')
  const bowKit = (ranks: Record<string, number>, slots: (string | null)[] = [null, null, null, null, null, null]) =>
    noCrits(kitFor(bow, slots, { 'ashwood-longbow': ranks }))
  const ready = (kit: Kit) => {
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 40 }
    return arena
  }
  const restoreOf = (kit: Kit) => kit.slots[0]!.effects.find((e) => e.type === 'restore')!.restore
  const gained = (arena: Arena, source: string) => arena.meter.resourceGained.get(source) ?? 0

  it('casts Swift Arrow in 1.5 sec for 10 focus', () => {
    const arena = ready(bowKit({}))
    arena.press(0)
    run(arena, 1.4)
    expect(arena.resource).toBe(0)
    run(arena, 0.15)
    expect(arena.resource).toBe(10)
  })

  it('makes Swift Arrow slower with Steady Aim, and stronger in proportion', () => {
    const kit = bowKit({ 'steady-aim': 2, fletching: 2 })
    const arrow = kit.slots[0]!
    expect(arrow.castTime).toBe(2)
    expect(arrow.effects[0].amount).toBeCloseTo((330 * 2) / 1.5)
    // Fletching's 4 more focus grows in proportion too: (10 + 4) × 2 / 1.5.
    expect(restoreOf(kit)).toBeCloseTo((14 * 2) / 1.5)
  })

  it('casts faster with Rapid Fire after each hit, until you use another ability', () => {
    const arena = ready(bowKit({ 'steady-aim': 2, 'rapid-fire': 2 }, ['multi-shot', null, null, null, null, null]))
    expect(arena.current(0)!.castTime).toBe(2)
    cast(arena, 0)
    expect(arena.current(0)!.castTime).toBe(1.5)
    arena.resource = 20
    cast(arena, 1)
    expect(damageOf(arena, 'Multi-Shot')).toBeDefined()
    expect(arena.buffs.some((b) => b.id === 'rapid-fire')).toBe(false)
    expect(arena.current(0)!.castTime).toBe(2)
  })

  it('gives focus every 5 sec with Focused Mind', () => {
    const arena = ready(bowKit({ 'focused-mind': 2 }))
    run(arena, 4.9)
    expect(arena.resource).toBe(0)
    run(arena, 5.2)
    expect(gained(arena, 'Focused Mind')).toBe(8)
  })

  it('gives focus on every critical hit with Piercing Shot', () => {
    const base = bowKit({ 'piercing-shot': 2 })
    const kit: Kit = { ...base, slots: base.slots.map((a) => a && { ...a, effects: a.effects.map((e) => ({ ...e, critChance: 100 })) }) }
    const arena = ready(kit)
    cast(arena, 0)
    expect(gained(arena, 'Piercing Shot')).toBe(2)
  })

  it("gives each arrow's focus back over Barbed Arrows' 5 sec bleed, a whole point at a time", () => {
    // Fletching makes it 12 focus an arrow: 2.4 a second, so 2, 2, 3, 2, 3 with the fractions carried.
    const arena = ready(bowKit({ 'barbed-arrows': 1, fletching: 1 }))
    cast(arena, 0)
    expect(gained(arena, 'Swift Arrow')).toBe(12)
    // Ticks land a whole second apart, so count each second's gain from half a second in.
    run(arena, 0.5)
    const ticks: number[] = []
    for (let i = 0; i < 6; i++) {
      const before = gained(arena, 'Barbed Arrows')
      run(arena, 1)
      ticks.push(gained(arena, 'Barbed Arrows') - before)
    }
    expect(ticks).toEqual([2, 2, 3, 2, 3, 0])
    expect(arena.enemies[0].dots).toHaveLength(0)
  })

  it('keeps one Barbed Arrows bleed per target: another arrow adds 5 sec and its focus to it', () => {
    // Potency doesn't lengthen it: only another arrow does.
    const base = bowKit({ 'barbed-arrows': 1 })
    const potent: Kit = { ...base, character: { ...base.character, stats: { ...base.character.stats, potency: 50 } } }
    const arena = ready(potent)
    cast(arena, 0)
    const target = arena.enemies[0]
    expect(target.dots[0].endsAt - arena.time).toBeCloseTo(5, 1)
    const firstEnd = target.dots[0].endsAt
    cast(arena, 0)
    // Still one bleed, ending 5 sec later than it would have.
    expect(target.dots).toHaveLength(1)
    expect(target.dots[0].endsAt).toBeCloseTo(firstEnd + 5)
    // It pays 2 focus a second, not 4, until both arrows are paid back.
    run(arena, 3.1)
    expect(gained(arena, 'Barbed Arrows')).toBe(8)
    run(arena, 7)
    expect(gained(arena, 'Swift Arrow')).toBe(20)
    expect(gained(arena, 'Barbed Arrows')).toBe(20)
    expect(target.dots).toHaveLength(0)
  })

  it('makes abilities cost and deal 50% more with Overdraw, and adds echo with Double Nock', () => {
    const kit = bowKit({ overdraw: 1, 'double-nock': 2 }, ['harvest', null, null, null, null, null])
    expect(kit.slots[1]!.cost).toBe(75)
    expect(kit.character.stats.echo).toBe(10)
  })
})

describe('Doom Bolt', () => {
  const doomKit = (weapon: string, ranks: Record<string, number> = {}) =>
    noCrits(kitFor(artifact(weapon), ['doom-bolt', 'plague', null, null, null, null], { 'doom-bolt': ranks }))
  const ready = (kit: Kit, resource: number) => {
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = resource
    return arena
  }

  it('spends all you have, at least its cost, and grows with it', () => {
    const arena = ready(doomKit('tome-of-summoning'), 9)
    cast(arena, 1)
    expect(arena.resource).toBe(0)
    // 9 imps against a cost of 3: three times the damage.
    expect(damageOf(arena, 'Doom Bolt')).toMatchObject({ hits: 1, damage: 6000 })
    expect(arena.use(1)).not.toBe('ok')
  })

  it('counts what it spends past its cost for more with Hunger', () => {
    const kit = doomKit('ashwood-longbow', { hunger: 3 })
    expect(kit.slots[1]!.spendsAll).toEqual({ surplus: 60, atFull: 1 + (70 / 30) * 1.6 })
    const arena = ready(kit, 60)
    cast(arena, 1)
    // 60 focus against 30: 1 + 1 × 1.6 = 2.6 times.
    expect(damageOf(arena, 'Doom Bolt')!.damage).toBeCloseTo(5200)
  })

  it('devours your DoTs on its target with Devour', () => {
    const arena = ready(doomKit('tome-of-summoning', { hunger: 1, devour: 1 }), 3)
    cast(arena, 2)
    run(arena, 2)
    const target = arena.enemies.find((e) => e.dots.length > 0)!
    expect(target).toBeDefined()
    cast(arena, 1)
    expect(target.dots).toHaveLength(0)
    expect(damageOf(arena, 'Devour')?.hits).toBe(1)
  })

  it('blasts around its target when it spends 3 times its cost (Cataclysm)', () => {
    const ranks = { hunger: 1, devour: 1, cataclysm: 1 }
    const small = ready(doomKit('tome-of-summoning', ranks), 6)
    cast(small, 1)
    expect(damageOf(small, 'Cataclysm')).toBeUndefined()
    const big = ready(doomKit('tome-of-summoning', ranks), 9)
    cast(big, 1)
    expect(damageOf(big, 'Cataclysm')?.hits).toBeGreaterThanOrEqual(3)
  })

  it('takes time off its cooldown when you gain resource (Gathering Dark)', () => {
    const ranks = { 'gathering-dark': 2 }
    const arena = ready(doomKit('ashwood-longbow', ranks), 30)
    cast(arena, 1)
    const cd = arena.cooldowns.get('doom-bolt')!
    const due = cd.rechargeAt!
    for (let i = 0; i < 8; i++) {
      cast(arena, 0)
      run(arena, 1)
    }
    // Eight arrows, eight gains, each with a 30% chance at a second off.
    expect(cd.rechargeAt === null || cd.rechargeAt <= due - 1).toBe(true)
  })
})

describe('Doom Bolt absorbing', () => {
  it('eats your summoned minions with Soul Feast, for more damage the longer they had left', () => {
    const kit = noCrits(kitFor(artifact('ashwood-longbow'), ['raise-ghoul', 'doom-bolt', null, null, null, null], {
      'doom-bolt': { 'soul-feast': 2 },
    }))
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = 100
    cast(arena, 1)
    expect(arena.summons).toHaveLength(1)
    arena.resource = 30
    cast(arena, 2)
    expect(arena.summons).toHaveLength(0)
    // 2% of the bolt for each second the ghoul had left (about 20 sec minus the bolt's cast).
    const bolt = damageOf(arena, 'Doom Bolt')!.damage
    const feast = damageOf(arena, 'Soul Feast')!.damage
    expect(feast / bolt).toBeGreaterThan(0.3)
    expect(feast / bolt).toBeLessThan(0.4)
  })

  it('eats your zones with Collapse', () => {
    const kit = noCrits(kitFor(book, ['ashfall', 'doom-bolt', null, null, null, null], { 'doom-bolt': { collapse: 1 } }))
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = 10
    cast(arena, 1)
    run(arena, 1)
    expect(arena.zones).toHaveLength(1)
    cast(arena, 2)
    expect(arena.zones).toHaveLength(0)
    expect(damageOf(arena, 'Collapse')?.hits).toBe(1)
  })
})

describe('Volley', () => {
  it('splashes ranged single-target hits onto every enemy near the target, for 30%', () => {
    const kit = noCrits(kitFor(artifact('ashwood-longbow'), ['volley', null, null, null, null, null]))
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = 20
    cast(arena, 0)
    expect(damageOf(arena, 'Volley')).toBeUndefined()
    run(arena, 1)
    cast(arena, 1)
    expect(arena.stats().splash).toBe(30)
    cast(arena, 0)
    const splash = damageOf(arena, 'Volley')!
    expect(splash.hits).toBeGreaterThanOrEqual(3)
    expect(splash.damage / splash.hits).toBeCloseTo(330 * 0.3)
  })

  it("doesn't splash melee strikes", () => {
    const kit = noCrits(kitFor(daggers, ['volley', null, null, null, null, null]))
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 16 }
    arena.resource = 2
    cast(arena, 1)
    cast(arena, 0)
    expect(damageOf(arena, 'Quick Strike')?.hits).toBe(1)
    expect(damageOf(arena, 'Volley')).toBeUndefined()
  })
})

describe('Frenzy', () => {
  it('gives 15% haste, and spending on other abilities keeps it up (Feeding Frenzy)', () => {
    const kit = kitFor(book, ['frenzy', 'festering-rot', null, null, null, null], { frenzy: { bloodrush: 1, 'feeding-frenzy': 2 } })
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = 6
    cast(arena, 1)
    expect(arena.stats().haste).toBe(18)
    run(arena, 1)
    const until = arena.buffs.find((b) => b.id === 'frenzy')!.endsAt
    cast(arena, 2)
    expect(arena.buffs.find((b) => b.id === 'frenzy')!.endsAt).toBeCloseTo(until + 1)
  })

  it('grows with combo steps on the daggers', () => {
    const arena = new Arena(kitFor(daggers, ['frenzy', null, null, null, null, null]), DUMMIES, { seed: 1 })
    arena.resource = 4
    cast(arena, 1)
    expect(arena.resource).toBe(0)
    expect(arena.stats().haste).toBe(30)
  })
})

describe('Carrion Curse', () => {
  it("lets each minion hit take a stack for extra damage, until they're gone", () => {
    const kit = noCrits(kitFor(book, ['carrion-curse', null, null, null, null, null]))
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = 10
    cast(arena, 1)
    const target = arena.enemies.find((e) => e.curses.length > 0)!
    expect(target.curses[0].stacks).toBe(8)
    run(arena, 6)
    const curse = damageOf(arena, 'Carrion Curse')!
    expect(curse.hits).toBe(8)
    expect(curse.damage).toBeCloseTo(8 * 90)
    expect(target.curses).toHaveLength(0)
  })
})

describe('Festering Wound', () => {
  it('hits hard and stacks a DoT up to 10, refreshing every stack each time', () => {
    const kit = noCrits(kitFor(artifact('ashwood-longbow'), ['festering-wound', null, null, null, null, null]))
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    for (let i = 0; i < 12; i++) {
      arena.resource = 100
      cast(arena, 1)
      run(arena, 1)
    }
    expect(damageOf(arena, 'Festering Wound')).toMatchObject({ hits: 12, damage: 12 * 350 })
    const wound = arena.enemies.flatMap((e) => e.dots).find((d) => d.name === 'Wound Rot')!
    expect(wound.count).toBe(10)
    // Ten stacks tick for 10 × 35 each second, and they all run out together 6 sec after the last cast.
    const before = damageOf(arena, 'Wound Rot')!.damage
    run(arena, 1)
    expect(damageOf(arena, 'Wound Rot')!.damage - before).toBeCloseTo(350)
    run(arena, 6)
    expect(arena.enemies.flatMap((e) => e.dots)).toHaveLength(0)
  })
})

describe('Raise Ghoul', () => {
  it('raises ghouls that fight on their own, up to 3, and fall when their time runs out', () => {
    const kit = noCrits(kitFor(artifact('ashwood-longbow'), ['raise-ghoul', null, null, null, null, null]))
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = 100
    for (let i = 0; i < 4; i++) cast(arena, 1)
    // The 4th replaced the oldest. Raise Ghoul costs 2, so 20 focus each on the bow.
    expect(arena.summons).toHaveLength(3)
    expect(arena.resource).toBe(20)
    run(arena, 6)
    expect(damageOf(arena, 'Ghoul')?.damage).toBeGreaterThan(0)
    expect(damageOf(arena, 'Ghoul')!.damage % 90).toBe(0)
    run(arena, 20)
    expect(arena.summons).toHaveLength(0)
  })

  it('works its talents: more ghouls, Grave Rot, and Corpse Explosion when one falls', () => {
    const kit = noCrits(
      kitFor(book, ['raise-ghoul', null, null, null, null, null], {
        'raise-ghoul': { 'grave-pact': 1, horde: 1, 'rotting-claws': 1, 'corpse-explosion': 1 },
      }),
    )
    const ghoul = kit.slots[1]!.effects[0]
    expect(ghoul).toMatchObject({ type: 'summon', max: 4, duration: 24.5 })
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = 10
    cast(arena, 1)
    run(arena, 3)
    expect(damageOf(arena, 'Grave Rot')?.hits).toBeGreaterThan(0)
    run(arena, 22)
    expect(damageOf(arena, 'Corpse Explosion')?.hits).toBeGreaterThan(0)
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
