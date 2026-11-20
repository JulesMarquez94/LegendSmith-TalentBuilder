import { describe, expect, it } from 'vitest'
import { STARTING_ZONE, SAMPLE_SLOTS } from '../fake.ts'
import { barText, BOSSES, cooldownText, failureText, otherSeats, phaseAt } from './unity.ts'
import {
  bagView,
  bossAt,
  clock,
  currentStep,
  DUNGEON,
  ENRAGE_AFTER,
  freeSlots,
  groupAt,
  mapPoint,
  northOnMap,
  objectiveMarkers,
  objectivesFor,
  pickTarget,
  project,
  relative,
  sampleBag,
  sampleEnemies,
  selectPlates,
  shouldShowPlate,
  walk,
  zoneMap,
  type PlateCandidate,
  type PlateSettings,
} from './world.ts'

const plates: PlateSettings = { showDistance: 30, targetedShowDistance: 40, maxPlates: 12, showAtFullHealth: true }
const enemy = (id: number, distance: number, extra: Partial<PlateCandidate> = {}): PlateCandidate => ({
  id,
  distance,
  alive: true,
  boss: false,
  enemy: true,
  health: 100,
  maxHealth: 100,
  targeted: false,
  ...extra,
})

describe('nameplates, picked as the game picks them', () => {
  it('show living enemies within 30 m, never a boss, an ally or the dead', () => {
    expect(shouldShowPlate(enemy(1, 30), plates)).toBe(true)
    expect(shouldShowPlate(enemy(1, 30.5), plates)).toBe(false)
    expect(shouldShowPlate(enemy(1, 5, { boss: true }), plates)).toBe(false)
    expect(shouldShowPlate(enemy(1, 5, { enemy: false }), plates)).toBe(false)
    expect(shouldShowPlate(enemy(1, 5, { alive: false }), plates)).toBe(false)
  })

  it('show your target further out, to 40 m', () => {
    expect(shouldShowPlate(enemy(1, 38, { targeted: true }), plates)).toBe(true)
    expect(shouldShowPlate(enemy(1, 41, { targeted: true }), plates)).toBe(false)
  })

  it('can leave out enemies at full health', () => {
    const hurtOnly = { ...plates, showAtFullHealth: false }
    expect(shouldShowPlate(enemy(1, 5), hurtOnly)).toBe(false)
    expect(shouldShowPlate(enemy(1, 5, { health: 99 }), hurtOnly)).toBe(true)
  })

  it('keep the target and then the nearest, ties to the lower id, up to the limit', () => {
    const list = [enemy(5, 10), enemy(2, 4), enemy(3, 4), enemy(9, 25, { targeted: true }), enemy(7, 50)]
    expect(selectPlates(list, plates).map((c) => c.id)).toEqual([9, 2, 3, 5])
    expect(selectPlates(list, { ...plates, maxPlates: 2 }).map((c) => c.id)).toEqual([9, 2])
    expect(selectPlates(list, { ...plates, maxPlates: 0 })).toEqual([])
  })
})

describe('the boss fight', () => {
  const malacarne = BOSSES[1]

  it("follows the boss's phases down its health", () => {
    expect(phaseAt(malacarne, 100).name).toBe('The lift')
    expect(phaseAt(malacarne, 75).name).toBe('First feral')
    expect(phaseAt(malacarne, 50.1).name).toBe('First feral')
    expect(phaseAt(malacarne, 24).name).toBe('Last feral')
    expect(phaseAt(BOSSES[0], 69).name).toBe('First wave')
  })

  it('counts down to the enrage, and winds up its casts now and then', () => {
    const start = bossAt(0)
    expect(start.health).toBe(100)
    expect(start.enrageIn).toBe(ENRAGE_AFTER)
    expect(start.casting).toBeNull()
    expect(bossAt(ENRAGE_AFTER + 10).enrageIn).toBe(0)
    expect(bossAt(13.4).casting).toMatchObject({ name: 'Hook and chain' })
    expect(bossAt(27.4).casting).toMatchObject({ name: 'Unchain a feral' })
    expect(bossAt(70).phase.name).toBe('First feral')
    expect(bossAt(10_000).health).toBe(5)
  })

  it('writes times as minutes and seconds', () => {
    expect(clock(0)).toBe('0:00')
    expect(clock(65.9)).toBe('1:05')
    expect(clock(-3)).toBe('0:00')
  })
})

describe("the game's HUD texts", () => {
  it('write cooldowns in whole seconds from 1, in tenths below, and nothing when over', () => {
    expect(cooldownText(4.2)).toBe('5')
    expect(cooldownText(1)).toBe('1')
    expect(cooldownText(0.42)).toBe('0.5')
    expect(cooldownText(0)).toBe('')
  })

  it('write bars as "850 / 1000", rounding, with nothing below 0', () => {
    expect(barText(849.6, 1000)).toBe('850 / 1000')
    expect(barText(-5, 100)).toBe('0 / 100')
  })

  it('say why using a slot failed, in the resource\'s own word', () => {
    expect(failureText('resource', 'mana')).toBe('Not enough mana')
    expect(failureText('minionCap', 'imps')).toBe('You command as many imps as you can')
    expect(failureText('locked', 'rage', 4)).toBe('Unlocks at level 4')
    expect(failureText('cooldown', 'focus')).toBe('Not ready yet')
  })
})

describe('the group', () => {
  it("shows the other seats: the player takes the first seat of their role", () => {
    expect(otherSeats('Healer').map((s) => s.name)).toEqual(['Bram', 'Corin', 'Wren'])
    expect(otherSeats('Damage').map((s) => s.name)).toEqual(['Bram', 'Maelis', 'Wren'])
    expect(otherSeats('Tank').map((s) => s.name)).toEqual(['Maelis', 'Corin', 'Wren'])
  })

  it('keeps health and resource in range through a fight', () => {
    for (let t = 0; t < 60; t += 0.7)
      for (const m of groupAt('Damage', 30, t, true)) {
        expect(m.health).toBeGreaterThan(0)
        expect(m.health).toBeLessThanOrEqual(m.maxHealth)
        expect(m.resourceFill).toBeGreaterThanOrEqual(0)
        expect(m.resourceFill).toBeLessThanOrEqual(1)
      }
    expect(groupAt('Healer', 60, 3, false).every((m) => m.health === m.maxHealth)).toBe(true)
  })
})

describe('space: the minimap and the screen', () => {
  it('puts a point north of you at the top, north up', () => {
    expect(mapPoint({ x: 0, y: 30 }, { x: 0, y: 0 }, Math.PI / 2, 60, false)).toEqual({ x: 0, y: -0.5 })
    expect(northOnMap(1, false)).toEqual({ x: 0, y: -1 })
  })

  it('turns with you: what is ahead is at the top, and north moves round the rim', () => {
    // Facing east, a point to the east is straight ahead.
    const p = mapPoint({ x: 30, y: 0 }, { x: 0, y: 0 }, Math.PI / 2, 60, true)
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(-0.5)
    const north = northOnMap(Math.PI / 2, true)
    expect(north.x).toBeCloseTo(-1)
    expect(north.y).toBeCloseTo(0)
  })

  it('walks along your heading and turns', () => {
    const step = walk({ x: 0, y: 0 }, 0, { forward: 1, turn: 0 }, 1)
    expect(step.at.y).toBeCloseTo(5)
    expect(walk({ x: 0, y: 0 }, 0, { forward: 0, turn: -1 }, 1).heading).toBeGreaterThan(Math.PI)
    expect(relative({ x: 0, y: 10 }, { x: 0, y: 0 }, 0)).toEqual({ forward: 10, right: 0, distance: 10 })
  })

  it('draws what is ahead on the screen, bigger when near, and nothing behind the camera', () => {
    const near = project({ x: 0, y: 5 }, { x: 0, y: 0 }, 0)!
    const far = project({ x: 0, y: 30 }, { x: 0, y: 0 }, 0)!
    expect(near.x).toBeCloseTo(0.5)
    expect(near.scale).toBeGreaterThan(far.scale)
    expect(near.y).toBeGreaterThan(far.y)
    expect(project({ x: 0, y: -10 }, { x: 0, y: 0 }, 0)).toBeNull()
  })

  it('targets the enemy nearest the crosshair ahead, within 40 m', () => {
    const enemies = sampleEnemies(20, 'explore')
    const target = pickTarget(enemies, { x: 0, y: 0 }, 0)
    expect(target?.name).toBe('Brute')
    expect(pickTarget(enemies, { x: 0, y: 0 }, Math.PI)).toBeNull()
  })

  it("draws a zone's map the same every time", () => {
    expect(zoneMap('Ashvale')).toEqual(zoneMap('Ashvale'))
    expect(zoneMap('Ashvale')).not.toEqual(zoneMap('Greyhollow'))
  })
})

describe('objectives, from the zone you are in', () => {
  it("follow a zone's progression: the step you're on, with its count", () => {
    const o = objectivesFor(STARTING_ZONE, 'explore')
    expect(o.kind).toBe('progression')
    expect(currentStep(o)?.text).toBe('Drive the gobolds from the granary')
    expect(currentStep(o)?.count).toEqual([6, 10])
    expect(objectiveMarkers(o).length).toBeGreaterThan(0)
  })

  it("show the events running in a zone you've done", () => {
    const o = objectivesFor('Thornwood Marches', 'explore')
    expect(o.kind).toBe('open')
    expect(o.steps).toEqual([])
    expect(o.events.length).toBeGreaterThan(1)
  })

  it("show the dungeon's bosses in a boss fight, with the phase", () => {
    const o = objectivesFor('Ashvale', 'boss', bossAt(70))
    expect(o.zone).toBe(DUNGEON)
    expect(currentStep(o)?.text).toBe('Defeat Overseer Malacarne · First feral')
  })

  it('cover every sample character, and say to explore anywhere else', () => {
    for (const c of SAMPLE_SLOTS) if (c) expect(objectivesFor(c.zone, 'explore').title).not.toBe('Nothing running here yet')
    expect(objectivesFor('Nowhere', 'explore').steps[0].text).toBe('Explore Nowhere')
  })
})

describe('the bag', () => {
  const bag = sampleBag(40)

  it('fits in its 30 slots, a stack taking one', () => {
    expect(bag.length).toBeLessThanOrEqual(30)
    expect(freeSlots(bag)).toBe(30 - bag.length)
  })

  it('sorts itself into categories, in a fixed order, leaving out empty ones', () => {
    const groups = bagView(bag, '', true)
    expect(groups.map((g) => g.category)).toEqual(['Quest', 'Trinkets', 'Consumables', 'Materials', 'Junk'])
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(bag.length)
  })

  it('finds items by name, category or detail, any case', () => {
    expect(bagView(bag, 'DRAUGHT', true).flatMap((g) => g.items.map((i) => i.name))).toEqual(['Healing draught'])
    expect(bagView(bag, 'materials', true).map((g) => g.category)).toEqual(['Materials'])
    expect(bagView(bag, 'item level', true).map((g) => g.category)).toEqual(['Trinkets'])
    expect(bagView(bag, 'zzz', true)).toEqual([])
  })

  it('can be one list instead', () => {
    const one = bagView(bag, '', false)
    expect(one).toHaveLength(1)
    expect(one[0].category).toBe('All')
  })
})
