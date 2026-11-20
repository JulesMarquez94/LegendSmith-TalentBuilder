import { describe, expect, it } from 'vitest'
import { hudKit } from './kit.ts'
import { HudSim } from './sim.ts'
import { STAMINA } from './unity.ts'

const run = (sim: HudSim, seconds: number, step = 0.05) => {
  for (let t = 0; t < seconds - 1e-9; t += step) sim.tick(step)
}

describe('using a slot', () => {
  it("fails on a locked slot with the game's message", () => {
    const sim = new HudSim(hudKit('lifewarden-staff', 3), 3, 'explore')
    expect(sim.use(4)).toBe('Unlocks at level 5')
    expect(sim.message?.text).toBe('Unlocks at level 5')
    expect(sim.failed?.slot).toBe('big')
    run(sim, 2)
    expect(sim.message).toBeNull()
  })

  it('casts, then pays and starts the cooldown when the cast lands', () => {
    const sim = new HudSim(hudKit('lifewarden-staff', 60), 60, 'explore')
    const mend = sim.kit.slots[1]
    const before = sim.resource
    expect(sim.use(1)).toBeNull()
    expect(sim.cast?.name).toBe('Mend')
    run(sim, mend.castTime + 0.1)
    expect(sim.cast).toBeNull()
    expect(sim.resource).toBeLessThan(before + 8 * (mend.castTime + 0.2))
  })

  it("won't start a cast while you walk", () => {
    const sim = new HudSim(hudKit('lifewarden-staff', 60), 60, 'explore')
    sim.input.forward = 1
    expect(sim.use(1)).toBe("You can't cast while moving")
  })

  it('says "Not ready yet" while the cooldown runs, and shows its seconds', () => {
    const sim = new HudSim(hudKit('lifewarden-staff', 60), 60, 'explore')
    const miracle = sim.kit.slots[4]
    expect(sim.use(4)).toBeNull()
    run(sim, 2)
    expect(sim.cooldownLeft(miracle)).toBeGreaterThan(miracle.cooldown - 3)
    expect(sim.use(4)).toBe('Not ready yet')
    expect(sim.sweep(miracle)).toBeGreaterThan(0.9)
  })

  it('spends charges one at a time and gets them back', () => {
    const sim = new HudSim(hudKit('lifewarden-staff', 60), 60, 'explore')
    const dash = sim.kit.slots[5]
    expect(dash.charges).toBe(2)
    sim.use(5)
    expect(sim.charges(dash)).toBe(1)
    expect(sim.cooldownLeft(dash)).toBe(0)
    sim.use(5)
    expect(sim.charges(dash)).toBe(0)
    expect(sim.cooldownLeft(dash)).toBeGreaterThan(0)
    run(sim, dash.cooldown * 2 + 0.2)
    expect(sim.charges(dash)).toBe(2)
  })

  it('needs a target for a damage ability, and builds the resource with the main attack', () => {
    const sim = new HudSim(hudKit('twin-daggers', 60), 60, 'explore')
    sim.heading = Math.PI
    expect(sim.use(0)).toBe('No target')
    sim.heading = 0
    const before = sim.resource
    expect(sim.use(0)).toBeNull()
    expect(sim.resource).toBe(before + 1)
    expect(sim.numbers).toHaveLength(1)
  })

  it('says when the resource is short, in its own word', () => {
    const sim = new HudSim(hudKit('twin-daggers', 60), 60, 'explore')
    sim.resource = 0
    expect(sim.use(2)).toBe('Not enough combo')
  })

  it('raises a ghoul for the counters, no more than three', () => {
    const sim = new HudSim(hudKit('tome-of-summoning', 60), 60, 'explore')
    sim.resource = 15
    const raise = sim.kit.slots[3]
    for (let i = 0; i < 4; i++) {
      sim.use(3)
      run(sim, raise.castTime + 1.6)
    }
    expect(sim.minions.length).toBeLessThanOrEqual(3)
    expect(sim.minions.length).toBeGreaterThan(0)
  })
})

describe('stamina', () => {
  it('pays for a dodge, then fills and fades out 2 sec after it is full', () => {
    const sim = new HudSim(hudKit('ashwood-longbow', 60), 60, 'explore')
    run(sim, 0.1)
    expect(sim.staminaAlpha).toBe(0)
    expect(sim.dodge()).toBeNull()
    expect(sim.stamina).toBe(STAMINA.max - STAMINA.dodgeCost)
    run(sim, 0.5)
    expect(sim.staminaAlpha).toBe(1)
    run(sim, 1.6)
    expect(sim.stamina).toBe(STAMINA.max)
    run(sim, 1.5)
    expect(sim.staminaAlpha).toBe(1)
    run(sim, 1.5)
    expect(sim.staminaAlpha).toBe(0)
  })

  it("won't dodge without enough of it", () => {
    const sim = new HudSim(hudKit('ashwood-longbow', 60), 60, 'explore')
    for (let i = 0; i < 4; i++) sim.dodge()
    expect(sim.dodge()).toBe('Not enough stamina')
  })
})
