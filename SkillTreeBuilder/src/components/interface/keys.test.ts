import { describe, expect, it } from 'vitest'
import { backFrom, FLOW } from './flow.ts'
import { keyTarget, navAction, wrap, type KeyPress } from './keys.ts'

const press = (key: string, more: Partial<KeyPress> = {}): KeyPress => ({
  key,
  target: 'none',
  modifier: false,
  repeat: false,
  dialogOpen: false,
  ...more,
})

describe('interface keys', () => {
  it('sort where a key went', () => {
    expect(keyTarget(null)).toBe('none')
    expect(keyTarget({ tagName: 'DIV' })).toBe('none')
    expect(keyTarget({ tagName: 'INPUT', type: 'text' })).toBe('text')
    expect(keyTarget({ tagName: 'INPUT', type: 'range' })).toBe('text')
    expect(keyTarget({ tagName: 'SELECT' })).toBe('text')
    expect(keyTarget({ tagName: 'DIV', isContentEditable: true })).toBe('text')
    expect(keyTarget({ tagName: 'INPUT', type: 'checkbox' })).toBe('control')
    expect(keyTarget({ tagName: 'BUTTON' })).toBe('control')
  })

  it('move with the arrows, confirm with Enter and go back with Esc', () => {
    expect(navAction(press('ArrowUp'))).toBe('up')
    expect(navAction(press('ArrowDown'))).toBe('down')
    expect(navAction(press('ArrowLeft'))).toBe('left')
    expect(navAction(press('ArrowRight'))).toBe('right')
    expect(navAction(press('Enter'))).toBe('confirm')
    expect(navAction(press('Escape'))).toBe('back')
    expect(navAction(press('Delete'))).toBe('delete')
    expect(navAction(press('a'))).toBeNull()
  })

  it('leave Enter to a focused button, which clicks it, but still move with the arrows', () => {
    expect(navAction(press('Enter', { target: 'control' }))).toBeNull()
    expect(navAction(press('ArrowDown', { target: 'control' }))).toBe('down')
  })

  it('leave a text field its arrows, Enter and Delete, but Esc still goes back', () => {
    for (const key of ['ArrowLeft', 'Enter', 'Delete', 'a']) expect(navAction(press(key, { target: 'text' }))).toBeNull()
    expect(navAction(press('Escape', { target: 'text' }))).toBe('back')
  })

  it('repeat the arrows while held, but not Enter or Esc', () => {
    expect(navAction(press('ArrowDown', { repeat: true }))).toBe('down')
    expect(navAction(press('Enter', { repeat: true }))).toBeNull()
    expect(navAction(press('Escape', { repeat: true }))).toBeNull()
  })

  it('leave everything to an open dialog and to browser shortcuts', () => {
    expect(navAction(press('Escape', { dialogOpen: true }))).toBeNull()
    expect(navAction(press('ArrowDown', { modifier: true }))).toBeNull()
  })

  it('wrap around a list', () => {
    expect(wrap(0, -1, 4)).toBe(3)
    expect(wrap(3, 1, 4)).toBe(0)
    expect(wrap(1, 2, 4)).toBe(3)
    expect(wrap(0, 1, 0)).toBe(0)
  })
})

describe('the screen flow', () => {
  it('goes from the title to the fire, and back to the fire from everywhere after', () => {
    expect(backFrom('title')).toBeNull()
    expect(backFrom('loading')).toBeNull()
    expect(backFrom('select')).toBe('title')
    for (const screen of ['create', 'login', 'world'] as const) expect(backFrom(screen)).toBe('select')
  })

  it('has no realm list or offline/online screen: that choice is made at the fire', () => {
    expect(FLOW).toEqual(['title', 'select', 'create', 'login', 'loading', 'world'])
  })
})
