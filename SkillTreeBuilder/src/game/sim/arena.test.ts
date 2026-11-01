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
    expect(arena.resource).toBeCloseTo(870, 0)
    run(arena, 2)
    expect(arena.resource).toBeCloseTo(886, 0)
  })

  it('is restored by Radiant Bolt, a 1.5 sec cast', () => {
    const arena = arenaWith([null, null, null, null, null])
    arena.resource = 500
    cast(arena, 0)
    expect(arena.cast?.ability.name).toBe('Radiant Bolt')
    run(arena, 1.6)
    expect(arena.meter.resourceGained.get('Radiant Bolt')).toBe(20)
    // 20 from the bolt, 8 a second from regeneration.
    expect(arena.resource).toBeCloseTo(500 + 20 + 8 * 1.65, 1)
  })

  it("stops a cast you can't afford", () => {
    const arena = arenaWith(['mend', null, null, null, null])
    arena.resource = 10
    cast(arena, 1)
    expect(arena.cast).toBeNull()
    expect(arena.notice?.text).toBe('Not enough mana')
  })
})

describe("Radiant Bolt's tree", () => {
  const bolt = (kit: Kit) => kit.slots[0]!

  it('raises mana per bolt, regeneration, maximum mana, crit and haste', () => {
    const kit = healerKit([null, null, null, null, null], {
      'lifewarden-staff': { attunement: 2, meditation: 2, 'deep-reserves': 3, 'clear-sight': 2, 'quickened-light': 2 },
    })
    expect(bolt(kit).effects[1].restore).toBe(28)
    expect(kit.character.stats).toMatchObject({ resourceRegen: 12, maxResource: 1300 })
    expect(kit.character.lines.crit.talents).toBe(6)
    expect(kit.character.lines.haste.talents).toBe(6)
    expect(bolt(kit).castTime).toBeCloseTo(1.5 / 1.06)
  })

  it('makes it instant with Lightspeed: 3 charges, each back after 3 sec, and more mana with Afterglow', () => {
    const kit = healerKit([null, null, null, null, null], {
      'lifewarden-staff': { 'quickened-light': 2, 'clear-sight': 2, lightspeed: 1, afterglow: 2 },
    })
    expect(bolt(kit)).toMatchObject({ castTime: 0, charges: 3, cooldown: 3 })
    expect(bolt(kit).effects[1].restore).toBe(40)
    const arena = new Arena(kit, QUIET, { seed: 7 })
    for (let i = 0; i < 3; i++) {
      cast(arena, 0)
      expect(arena.cast).toBeNull()
      run(arena, 1)
    }
    expect(arena.meter.casts.get('Radiant Bolt')).toBe(3)
    // The first charge came back 3 sec after the first bolt.
    expect(arena.cooldowns.get('lifewarden-staff')?.charges).toBe(1)
    cast(arena, 0)
    run(arena, 1)
    cast(arena, 0)
    expect(arena.notice?.text).toBe("Radiant Bolt isn't ready yet")
  })

  it('stores some of the mana you spend with Reservoir, for the next bolt, up to 30% of your maximum', () => {
    const arena = arenaWith(['mend', null, null, null, null], { 'lifewarden-staff': { meditation: 2, reservoir: 2 } })
    cast(arena, 1)
    // Mend costs 130: 13 of it stored.
    expect(arena.reservoir).toBeCloseTo(13)
    run(arena, 2.1)
    cast(arena, 0)
    run(arena, 1.6)
    expect(arena.meter.resourceGained.get('Reservoir')).toBeCloseTo(13)
    expect(arena.reservoir).toBe(0)
    for (let i = 0; i < 40; i++) {
      arena.resource = 1000
      cast(arena, 1)
      run(arena, 2.1)
    }
    expect(arena.reservoir).toBeCloseTo(300)
  })

  it('restores more mana on a crit with Radiance', () => {
    const base = healerKit([null, null, null, null, null], { 'lifewarden-staff': { 'clear-sight': 2, radiance: 2 } })
    const crits: Kit = {
      ...base,
      slots: base.slots.map((a, i) => (a && i === 0 ? { ...a, effects: a.effects.map((e) => ({ ...e, critChance: 100 })) } : a)),
    }
    const arena = new Arena(crits, QUIET, { seed: 7 })
    arena.resource = 500
    cast(arena, 0)
    run(arena, 1.6)
    expect(arena.meter.resourceGained.get('Radiance')).toBe(20)
  })
})

describe("Mend's tree", () => {
  /** No crits from slotted abilities, so heal numbers are exact. */
  const noCrits = (kit: Kit): Kit => ({
    ...kit,
    slots: kit.slots.map((a) => a && { ...a, effects: a.effects.map((e) => ({ ...e, critChance: 0 })) }),
  })
  /** Everyone at full health but the ones given here, as a share of their maximum. */
  const healthAt = (arena: Arena, shares: Record<string, number>) => {
    for (const a of arena.allies) a.hp = a.maxHp * (shares[a.isPlayer ? 'You' : a.name] ?? 1)
  }
  const healed = (arena: Arena, name: string) => arena.meter.rows.get(name)?.healing ?? 0

  it('heals more the lower its target is with Triage, and the next most injured ally with Echoing Mend', () => {
    const kit = noCrits(healerKit(['mend', null, null, null, null], { mend: { 'greater-mend': 3, triage: 2, 'echoing-mend': 2 } }))
    const arena = new Arena(kit, QUIET, { seed: 7 })
    healthAt(arena, { Tank: 0.2, Blade: 0.6 })
    cast(arena, 1)
    run(arena, 2.1)
    // Triage: up to 50% more, here 80% of it (the tank was missing 80% of their health). Like every
    // conditional bonus, it multiplies what the talents' added % give.
    expect(healed(arena, 'Mend')).toBeCloseTo(2400 * 1.24 * (1 + 0.5 * 0.8))
    // Echoing Mend: 40% as much on the Blade, missing 40%: Greater Mend and Triage count there too.
    expect(healed(arena, 'Echoing Mend')).toBeCloseTo(2400 * 0.4 * 1.24 * (1 + 0.5 * 0.4))
  })

  it("turns overhealing into a shield with Mending Ward, up to 20% of the target's maximum health", () => {
    const kit = noCrits(healerKit(['mend', null, null, null, null], { mend: { 'mending-ward': 2 } }))
    const arena = new Arena(kit, QUIET, { seed: 7 })
    healthAt(arena, { You: 2000 / 2400 })
    cast(arena, 1)
    run(arena, 2.1)
    expect(arena.player.shields.find((x) => x.name === 'Mending Ward')?.amount).toBeCloseTo(2400 * 0.2)
  })

  it('makes the next Mend instant and free with Surge of Light, even when Empowered Mend raises its cost', () => {
    const arena = arenaWith(['mend', 'renew', null, null, null], { mend: { 'swift-hands': 2, 'surge-of-light': 2, 'empowered-mend': 2 } })
    expect(arena.current(1)!.cost).toBeCloseTo(182)
    // Renews and their ticks are heals: each has a 10% chance.
    for (let t = 0; t < 60 && !arena.buffs.some((b) => b.id === 'surge-of-light'); t += DT) {
      arena.resource = 1000
      arena.press(2)
      arena.step(DT)
    }
    expect(arena.current(1)).toMatchObject({ castTime: 0, cost: 0 })
    // Past the last Renew's global cooldown.
    run(arena, 1.1)
    const before = arena.resource
    cast(arena, 1)
    expect(arena.cast).toBeNull()
    expect(arena.resource).toBeGreaterThanOrEqual(before)
    expect(arena.buffs.some((b) => b.id === 'surge-of-light')).toBe(false)
  })

  it('casts Mend on whoever drops below 15% with Lifeline: free, instant, off the global cooldown, once every 45 sec', () => {
    // 300 to everyone every second: you go 1200, 900, 600, 300 (12.5%).
    const pulse: Scenario = { ...QUIET, events: [{ kind: 'pulse', name: 'Test pulse', every: 1, amount: 300, first: 0.5 }] }
    const arena = arenaWith(['mend', null, null, null, null], { mend: { 'swift-hands': 2, 'surge-of-light': 2, lifeline: 1 } }, pulse)
    run(arena, 3.6)
    expect(hits(arena, 'Mend')).toBe(1)
    expect(arena.player.hp).toBeGreaterThan(2000)
    expect(arena.cast).toBeNull()
    expect(arena.resource).toBe(1000)
    expect(arena.use(1)).toBe('ok')
    arena.cast = null
    // Healed to full, you drop below 15% again 7 sec later: still on its cooldown.
    run(arena, 8)
    expect(hits(arena, 'Mend')).toBe(1)
  })
})

describe("Chain Heal's tree", () => {
  const chainOf = (kit: Kit) => kit.slots[1]!

  it('casts in 2 sec and heals 3 allies, 25% less each jump; its talents change all of that', () => {
    const base = healerKit(['chain-heal', null, null, null, null])
    expect(chainOf(base)).toMatchObject({ castTime: 2, cooldown: 6, charges: 1 })
    expect(chainOf(base).effects[0]).toMatchObject({ amount: 1900, bounces: 2, falloff: 25 })
    const kit = healerKit(['chain-heal', null, null, null, null], {
      'chain-heal': { 'swift-current': 2, 'extra-link': 1, 'strong-links': 3, 'quick-tide': 2, 'twin-currents': 1 },
    })
    // Quick Tide's 2 sec off, Twin Currents' 2 sec back on.
    expect(chainOf(kit)).toMatchObject({ castTime: 1.5, cooldown: 6, charges: 2 })
    expect(chainOf(kit).effects[0]).toMatchObject({ bounces: 3, falloff: 10 })
  })

  it('jumps on to every ally with your HoT with Tidal Web', () => {
    // Tidal Web alone (the builder asks for Extra Link first), so the 4th ally is reached only by it.
    const without = arenaWith(['chain-heal', 'renew', null, null, null])
    const web = arenaWith(['chain-heal', 'renew', null, null, null], { 'chain-heal': { 'tidal-web': 1 } })
    for (const arena of [without, web]) {
      // The archer stands close to everyone and gets Renew, then goes back to full health, so the
      // chain reaches them last.
      const archer = ally(arena, 'Archer')
      archer.pos = { x: 27, y: 18 }
      archer.home = { x: 27, y: 18 }
      for (const a of arena.allies) a.hp = a.maxHp * (a.name === 'Archer' ? 0.5 : 1)
      cast(arena, 2)
      run(arena, 1.1)
      for (const a of arena.allies) a.hp = a.maxHp * (a.name === 'Archer' ? 1 : 0.5)
      cast(arena, 1)
      run(arena, 2.1)
    }
    expect(hits(without, 'Chain Heal')).toBe(3)
    expect(hits(web, 'Chain Heal')).toBe(4)
  })

  it('starts one second chain at most from a crit with Chain Reaction', () => {
    const base = healerKit(['chain-heal', null, null, null, null], { 'chain-heal': { 'chain-reaction': 2 } })
    expect(chainOf(base).effects[0].rechain).toBe(50)
    // Every heal crits and every crit would start a chain: still only one more.
    const sure: Kit = {
      ...base,
      slots: base.slots.map((a, i) => (a && i === 1 ? { ...a, effects: a.effects.map((e) => ({ ...e, critChance: 100, rechain: 100 })) } : a)),
    }
    const arena = new Arena(sure, QUIET, { seed: 7 })
    cast(arena, 1)
    run(arena, 2.1)
    expect(hits(arena, 'Chain Heal')).toBe(6)
  })

  it('gives back mana for each crit with Flowing Current', () => {
    const base = healerKit(['chain-heal', null, null, null, null], { 'chain-heal': { 'flowing-current': 3 } })
    const crits: Kit = {
      ...base,
      slots: base.slots.map((a, i) => (a && i === 1 ? { ...a, effects: a.effects.map((e) => ({ ...e, critChance: 100 })) } : a)),
    }
    const arena = new Arena(crits, QUIET, { seed: 7 })
    cast(arena, 1)
    run(arena, 2.1)
    // Three heals, three crits: 3% of 1,000 mana each.
    expect(arena.meter.resourceGained.get('Flowing Current')).toBeCloseTo(90)
  })
})

describe('heals', () => {
  it('land on the lowest-health ally when the cast finishes', () => {
    const arena = arenaWith(['mend', null, null, null, null])
    ally(arena, 'Tank').hp = 3000
    cast(arena, 1)
    expect(arena.cast?.ability.name).toBe('Mend')
    run(arena, 2.1)
    expect(ally(arena, 'Tank').hp).toBeGreaterThanOrEqual(5400)
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
    run(arena, 2.1)
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
    run(arena, 1.6)
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
      run(arena, 2.1)
    }
    expect(arena.meter.casts.get('Mend')).toBe(3)
  })

  it('let a fresh press beat a held main attack', () => {
    const arena = arenaWith(['renew', null, null, null, null])
    const holdingAttack = { move: { x: 0, y: 0 }, aim: null, held: new Set([0]) }
    arena.step(DT, holdingAttack)
    run(arena, 1.5)
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

describe('Teleport', () => {
  const walkRight = { move: { x: 1, y: 0 }, aim: null, held: new Set<number>() }

  it("won't go off mid-cast, unless Spellstride lets it, and then the cast goes on", () => {
    const blocked = arenaWith(['mend', null, null, null, 'teleport'])
    cast(blocked, 1)
    const start = { ...blocked.player.pos }
    cast(blocked, 5)
    expect(blocked.notice?.text).toBe("You can't use Teleport while casting")
    expect(blocked.player.pos).toEqual(start)

    const free = arenaWith(['mend', null, null, null, 'teleport'], { teleport: { spellstride: 1 } })
    cast(free, 1)
    const from = { ...free.player.pos }
    free.press(5)
    free.step(DT, walkRight)
    expect(free.cast?.ability.name).toBe('Mend')
    expect(free.player.pos.x - from.x).toBeCloseTo(15, 0)
  })

  it('holds 2 charges with Double Blink, each half as slow again to come back', () => {
    const teleport = healerKit([null, null, null, null, 'teleport'], { teleport: { 'phase-shift': 3, 'double-blink': 1 } }).slots[5]!
    expect(teleport.charges).toBe(2)
    expect(teleport.cooldown).toBeCloseTo((15 - 4.5) * 1.5)
  })

  it('goes back where you were with Recall, for free, within 4 sec', () => {
    const arena = arenaWith([null, null, null, null, 'teleport'], { teleport: { 'far-reach': 3, recall: 1 } })
    const start = { ...arena.player.pos }
    arena.press(5)
    arena.step(DT, walkRight)
    expect(arena.player.pos.x - start.x).toBeCloseTo(24, 0)
    expect(arena.buffs.some((b) => b.name === 'Recall')).toBe(true)
    run(arena, 1)
    cast(arena, 5)
    // Back where the teleport started (one step of walking past where the test began).
    expect(arena.player.pos.x).toBeCloseTo(start.x, 0)
    expect(arena.player.pos.y).toBe(start.y)
    expect(arena.buffs.some((b) => b.name === 'Recall')).toBe(false)
    // Going back didn't use a charge: the one teleport did, so the next press waits for the cooldown.
    expect(arena.cooldowns.get('teleport')!.charges).toBe(0)
    cast(arena, 5)
    expect(arena.notice?.text).toBe("Teleport isn't ready yet")
  })

  it('closes the way back after 4 sec', () => {
    const arena = arenaWith([null, null, null, null, 'teleport'], { teleport: { 'double-blink': 1, recall: 1 } })
    arena.press(5)
    arena.step(DT, walkRight)
    run(arena, 4.1)
    expect(arena.buffs.some((b) => b.name === 'Recall')).toBe(false)
    // The second charge is a new teleport, up this time, not a way back.
    const there = { ...arena.player.pos }
    arena.press(5)
    arena.step(DT, { move: { x: 0, y: -1 }, aim: null, held: new Set() })
    expect(arena.player.pos.x).toBeCloseTo(there.x)
    expect(there.y - arena.player.pos.y).toBeCloseTo(15, 0)
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
      run(arena, 1.6)
    }
    expect(arena.buffs.find((b) => b.id === 'latent-charge')?.stacks).toBe(3)
    // 10% per stack, on top of Strong Current's 6%.
    expect(arena.current(1)!.effects[0].amount).toBeCloseTo(2400 * (1 + 0.06 + 0.3))
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
