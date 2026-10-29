import { describe, expect, it } from 'vitest'
import { buildFromHash, buildHash, type Build } from './share.ts'

describe('build links', () => {
  const build: Build = {
    loadout: {
      level: 23,
      artifact: 'tome-of-summoning',
      slots: ['tome-of-summoning', 'miasma', 'harvest', null, 'teleport', null, null, null],
      ranks: { miasma: { 'lingering-pox': 3 }, teleport: { recall: 1 } },
    },
    gear: { Ring: { slot: 'Ring', rarity: 'epic', itemLevel: 120, stats: ['haste', 'crit'], split: 135, name: 'Band of the Swift Hand' } },
  }

  it('carry the whole build in the address, URL-safe', () => {
    const hash = buildHash(build)
    expect(hash).toMatch(/^#b=[A-Za-z0-9_-]+$/)
    expect(buildFromHash(hash)).toEqual(build)
  })

  it('ignore an address without a build, or a garbled one', () => {
    expect(buildFromHash('')).toBeNull()
    expect(buildFromHash('#arena')).toBeNull()
    expect(buildFromHash('#b=not*base64')).toBeNull()
    expect(buildFromHash(`#b=${btoa('"just text"')}`)).toBeNull()
  })
})
