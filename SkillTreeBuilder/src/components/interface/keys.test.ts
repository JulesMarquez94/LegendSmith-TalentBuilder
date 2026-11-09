import { describe, expect, it } from 'vitest'
import { backFrom, flowFor } from './flow.ts'
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
  it('logs in and picks a realm only online', () => {
    expect(flowFor('online')).toContain('realm')
    expect(flowFor('offline')).not.toContain('login')
  })

  it('goes back one screen at a time, to the realm list or the mode choice from the characters', () => {
    expect(backFrom('title', 'offline')).toBeNull()
    expect(backFrom('loading', 'online')).toBeNull()
    expect(backFrom('select', 'offline')).toBe('mode')
    expect(backFrom('select', 'online')).toBe('realm')
    expect(backFrom('realm', 'online')).toBe('login')
    expect(backFrom('create', 'online')).toBe('select')
    // Every step back stays on the mode's path.
    for (const mode of ['offline', 'online'] as const) {
      for (const screen of flowFor(mode)) {
        const back = backFrom(screen, mode)
        if (back) expect(flowFor(mode)).toContain(back)
      }
    }
  })
})
