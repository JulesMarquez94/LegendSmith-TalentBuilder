import { useEffect, useRef } from 'react'
import { keyTarget, navAction, type NavAction } from './keys.ts'

export type NavHandlers = Partial<Record<NavAction, () => void>>

/**
 * Arrows, Enter, Esc and Delete for the screen on show, while the Interface view is open. Only the
 * actions a screen hands in are taken: other keys (and these, when it has no use for them) are left alone.
 */
export function useNavKeys(active: boolean, handlers: NavHandlers) {
  const latest = useRef(handlers)
  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    if (!active) return
    const down = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const action = navAction({
        key: e.key,
        target: keyTarget(e.target),
        modifier: e.ctrlKey || e.altKey || e.metaKey,
        repeat: e.repeat,
        dialogOpen: document.querySelector('dialog[open]') !== null,
      })
      const handler = action ? latest.current[action] : undefined
      if (!handler) return
      // Arrows would scroll the page as well.
      e.preventDefault()
      handler()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [active])
}
