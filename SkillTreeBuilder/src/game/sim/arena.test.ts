import { describe, expect, it } from 'vitest'
import type { Kit } from '../resolve.ts'
import { healerKit } from '../testkit.ts'
import { Arena } from './arena.ts'
import { SCENARIOS, type Scenario } from './scenarios.ts'

// A quiet room: the practice party at half health, nothing hitting anyone.
// Ids: you 1 (30, 27), Tank 2 (30, 15.5), Blade 3 (25.5, 15), Archer 4 (37, 23).
const scenario = (id: string) => SCENARIOS.find((s) => s.id === id)!
const QUIET: Scenario = { ...scenario('practice'), events: [], startHealth: 0.5 }

const DT = 0.05
const run = (arena: Arena, seconds: number) => {
  for (let t = 0; t < seconds - 1e-9; t += DT) arena.step(DT)
}
const cast = (arena: Arena, slot: number) => {
  arena.press(slot)
  arena.step(DT)
}
const ally = (arena: Arena, name: string) => arena.allies.find((a) => a.name === name)!
const hits = (arena: Arena, name: string) => arena.meter.rows.get(name)?.hits ?? 0

function arenaWith(slots: (string | null)[], ranks = {}, scenario = QUIET): Arena {
  return new Arena(healerKit(slots, ranks), scenario, { seed: 7 })
}

describe('mana', () => {
  it('drains as you cast and comes back slowly', () => {
    const arena = arenaWith(['mend', null, null, null, null])
    cast(arena, 1)
    expect(arena.resource).toBeCloseTo(900, 0)
    run(arena, 2)
    expect(arena.resource).toBeCloseTo(916, 0)
  })

  it('is restored by Radiant Bolt', () => {
    const arena = arenaWith([null, null, null, null, null])
    arena.resource = 500
    cast(arena, 0)
    expect(arena.resource).toBeCloseTo(516.4, 1)
    expect(arena.meter.resourceGained.get('Radiant Bolt')).toBe(16)
  })

  it("stops a cast you can't afford", () => {
    const arena = arenaWith(['mend', null, null, null, null])
    arena.resource = 10
    cast(arena, 1)
    expect(arena.cast).toBeNull()
    expect(arena.notice?.text).toBe('Not enough mana')
  })
})

describe('heals', () => {
  it('land on the lowest-health ally when the cast finishes', () => {
    const arena = arenaWith(['mend', null, null, null, null])
    ally(arena, 'Tank').hp = 3000
    cast(arena, 1)
    expect(arena.cast?.ability.name).toBe('Mend')
    run(arena, 1.5)
    expect(ally(arena, 'Tank').hp).toBeGreaterThanOrEqual(4800)
  })

  it('tick a HoT once per interval for its whole duration', () => {
    const arena = arenaWith(['renew', null, null, null, null])
    cast(arena, 1)
    run(arena, 13)
    expect(hits(arena, 'Renew')).toBe(6)
  })

  it('jump a chain between allies close to each other', () => {
    const arena = arenaWith(['chain-heal', null, null, null, null])
    cast(arena, 1)
    run(arena, 1.5)
    // You (lowest by id), then the tank 11.5 yd away, then Blade; the archer is 14 yd from Blade.
    expect(hits(arena, 'Chain Heal')).toBe(3)
    expect(ally(arena, 'Archer').hp).toBe(8000)
  })

  it('heal only allies standing in a zone', () => {
    const arena = arenaWith(['healing-rain', null, null, null, null])
    cast(arena, 1)
    run(arena, 10.5)
    // Placed on you; the archer is 8.06 yd away, just outside its 8 yd.
    expect(hits(arena, 'Healing Rain')).toBe(10)
    expect(ally(arena, 'Archer').hp).toBe(8000)
  })

  it('make Bloom heal only allies your HoTs or zones touch, paying per ally', () => {
    const arena = arenaWith(['renew', 'bloom', null, null, null])
    cast(arena, 2)
    expect(arena.notice?.text).toBe('Nobody has your HoTs or stands in your zones')
    cast(arena, 1)
    run(arena, 1)
    const before = arena.resource
    cast(arena, 2)
    expect(hits(arena, 'Bloom')).toBe(1)
    // 60 for the cast and 30 for the one ally, less the step's regeneration.
    expect(before - arena.resource).toBeCloseTo(60 + 30 - 0.4, 1)
  })

  it("make Conduit heal when Radiant Bolt hits, as a passive", () => {
    const arena = arenaWith(['conduit', null, null, null, null])
    expect(arena.use(1)).toBe('Conduit is passive')
    cast(arena, 0)
    expect(hits(arena, 'Conduit')).toBe(1)
  })

  it('heal every ally for a large amount with Miracle', () => {
    const arena = arenaWith([null, null, null, 'miracle', null])
    cast(arena, 4)
    expect(hits(arena, 'Miracle')).toBe(4)
    expect(ally(arena, 'Tank').hp).toBeGreaterThanOrEqual(21000)
  })
})

describe('cooldowns and charges', () => {
  it('stop a second cast until the cooldown is over', () => {
    const arena = arenaWith(['healing-rain', null, null, null, null])
    cast(arena, 1)
    run(arena, 1)
    cast(arena, 1)
    expect(arena.notice?.text).toBe("Healing Rain isn't ready yet")
    run(arena, 9)
    cast(arena, 1)
    expect(arena.cooldowns.get('healing-rain')?.charges).toBe(0)
    expect(arena.zones.at(-1)!.endsAt).toBeCloseTo(arena.time + 10, 1)
  })

  it('let a second charge go off right away', () => {
    const arena = arenaWith(['healing-rain', null, null, null, null], { 'healing-rain': { 'twin-storms': 1 } })
    cast(arena, 1)
    run(arena, 1)
    cast(arena, 1)
    expect(arena.zones).toHaveLength(2)
  })

  it("never run out for abilities that have no cooldown", () => {
    const arena = arenaWith(['mend', null, null, null, null])
    for (let i = 0; i < 3; i++) {
      cast(arena, 1)
      run(arena, 1.6)
    }
    expect(arena.meter.casts.get('Mend')).toBe(3)
  })

  it('let a fresh press beat a held main attack', () => {
    const arena = arenaWith(['renew', null, null, null, null])
    const holdingAttack = { move: { x: 0, y: 0 }, aim: null, held: new Set([0]) }
    arena.step(DT, holdingAttack)
    run(arena, 1)
    arena.press(1)
    arena.step(DT, holdingAttack)
    arena.step(DT, holdingAttack)
    expect(arena.meter.casts.get('Renew')).toBe(1)
  })

  it('keep dashes off the global cooldown', () => {
    const arena = arenaWith(['mend', null, null, null, 'dash'])
    cast(arena, 1)
    const start = { ...arena.player.pos }
    arena.press(5)
    arena.step(DT, { move: { x: 1, y: 0 }, aim: null, held: new Set() })
    run(arena, 0.3)
    expect(arena.cast?.ability.name).toBe('Mend')
    expect(arena.player.pos.x - start.x).toBeCloseTo(10, 0)
  })
})

describe('talent procs', () => {
  it('wash over every ally once more when Lifetide ends (Ebb and Flow)', () => {
    const arena = arenaWith([null, null, null, 'lifetide', null], { lifetide: { moonpull: 1, 'slow-ebb': 2, 'ebb-and-flow': 2 } })
    cast(arena, 4)
    run(arena, 10.2)
    expect(hits(arena, 'Ebb and Flow')).toBe(arena.allies.length)
  })

  it('cast the whole ability again on Echo, for free', () => {
    const base = healerKit(['renew', null, null, null, null])
    const kit: Kit = { ...base, slots: base.slots.map((a) => a && { ...a, echo: 100 }) }
    const arena = new Arena(kit, QUIET, { seed: 1 })
    cast(arena, 1)
    expect(arena.allies.filter((a) => a.hots.length > 0)).toHaveLength(2)
    expect(arena.resource).toBeCloseTo(920, 0)
  })
})

describe('the new mechanics', () => {
  it('never puts two Healing Rains on the same ally', () => {
    const arena = arenaWith(['healing-rain', null, null, null, null], { 'healing-rain': { 'twin-storms': 1 } })
    cast(arena, 1)
    run(arena, 1)
    cast(arena, 1)
    const [first, second] = arena.zones
    expect(Math.hypot(first.pos.x - second.pos.x, first.pos.y - second.pos.y)).toBeGreaterThan(first.radius)
  })

  it('makes Healing Rain last longer on crits, up to the cap (Gathering Storm)', () => {
    const base = healerKit(['healing-rain', null, null, null, null], { 'healing-rain': { 'gathering-storm': 3 } })
    const always = (a: (typeof base.slots)[number]) => a && { ...a, effects: a.effects.map((e) => ({ ...e, critChance: 100 })) }
    const arena = new Arena({ ...base, slots: base.slots.map(always) }, QUIET, { seed: 1 })
    cast(arena, 1)
    const placed = arena.time
    run(arena, 9)
    // Each crit adds 0.5 sec; at rank 3 it stops at 30% longer than its 10 sec.
    expect(arena.zones[0].endsAt - placed).toBeCloseTo(13, 1)
  })

  it('stacks Latent Charge on each bolt and spends it on the next direct heal', () => {
    const arena = arenaWith(['mend', 'conduit', null, null, null], { conduit: { 'strong-current': 1, 'latent-charge': 2 } })
    for (let i = 0; i < 3; i++) {
      cast(arena, 0)
      run(arena, 1)
    }
    expect(arena.buffs.find((b) => b.id === 'latent-charge')?.stacks).toBe(3)
    // 10% per stack, on top of Strong Current's 6%.
    expect(arena.current(1)!.effects[0].amount).toBeCloseTo(1800 * (1 + 0.06 + 0.3))
    cast(arena, 1)
    expect(arena.buffs.some((b) => b.id === 'latent-charge')).toBe(false)
  })

  it('lets you dodge a hit completely', () => {
    const pulse: Scenario = { ...QUIET, events: [{ kind: 'pulse', name: 'Test pulse', every: 1, amount: 500, first: 0.5 }] }
    const base = healerKit([null, null, null, null, null])
    const kit: Kit = { ...base, character: { ...base.character, stats: { ...base.character.stats, dodge: 100 } } }
    const arena = new Arena(kit, pulse, { seed: 1 })
    run(arena, 3)
    expect(arena.player.hp).toBe(1200)
    expect(ally(arena, 'Tank').hp).toBeLessThan(15000)
  })
})

describe('a changed build', () => {
  it('swaps in mid-fight, keeping health as a share', () => {
    const arena = arenaWith(['mend', null, null, null, null])
    arena.setKit(healerKit(['mend', null, null, null, null], {}, { Ring: { slot: 'Ring', rarity: 'epic', itemLevel: 120, stats: ['haste', 'crit'] } }))
    expect(arena.player.maxHp).toBe(3540)
    expect(arena.player.hp).toBeCloseTo(1770)
  })
})

describe('the dungeon fight', () => {
  it('runs to the end with a bot spamming heals', () => {
    const arena = new Arena(healerKit(['mend', 'renew', 'healing-rain', 'miracle', 'dash']), scenario('dungeon'), { seed: 3 })
    for (let t = 0; t < 200 && !arena.ended; t += DT) {
      for (const slot of [4, 3, 2, 1]) arena.press(slot)
      if (arena.resource < 200) arena.press(0)
      arena.step(DT)
    }
    expect(arena.ended).not.toBeNull()
    expect(arena.meter.rows.get('Mend')?.healing).toBeGreaterThan(0)
  })
})
