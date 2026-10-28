import { describe, expect, it } from 'vitest'
import type { Kit } from '../resolve.ts'
import { artifact, kitFor } from '../testkit.ts'
import { Arena } from './arena.ts'
import { SCENARIOS, type Scenario } from './scenarios.ts'

// The first versions of the Sword & Shield, Greatsword, Tome of Dawn and Spear, and the arena's
// tank rules they lean on: you take the tank's place, rage from hits, parries and taunts.

const scenario = (id: string) => SCENARIOS.find((s) => s.id === id)!
const DUMMIES = scenario('dummies')
/** Two tanks the boss swaps between every 5 sec, and nothing else hitting anyone. */
const SWAP: Scenario = {
  ...scenario('dungeon'),
  party: [
    { name: 'Tank', role: 'tank', maxHp: 30000, home: { x: 30, y: 15.5 }, dps: 0 },
    { name: 'Off tank', role: 'tank', maxHp: 30000, home: { x: 31.2, y: 15.5 }, dps: 0 },
  ],
  boss: { name: 'Boss', maxHp: Infinity },
  events: [{ kind: 'melee', every: 1, amount: 1000, swap: 5 }],
  botHealer: undefined,
  noDeaths: true,
}

const DT = 0.05
const run = (arena: Arena, seconds: number) => {
  for (let t = 0; t < seconds - 1e-9; t += DT) arena.step(DT)
}
const cast = (arena: Arena, slot: number) => {
  arena.press(slot)
  arena.step(DT)
  while (arena.cast) arena.step(DT)
}
const withStats = (kit: Kit, stats: Partial<Kit['character']['stats']>): Kit => ({
  ...kit,
  character: { ...kit.character, stats: { ...kit.character.stats, ...stats } },
})

const sword = artifact('sword-and-shield')
const greatsword = artifact('greatsword')
const dawn = artifact('tome-of-dawn')
const spear = artifact('spear')

describe('a tank', () => {
  it("takes the tank's place, and a bot heals from your usual spot", () => {
    const arena = new Arena(kitFor(sword, [null, null, null, null, null, null]), scenario('dungeon'), { seed: 1 })
    expect(arena.allies.map((a) => [a.name, a.role])).toEqual([
      ['You', 'tank'],
      ['Bot healer', 'healer'],
      ['Blade', 'damage'],
      ['Archer', 'damage'],
    ])
    expect(arena.player.pos).toEqual({ x: 30, y: 15.5 })
    expect(arena.allies[1].pos).toEqual(scenario('dungeon').playerHome)
  })

  it('takes the boss hits', () => {
    const arena = new Arena(kitFor(sword, [null, null, null, null, null, null]), SWAP, { seed: 1 })
    expect(arena.allies.map((a) => a.name)).toEqual(['You', 'Off tank'])
    expect(arena.player.role).toBe('tank')
    expect(arena.player.pos).toEqual({ x: 30, y: 15.5 })
    run(arena, 3)
    expect(arena.player.hp).toBeLessThan(arena.player.maxHp)
  })

  it('pulls the boss off the other tank with Provoke', () => {
    const kit = withStats(kitFor(sword, ['provoke', null, null, null, null, null]), { health: 30000 })
    const arena = new Arena(kit, SWAP, { seed: 1 })
    // From 5 sec the boss swings at the off tank.
    run(arena, 5.5)
    const hp = arena.player.hp
    run(arena, 1.5)
    expect(arena.player.hp).toBe(hp)
    cast(arena, 1)
    expect(arena.boss.tauntedUntil).toBeCloseTo(arena.time + 6, 0)
    run(arena, 1.5)
    expect(arena.player.hp).toBeLessThan(hp)
  })

  it('taunts every enemy around you with Tremor', () => {
    const kit = kitFor(greatsword, ['tremor', null, null, null, null, null])
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.resource = 20
    cast(arena, 1)
    expect(arena.resource).toBe(0)
    // The boss and the two near dummies are within 8 yd of the tank's spot; the far two aren't.
    expect(arena.enemies.filter((e) => e.tauntedUntil > arena.time)).toHaveLength(3)
  })
})

describe('the Sword & Shield', () => {
  it('gains rage from Shield Bash and from every hit you take', () => {
    const arena = new Arena(kitFor(sword, [null, null, null, null, null, null]), SWAP, { seed: 1 })
    expect(arena.resource).toBe(0)
    cast(arena, 0)
    expect(arena.meter.resourceGained.get('Shield Bash')).toBe(10)
    run(arena, 3)
    // One swing a second, 5 rage each.
    expect(arena.meter.resourceGained.get('Getting hit')).toBe(15)
  })

  it('spends rage on Shield Block, a shield on you', () => {
    const kit = withStats(kitFor(sword, ['shield-block', null, null, null, null, null]), { health: 10000 })
    const arena = new Arena(kit, DUMMIES, { seed: 1 })
    arena.resource = 30
    cast(arena, 1)
    expect(arena.resource).toBe(0)
    expect(arena.player.shields).toEqual([expect.objectContaining({ name: 'Shield Block', amount: 2000 })])
  })

  it('caps Shield Block, like every shield, at half your health', () => {
    const arena = new Arena(kitFor(sword, ['shield-block', null, null, null, null, null]), DUMMIES, { seed: 1 })
    arena.resource = 30
    cast(arena, 1)
    expect(arena.player.shields[0].amount).toBe(1200)
  })
})

describe('the Greatsword', () => {
  it('parries melee swings, gaining momentum and striking back with Riposte', () => {
    const kit = withStats(kitFor(greatsword, [null, null, null, null, null, null], { greatsword: { riposte: 2 } }), { parry: 100 })
    const arena = new Arena(kit, SWAP, { seed: 1 })
    run(arena, 3.5)
    expect(arena.player.hp).toBe(arena.player.maxHp)
    expect(arena.meter.resourceGained.get('Parry')).toBe(30)
    expect(arena.meter.damageRows.get('Riposte')?.hits).toBe(3)
  })

  it('hits every enemy close to its target with Wide Swing', () => {
    const arena = new Arena(kitFor(greatsword, [null, null, null, null, null, null]), DUMMIES, { seed: 1 })
    cast(arena, 0)
    expect(arena.meter.damageRows.get('Wide Swing')?.hits).toBe(3)
    expect(arena.resource).toBe(10)
  })
})

describe('the Tome of Dawn', () => {
  it('wards the lowest-health ally with Dawn Bolt', () => {
    const quiet: Scenario = { ...scenario('practice'), events: [], startHealth: 0.5 }
    const arena = new Arena(kitFor(dawn, [null, null, null, null, null, null]), quiet, { seed: 1 })
    cast(arena, 0)
    const warded = arena.allies.filter((a) => a.shields.length > 0)
    expect(warded).toHaveLength(1)
    expect(warded[0].shields[0]).toMatchObject({ name: 'Dawn Ward', amount: 350 })
  })

  it('counts what the ward soaks as healing on the meter', () => {
    // The practice party loses health all the time, so the ward is used up within a few seconds.
    const arena = new Arena(kitFor(dawn, [null, null, null, null, null, null]), scenario('practice'), { seed: 1 })
    cast(arena, 0)
    run(arena, 3)
    expect(arena.meter.rows.get('Dawn Ward')?.healing).toBeCloseTo(350)
  })

  it('pays for the shared heals with light', () => {
    const arena = new Arena(kitFor(dawn, ['mend', null, null, null, null, null]), DUMMIES, { seed: 1 })
    expect(arena.resource).toBe(600)
    cast(arena, 1)
    expect(arena.meter.resourceSpent.get('Mend')).toBe(100)
  })
})

describe('the Spear', () => {
  it('alternates a thrust at one enemy and a sweep around it, from 8 yd', () => {
    const arena = new Arena(kitFor(spear, [null, null, null, null, null, null]), DUMMIES, { seed: 1 })
    arena.player.pos = { x: 30, y: 21 }
    cast(arena, 0)
    run(arena, 1)
    cast(arena, 0)
    expect(arena.meter.damageRows.get('Thrust')?.hits).toBe(1)
    // The boss and all four dummies are within 6 yd of the boss.
    expect(arena.meter.damageRows.get('Sweep')?.hits).toBe(5)
  })
})
