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
    // Festering Rot costs 3.
    arena.resource = 3
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
    arena.resource = 4
    run(arena, 0.1)
    // Four imps, each with a second more left than the one before; Festering Rot costs 3.
    arena.imps.forEach((imp, i) => (imp.endsAt = arena.time + 10 + i))
    const newest = arena.imps[3]
    cast(arena, 1)
    expect(arena.imps).toEqual([newest])
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
    arena.resource = 9
    cast(arena, 1)
    run(arena, 5)
    cast(arena, 1)
    run(arena, 1)
    cast(arena, 1)
    expect(arena.boss.dots[0].stacks).toHaveLength(3)
    // 24 sec each: the first stack rolls off on its own; the other two keep going.
    run(arena, 19)
    expect(arena.boss.dots[0].stacks).toHaveLength(2)
  })

  it('gives every enemy inside Miasma a stack of Pox every second for 3 sec', () => {
    const arena = new Arena(kitFor(book, ['miasma', null, null, null, null, null]), DUMMIES, { seed: 1 })
    expect(arena.kit.slots[1]).toMatchObject({ cost: 5, cooldown: 30, castTime: 0 })
    arena.resource = 5
    cast(arena, 1)
    run(arena, 4)
    // The big dummy and the small ones around it are within 8 yd: three stacks each, 18 sec apiece.
    const poxed = arena.enemies.map((e) => e.dots.find((d) => d.name === 'Pox')).filter((d) => d !== undefined)
    expect(poxed.length).toBeGreaterThanOrEqual(3)
    for (const d of poxed) expect(d.stacks).toHaveLength(3)
    expect(arena.zones).toHaveLength(0)
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
    expect(arena.resource).toBe(3)
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

describe('Blood Frenzy', () => {
  const frenzyKit = (ranks: Record<string, number> = {}) =>
    kitFor(book, [null, null, null, 'blood-frenzy', null, null], { 'blood-frenzy': ranks })
  const buffOf = (kit: Kit) => kitBuff(kit.slots[4]!)
  const kitBuff = (a: NonNullable<Kit['slots'][number]>) => a.effects[0]

  it('gives 20% haste for 30 sec, instantly, for free, every 3 min', () => {
    const frenzy = frenzyKit().slots[4]!
    expect(frenzy).toMatchObject({ cost: 0, castTime: 0, cooldown: 180, charges: 1 })
    expect(buffOf(frenzyKit())).toMatchObject({ duration: 30, buff: { stats: { haste: 20 } } })
    const arena = new Arena(frenzyKit(), DUMMIES, { seed: 1 })
    cast(arena, 4)
    expect(arena.stats().haste).toBe(20)
  })

  it('grows, lasts and comes back sooner with its talents', () => {
    const kit = frenzyKit({ bloodlust: 2, 'lingering-rage': 2, 'quickened-pulse': 2 })
    expect(buffOf(kit)).toMatchObject({ duration: 40, buff: { stats: { haste: 30 } } })
    expect(kit.slots[4]!.cooldown).toBe(120)
  })

  it('holds 2 charges at half the duration with Twin Frenzy', () => {
    const kit = frenzyKit({ 'twin-frenzy': 1 })
    expect(kit.slots[4]!.charges).toBe(2)
    expect(buffOf(kit).duration).toBe(15)
  })

  it('lasts longer with every ability you use, with Endless Frenzy', () => {
    const arena = new Arena(frenzyKit({ 'endless-frenzy': 2 }), DUMMIES, { seed: 1 })
    cast(arena, 4)
    // Blood Frenzy is an ability too: its own cast already added 0.4.
    const end = arena.buffs.find((b) => b.id === 'blood-frenzy')!.endsAt
    expect(end - arena.time).toBeCloseTo(30.4, 1)
    run(arena, 1)
    cast(arena, 0)
    expect(arena.buffs.find((b) => b.id === 'blood-frenzy')!.endsAt).toBeCloseTo(end + 0.4)
  })
})

describe("Miasma's tree", () => {
  const miasmaKit = (ranks: Record<string, number>) => {
    const kit = noCrits(kitFor(book, ['miasma', null, null, null, null, null], { miasma: ranks }))
    return { ...kit, character: { ...kit.character, stats: { ...kit.character.stats, crit: 0 } } }
  }
  const ready = (kit: Kit) => {
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = 15
    return arena
  }
  const poxOn = (arena: Arena) => arena.boss.dots.find((d) => d.name === 'Pox')

  it('gives Pox that deals 15 a second for 18 sec, longer with Lingering Pox, harder with Virulent Pox', () => {
    expect(miasmaKit({}).slots[1]!.effects[0].inflicts!).toMatchObject({ amount: 15, duration: 18, stacks: 1 })
    const p = miasmaKit({ 'lingering-pox': 3, 'virulent-pox': 3 }).slots[1]!.effects[0].inflicts!
    expect(p).toMatchObject({ stacks: 1, duration: 27 })
    expect(p.amount).toBeCloseTo(15 * 1.3)
  })

  it('deals more with Concentrated Pox while Pox is on only one enemy', () => {
    /** Pox damage after a cloud on the boss, with the other dummies gone or not. */
    const poxDamage = (ranks: Record<string, number>, alone: boolean) => {
      const arena = ready(miasmaKit(ranks))
      if (alone) for (const e of arena.enemies) if (e !== arena.boss) e.alive = false
      cast(arena, 1)
      run(arena, 4)
      return damageOf(arena, 'Pox')!.damage
    }
    expect(poxDamage({ 'concentrated-pox': 2 }, true)).toBeCloseTo(poxDamage({}, true) * 1.3)
    // On several enemies, no bonus.
    expect(poxDamage({ 'concentrated-pox': 2 }, false)).toBeCloseTo(poxDamage({}, false))
  })

  it('widens and follows with Clinging Cloud, and lasts longer with Thickening Fog', () => {
    const zone = miasmaKit({ 'clinging-cloud': 2, 'thickening-fog': 1 }).slots[1]!.effects[0]
    expect(zone).toMatchObject({ radius: 12, follow: 1, duration: 4 })
  })

  it('bursts when placed with Noxious Burst, harder for each Pox stack with Choking Burst', () => {
    const arena = ready(miasmaKit({ 'noxious-burst': 2, 'choking-burst': 2 }))
    cast(arena, 1)
    expect(damageOf(arena, 'Noxious Burst')!.damage / damageOf(arena, 'Noxious Burst')!.hits).toBeCloseTo(400)
    run(arena, 4)
    // Three stacks on the boss now: the next burst deals 8% more for each.
    arena.cooldowns.get('miasma')!.charges = 1
    const before = damageOf(arena, 'Noxious Burst')!.damage
    const hits = damageOf(arena, 'Noxious Burst')!.hits
    cast(arena, 1)
    const row = damageOf(arena, 'Noxious Burst')!
    expect(row.hits).toBeGreaterThan(hits)
    expect(row.damage - before).toBeGreaterThan(400 * 1.24 * (row.hits - hits) - 1)
  })

  it('gives Pox twice as often with Quickening Pulse', () => {
    const arena = ready(miasmaKit({ 'quickening-pulse': 1 }))
    cast(arena, 1)
    run(arena, 4)
    expect(poxOn(arena)!.stacks).toHaveLength(6)
  })

  it('emanates from you every 10 sec instead of being cast with Emanation', () => {
    const arena = ready(miasmaKit({ emanation: 1 }))
    arena.player.pos = { x: 30, y: 17 }
    arena.press(1)
    arena.step(DT)
    expect(arena.notice?.text).toBe('Miasma goes off on its own')
    run(arena, 10.2)
    expect(arena.zones).toHaveLength(0)
    expect(poxOn(arena)!.stacks).toHaveLength(1)
    expect(arena.resource).toBe(15)
  })

  it('takes 0.3/0.6 sec of cooldown off on DoT ticks with Restless Fog, on every tick that procs', () => {
    const certain = (k: Kit): Kit => ({ ...k, procs: k.procs.map((p) => ({ ...p, proc: { ...p.proc, chance: 100 } })) })
    expect(miasmaKit({ 'restless-fog': 1 }).procs[0].proc.chance).toBe(6)
    const after = (k: Kit) => {
      const arena = ready(k)
      cast(arena, 1)
      run(arena, 2.5)
      return { recharge: arena.cooldowns.get('miasma')!.rechargeAt!, ticks: damageOf(arena, 'Pox')!.hits }
    }
    const plain = after(miasmaKit({}))
    // Pox ticks on several enemies at 1 and 2 sec, and every tick takes its share off: no internal cooldown.
    for (const [rank, off] of [[1, 0.3], [2, 0.6]]) {
      const fog = after(certain(miasmaKit({ 'restless-fog': rank })))
      expect(fog.ticks).toBeGreaterThan(2)
      expect(plain.recharge - fog.recharge).toBeCloseTo(off * fog.ticks)
    }
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
    expect(splash.damage / splash.hits).toBeCloseTo(550 * 0.2)

    const lone = plagued(harvestKit({ chaff: 2, 'lone-reaper': 2 }))
    cast(lone, 2)
    const hit = 550 * 1.4
    expect(damageOf(lone, 'Harvest')!.damage).toBeCloseTo(hit)
    expect(damageOf(lone, 'Harvest splash')!.damage / 4).toBeCloseTo(hit * 0.2 * 2)
  })

  it('adds Potency to its damage with Ripening', () => {
    const kit = harvestKit({ ripening: 1 })
    expect(kit.resolve('harvest', [], { ...kit.character.stats, potency: 25 })!.effects[0].amount).toBeCloseTo(550 * 1.25)
  })

  it('grows with every DoT tick with Reaping, and uses the stacks up', () => {
    const arena = plagued(harvestKit({ reaping: 2 }))
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

  it('makes Harvest free no more than once every 20 sec with Windfall', () => {
    const arena = plagued(certain(harvestKit({ windfall: 2 })))
    const proced = arena.time
    cast(arena, 2)
    // Pox keeps ticking, but the next free Harvest waits for the 20 sec.
    run(arena, 5)
    expect(arena.current(2)!.cost).toBe(5)
    run(arena, proced + 20 - arena.time + 0.1)
    arena.resource = 15
    cast(arena, 1)
    run(arena, 1.2)
    expect(arena.current(2)!.cost).toBe(0)
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
    expect(kit.slots[3]!.cost).toBe(30)
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
    // 2% of the bolt for each second the ghoul had left (about 24 sec minus the bolt's cast).
    const bolt = damageOf(arena, 'Doom Bolt')!.damage
    const feast = damageOf(arena, 'Soul Feast')!.damage
    expect(feast / bolt).toBeGreaterThan(0.38)
    expect(feast / bolt).toBeLessThan(0.48)
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
  it("costs 4 imps, curses for 20 stacks and 30 sec, and lets each minion hit take one for 90 damage, until they're gone", () => {
    const kit = noCrits(kitFor(book, ['carrion-curse', null, null, null, null, null]))
    expect(kit.slots[1]).toMatchObject({ cost: 4, castTime: 0 })
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = 10
    cast(arena, 1)
    expect(arena.resource).toBe(6)
    const target = arena.enemies.find((e) => e.curses.length > 0)!
    expect(target.curses[0].stacks).toBe(20)
    expect(target.curses[0].endsAt - arena.time).toBeCloseTo(30, 0)
    run(arena, 10)
    const curse = damageOf(arena, 'Carrion Curse')!
    expect(curse.hits).toBe(20)
    expect(curse.damage).toBeCloseTo(20 * 90)
    expect(target.curses).toHaveLength(0)
  })
})

describe("Carrion Curse's tree", () => {
  const curseKit = (ranks: Record<string, number>) => {
    const kit = noCrits(kitFor(book, ['carrion-curse', null, null, null, null, null], { 'carrion-curse': ranks }))
    return { ...kit, character: { ...kit.character, stats: { ...kit.character.stats, crit: 0 } } }
  }
  /** Cursed, with 6 imps left to take the stacks. */
  const cursed = (kit: Kit) => {
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = 10
    cast(arena, 1)
    return { arena, target: arena.enemies.find((e) => e.curses.length > 0)! }
  }

  it('puts more stacks on with Deep Curse, and makes each deal more with Feast', () => {
    const e = curseKit({ 'deep-curse': 2, feast: 3 }).slots[1]!.effects[0]
    expect(e.stacks).toBe(26)
    expect(e.amount).toBeCloseTo(90 * 1.3)
  })

  it('puts a stack back for your direct damage with Gorging Hex, never past the start', () => {
    // The daggers have no minions: only Quick Strike, direct damage, touches the stacks.
    const kit = noCrits(kitFor(daggers, ['carrion-curse', null, null, null, null, null], { 'carrion-curse': { 'gorging-hex': 1 } }))
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    // In reach of the big dummy: Quick Strike is melee.
    arena.player.pos = { x: 30, y: 16 }
    arena.resource = 5
    cast(arena, 1)
    const target = arena.enemies.find((e) => e.curses.length > 0)!
    run(arena, 1.6)
    target.curses[0].stacks = 10
    cast(arena, 0)
    expect(arena.meter.casts.get('Quick Strike')).toBe(1)
    expect(target.curses[0].stacks).toBe(11)
    target.curses[0].stacks = 20
    run(arena, 1.6)
    cast(arena, 0)
    expect(target.curses[0].stacks).toBe(20)

    // Minion hits are minion damage, not direct damage: the book's imps take stacks and put none back.
    const book = cursed(curseKit({ 'gorging-hex': 1 }))
    run(book.arena, 2)
    const taken = damageOf(book.arena, 'Carrion Curse')!.hits
    expect(taken).toBeGreaterThan(0)
    expect(book.target.curses[0].stacks).toBe(20 - taken)
  })

  it('splashes each stack with Carrion Spray, without the splash counting as stacks taken', () => {
    const { arena } = cursed(curseKit({ 'carrion-spray': 2, 'swarming-brood': 2 }))
    // The imp that will last longest: Swarming Brood adds 0.1 sec to it for every stack taken.
    const imp = arena.imps.reduce((a, b) => (b.endsAt > a.endsAt ? b : a))
    const before = imp.endsAt
    run(arena, 3)
    const taken = damageOf(arena, 'Carrion Curse')!.hits
    const splash = damageOf(arena, 'Carrion Curse splash')!
    expect(splash.hits).toBeGreaterThan(taken)
    expect(splash.damage / splash.hits).toBeCloseTo(90 * 0.3)
    expect(imp.endsAt - before).toBeCloseTo(0.1 * taken)
  })

  it('gives minion power for every stack taken with Carrion Feast, up to 20 stacks', () => {
    const { arena } = cursed(curseKit({ bloodied: 2, 'frenzied-feeding': 1, 'carrion-feast': 2 }))
    const base = arena.stats().minionPower
    run(arena, 1.6)
    const taken = damageOf(arena, 'Carrion Curse')!.hits
    expect(taken).toBeGreaterThan(0)
    expect(arena.stats().minionPower - base).toBeCloseTo(0.4 * Math.min(20, taken))
  })

  it('lets a stack burst and stay with Undying Hex', () => {
    expect(curseKit({ 'undying-hex': 2 }).slots[1]!.effects[0].keepChance).toBe(20)
    const base = curseKit({})
    const always: Kit = {
      ...base,
      slots: base.slots.map((a) => a && (a.treeId === 'carrion-curse' ? { ...a, effects: a.effects.map((e) => ({ ...e, keepChance: 100 })) } : a)),
    }
    const { arena, target } = cursed(always)
    run(arena, 6)
    expect(damageOf(arena, 'Carrion Curse')!.hits).toBeGreaterThan(20)
    expect(target.curses[0].stacks).toBe(20)
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
    expect(kit.slots[1]).toMatchObject({ cost: 30, castTime: 2 })
    expect(kit.slots[1]!.effects[0]).toMatchObject({ type: 'summon', amount: 150, interval: 2, duration: 24, max: 3 })
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    // Raise Ghoul costs 3, so 30 focus each on the bow.
    arena.resource = 100
    for (let i = 0; i < 3; i++) cast(arena, 1)
    expect(arena.resource).toBe(10)
    arena.resource = 30
    cast(arena, 1)
    // The 4th replaced the oldest.
    expect(arena.summons).toHaveLength(3)
    run(arena, 6)
    expect(damageOf(arena, 'Ghoul')?.damage).toBeGreaterThan(0)
    expect(damageOf(arena, 'Ghoul')!.damage % 150).toBe(0)
    run(arena, 24)
    expect(arena.summons).toHaveLength(0)
  })

  it('lasts longer, raises more and casts faster with its talents', () => {
    const kit = kitFor(book, ['raise-ghoul', null, null, null, null, null], {
      'raise-ghoul': { 'grave-patience': 2, horde: 2, 'quick-rites': 2 },
    })
    expect(kit.slots[1]!.castTime).toBeCloseTo(1.5)
    expect(kit.slots[1]!.effects[0]).toMatchObject({ type: 'summon', max: 5, duration: 32 })
  })

  it('attacks sooner with Frenzied Claws, and harder each attack with Mounting Fury, up to 10', () => {
    const kit = noCrits(
      kitFor(book, ['raise-ghoul', null, null, null, null, null], {
        'raise-ghoul': { 'unholy-might': 3, 'frenzied-claws': 2, 'mounting-fury': 2 },
      }),
    )
    const ghoul = kit.slots[1]!.effects[0]
    expect(ghoul.interval).toBeCloseTo(1.5)
    expect(ghoul.amount).toBeCloseTo(150 * 1.18)
    expect(ghoul.fury).toBe(4)
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = 3
    cast(arena, 1)
    run(arena, 20)
    const row = damageOf(arena, 'Ghoul')!
    expect(row.hits).toBeGreaterThan(11)
    let expected = 0
    for (let k = 0; k < row.hits; k++) expected += ghoul.amount * (1 + (4 * Math.min(k, 10)) / 100)
    expect(row.damage).toBeCloseTo(expected, 0)
  })

  it('keeps your ghouls up longer when you crit, with Undying Hunger', () => {
    const kit = kitFor(book, ['raise-ghoul', null, null, null, null, null], {
      'raise-ghoul': { 'quick-rites': 2, 'undying-hunger': 2 },
    })
    // Every ghoul attack crits.
    const slot = kit.slots[1]!
    const crits: Kit = {
      ...kit,
      slots: kit.slots.map((a) => (a === slot ? { ...a, effects: a.effects.map((e) => ({ ...e, critChance: 100 })) } : a)),
    }
    const arena = new Arena(crits, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = 3
    cast(arena, 1)
    const raised = arena.time
    // Attacks at 0.5, 2.5 and 4.5 sec: three crits, half a second each.
    run(arena, 5)
    expect(arena.summons[0].endsAt - raised).toBeCloseTo(24 + 1.5, 1)
  })

  it('explodes when a ghoul falls, harder for the time it had left with Volatile Remains', () => {
    const kit = noCrits(
      kitFor(book, ['raise-ghoul', null, null, null, null, null], {
        'raise-ghoul': { 'grave-patience': 2, horde: 2, 'corpse-explosion': 2, 'volatile-remains': 1 },
      }),
    )
    const ghoul = kit.slots[1]!.effects[0]
    expect(ghoul).toMatchObject({ max: 5, explode: 300, explodeLeft: 60 })
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = 15
    for (let i = 0; i < 5; i++) cast(arena, 1)
    expect(damageOf(arena, 'Corpse Explosion')).toBeUndefined()
    // A 6th replaces the oldest, which explodes with the seconds it had left shared out.
    const oldest = arena.summons[0]
    arena.resource = 3
    arena.press(1)
    arena.step(DT)
    while (arena.summons.includes(oldest)) arena.step(DT)
    const left = oldest.endsAt - arena.time
    const blast = damageOf(arena, 'Corpse Explosion')!
    expect(blast.hits).toBeGreaterThan(0)
    expect(blast.damage).toBeCloseTo(300 * blast.hits + 60 * left, 0)
    // The rest run out with no time left: just the 300 each.
    const before = blast.damage
    const hitsBefore = blast.hits
    run(arena, 40)
    expect(arena.summons).toHaveLength(0)
    const after = damageOf(arena, 'Corpse Explosion')!
    expect(after.damage - before).toBeCloseTo(300 * (after.hits - hitsBefore), 0)
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

describe('Overlord', () => {
  const lordKit = (ranks: Record<string, number> = {}, extra: (string | null)[] = []) => {
    const slots = ['overlord', null, null, null, null, null].map((id, i) => extra[i] ?? id)
    const kit = noCrits(kitFor(book, slots, { overlord: ranks, 'blood-frenzy': {} }))
    return { ...kit, character: { ...kit.character, stats: { ...kit.character.stats, crit: 0 } } }
  }
  /** The Overlord up, with 6 imps fighting beside it. */
  const summoned = (kit: Kit) => {
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = 10
    cast(arena, 1)
    return arena
  }
  const lordsOf = (arena: Arena) => arena.summons.filter((s) => s.name === 'Overlord')
  const imp = (arena: Arena) => damageOf(arena, 'Imp') ?? damageOf(arena, 'Minion')!

  it('costs 4 imps, lasts 30 sec on a 30 sec cooldown, and only one is up at a time', () => {
    const kit = lordKit()
    expect(kit.slots[1]).toMatchObject({ cost: 4, cooldown: 30, castTime: 0 })
    const arena = summoned(kit)
    expect(arena.resource).toBe(6)
    expect(lordsOf(arena)).toHaveLength(1)
    expect(lordsOf(arena)[0].endsAt - arena.time).toBeCloseTo(30, 0)
    arena.cooldowns.get('overlord')!.charges = 1
    arena.resource = 10
    run(arena, 1)
    cast(arena, 1)
    expect(lordsOf(arena)).toHaveLength(1)
  })

  it('volleys its target and every enemy near it, and makes your imps hit 20% harder', () => {
    const bare = new Arena(lordKit(), DUMMIES, { seed: 1 })
    bare.player.pos = { x: 30, y: 30 }
    bare.resource = 6
    run(bare, 6)
    const arena = summoned(lordKit())
    run(arena, 6)
    const volley = damageOf(arena, 'Overlord')!
    // Three volleys or so, each on the big dummy and the small ones around it.
    expect(volley.hits).toBeGreaterThan(5)
    expect(volley.damage / volley.hits).toBeCloseTo(150)
    expect(imp(arena).damage / imp(arena).hits).toBeCloseTo((imp(bare).damage / imp(bare).hits) * 1.2)
  })

  it('makes your other minions attack faster with Commanding Presence, and last longer with Dark Sustenance', () => {
    // 12 sec: 8 attacks an imp at 1.5 sec each, 8 or 9 when 10% faster (each imp starts at its own moment).
    const plain = summoned(lordKit())
    run(plain, 12)
    const quick = summoned(lordKit({ 'commanding-presence': 2 }))
    run(quick, 12)
    expect(imp(plain).hits).toBe(6 * 8)
    expect(imp(quick).hits).toBeGreaterThan(imp(plain).hits)

    const fed = summoned(lordKit({ 'dark-sustenance': 2 }))
    const longest = fed.imps.reduce((a, b) => (b.endsAt > a.endsAt ? b : a))
    const before = longest.endsAt
    // Two volleys in 4.2 sec (half a second after it arrives, then every 2): 0.1 sec each.
    run(fed, 4.2)
    expect(longest.endsAt - before).toBeCloseTo(0.2)
  })

  it('deals more for each minion you command with Lord of the Legion', () => {
    const arena = summoned(lordKit({ 'overwhelming-power': 3, 'lord-of-the-legion': 2 }))
    run(arena, 1)
    const volley = damageOf(arena, 'Overlord')!
    // 30% more, then 2% for each of the 6 imps.
    expect(volley.damage / volley.hits).toBeCloseTo(150 * 1.3 * 1.12)
  })

  it('lasts longer for every minion that falls with Undying Master, and calls a meteor at 5 with Impending Doom', () => {
    const arena = summoned(lordKit({ 'undying-master': 2, 'impending-doom': 2 }))
    const lord = lordsOf(arena)[0]
    run(arena, 12)
    const left = lord.endsAt - arena.time
    // 5 imps go: 2 sec each.
    arena.resource = 1
    run(arena, 0.1)
    expect(lord.endsAt - arena.time).toBeCloseTo(left - 0.1 + 10)
    // The fifth called a meteor down.
    const meteor = damageOf(arena, 'Meteor')!
    expect(meteor.hits).toBeGreaterThan(0)
    expect(meteor.damage / meteor.hits).toBeCloseTo(1000)
    // No cap: 10 more go, 20 sec more, past its full 30.
    arena.resource = 10
    run(arena, 0.1)
    const now = lord.endsAt - arena.time
    arena.resource = 0
    run(arena, 0.1)
    expect(lord.endsAt - arena.time).toBeCloseTo(now - 0.1 + 20)
    expect(lord.endsAt - arena.time).toBeGreaterThan(30)
  })

  it('holds 2 at once with Twin Overlords', () => {
    const arena = summoned(lordKit({ 'twin-overlords': 1 }))
    arena.cooldowns.get('overlord')!.charges = 1
    arena.resource = 10
    run(arena, 1)
    cast(arena, 1)
    expect(lordsOf(arena)).toHaveLength(2)
  })

  it('frenzies your minions when it leaves with Final Command, a new one replacing it included', () => {
    const arena = summoned(lordKit({ 'final-command': 1 }))
    arena.cooldowns.get('overlord')!.charges = 1
    arena.resource = 10
    run(arena, 1)
    cast(arena, 1)
    expect(arena.buffs.find((b) => b.id === 'final-command')).toBeDefined()
  })

  it("speeds up with your ultimate's haste with Dark Patron, even when it came first", () => {
    const volleys = (ranks: Record<string, number>) => {
      const arena = summoned(lordKit(ranks, [null, null, null, null, 'blood-frenzy']))
      // Past the global cooldown, then Blood Frenzy: 20% haste for 30 sec.
      run(arena, 1.1)
      cast(arena, 5)
      expect(arena.buffs.some((b) => b.ultimate)).toBe(true)
      run(arena, 12)
      return damageOf(arena, 'Overlord')!.hits
    }
    expect(volleys({ 'dark-patron': 1 })).toBeGreaterThan(volleys({}))
  })
})

describe("Festering Rot's tree", () => {
  const rotKit = (ranks: Record<string, number> = {}) => {
    const kit = noCrits(kitFor(book, ['festering-rot', 'harvest', null, null, null, null], { 'festering-rot': ranks }))
    return { ...kit, character: { ...kit.character, stats: { ...kit.character.stats, crit: 0 } } }
  }
  const rotting = (kit: Kit) => {
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 30 }
    arena.resource = 15
    cast(arena, 1)
    return arena
  }
  const rotOn = (arena: Arena) => arena.boss.dots.find((d) => d.name === 'Festering Rot')!

  it('costs 3 imps and adds a stack of 20 a second for 24 sec', () => {
    const a = rotKit().slots[1]!
    expect(a).toMatchObject({ cost: 3, castTime: 0 })
    expect(a.effects[0]).toMatchObject({ amount: 20, duration: 24, interval: 1, stacks: 1 })
  })

  it('costs 2 more for 2 stacks at a time with Swollen Rot, and ticks every 0.8 sec with Quickening Rot', () => {
    const a = rotKit({ 'swollen-rot': 1, 'quickening-rot': 2 }).slots[1]!
    expect(a.cost).toBeCloseTo(5)
    expect(a.effects[0].stacks).toBe(2)
    expect(a.effects[0].interval).toBeCloseTo(0.8)
  })

  it('lasts longer for your direct damage with Feeding Rot', () => {
    const arena = rotting(rotKit({ 'lasting-rot': 1, 'feeding-rot': 2 }))
    run(arena, 1.1)
    const end = rotOn(arena).stacks[0]
    cast(arena, 2)
    expect(rotOn(arena).stacks[0] - end).toBeCloseTo(0.6)
  })

  it('makes the target take more of your damage for each stack with Rotting Flesh', () => {
    const per = (ranks: Record<string, number>) => {
      const arena = rotting(rotKit(ranks))
      run(arena, 3)
      const imps = damageOf(arena, 'Imp') ?? damageOf(arena, 'Minion')!
      return imps.damage / imps.hits
    }
    // One stack: 1% more.
    expect(per({ 'putrid-rot': 2, 'rotting-flesh': 2 })).toBeCloseTo(per({}) * 1.01)
  })

  it('deals all of it at once when a stack runs out with Bursting Rot, around the target too with Rot Bomb', () => {
    const arena = rotting(rotKit({ 'putrid-rot': 2, 'bursting-rot': 1, 'rot-bomb': 2 }))
    run(arena, 10)
    expect(damageOf(arena, 'Festering Rot')).toBeUndefined()
    run(arena, 14.1)
    const burst = damageOf(arena, 'Festering Rot burst')!
    // 20 × 1.12 a second for 24 sec, on the boss and every small dummy within 8 yd of it.
    expect(burst.hits).toBeGreaterThan(1)
    expect(burst.damage / burst.hits).toBeCloseTo(20 * 1.12 * 24)
    expect(arena.boss.dots.some((d) => d.name === 'Festering Rot')).toBe(false)
  })

  it('takes time off every stack for your direct damage with Ripe Burst', () => {
    const arena = rotting(rotKit({ 'bursting-rot': 1, 'ripe-burst': 2 }))
    run(arena, 1.1)
    const end = rotOn(arena).stacks[0]
    cast(arena, 2)
    expect(end - rotOn(arena).stacks[0]).toBeCloseTo(1)
  })
})
