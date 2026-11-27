import { describe, expect, it } from 'vitest'
import { MECHANICS } from './mechanics.ts'
import { builtEntries, CODE_BY_ID, CODES, TEMPLATE_OF, TEMPLATES } from './templates.ts'

describe('the compendium’s templates', () => {
  it('file every arena mechanic under exactly one template', () => {
    for (const m of MECHANICS) {
      const homes = TEMPLATES.filter((t) => builtEntries(t).some((e) => e.kind === 'mechanic' && e.mechanic === m))
      expect(homes.map((t) => t.id), m.name).toHaveLength(1)
      expect(TEMPLATE_OF.get(m.id)).toBe(homes[0])
    }
  })

  it('file Binding Chains under Tether and point to it from Forced Move, which lists only its pull', () => {
    const tether = TEMPLATES.find((t) => t.id === 'TETHER')
    expect(TEMPLATE_OF.get('BindingChains')).toBe(tether)
    const shove = TEMPLATES.find((t) => t.id === 'SHOVE')!
    expect(builtEntries(shove)).toEqual([
      expect.objectContaining({ kind: 'elsewhere', name: 'Binding Chains (its slow pull)', home: tether }),
    ])
  })

  it('leave game pieces the compendium has not recorded as plain names', () => {
    const creep = TEMPLATES.find((t) => t.id === 'CREEP')!
    expect(builtEntries(creep)).toEqual([{ kind: 'other', name: 'Creeping Frost (Rime Lich)' }])
  })

  it('only use codes that exist, each named once', () => {
    expect(new Set(CODES.map((c) => c.id)).size).toBe(CODES.length)
    for (const t of TEMPLATES) for (const c of t.codes) expect(CODE_BY_ID.has(c), `${t.id}: ${c}`).toBe(true)
  })
})
