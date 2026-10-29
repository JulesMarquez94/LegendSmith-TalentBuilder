const EDGE = 8
const GAP = 10

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, max))

/**
 * Puts a fixed element level with `anchor`, beside its nearest `[data-tooltip-side]` ancestor (the
 * tree panel, as in the deck) so it never covers other talents. Falls back to beside the anchor
 * itself, then below or above it, when the screen is too narrow.
 */
export function placeBeside(el: HTMLElement, anchor: HTMLElement) {
  el.style.left = '0px'
  const tip = el.getBoundingClientRect()
  const a = anchor.getBoundingClientRect()
  const side = anchor.closest('[data-tooltip-side]')?.getBoundingClientRect() ?? a
  const vw = document.documentElement.clientWidth
  const vh = document.documentElement.clientHeight
  const fits = (x: number) => x >= EDGE && x + tip.width <= vw - EDGE
  let left = [side.right + GAP, side.left - GAP - tip.width, a.right + GAP, a.left - GAP - tip.width].find(fits)
  let top = a.top
  if (left === undefined) {
    left = clamp(a.left + a.width / 2 - tip.width / 2, EDGE, vw - EDGE - tip.width)
    top = a.bottom + GAP + tip.height > vh - EDGE ? a.top - GAP - tip.height : a.bottom + GAP
  }
  top = clamp(top, EDGE, vh - EDGE - tip.height)
  el.style.left = `${left}px`
  el.style.top = `${top}px`
  el.style.visibility = 'visible'
}
