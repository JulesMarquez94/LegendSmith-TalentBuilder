import { useState, type SyntheticEvent } from 'react'

/** Tracks which element is hovered or focused, and what it stands for, so a tooltip can follow it. */
export function useHoverTarget<T>() {
  const [hover, setHover] = useState<{ el: HTMLElement; target: T } | null>(null)

  const hoverOn = (target: T) => {
    const show = (e: SyntheticEvent<HTMLElement>) => setHover({ el: e.currentTarget, target })
    const hide = () => setHover(null)
    return { onMouseEnter: show, onFocus: show, onMouseLeave: hide, onBlur: hide }
  }

  return [hover, hoverOn] as const
}
