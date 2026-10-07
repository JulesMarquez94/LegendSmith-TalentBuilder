import type { CSSProperties } from 'react'
import { artUrl } from '../art.ts'

interface Props {
  /** Sub-folder of LegendSmith/Art. */
  folder?: string
  /** File name without .png. */
  icon?: string
  /** Name the placeholder's initials come from. */
  label: string
  tint?: string
  className?: string
}

// "Army of the Dead" → "AD", "Fade" → "F"
const initials = (name: string) => {
  const words = name.split(/\s+/).filter((w) => /^[A-Z]/.test(w))
  return (words.length > 0 ? words : [name]).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

/** A PNG from LegendSmith/Art, or a tinted tile with the name's initials while there's no art yet. */
export function ArtIcon({ folder, icon, label, tint = '#8a8a8a', className = '' }: Props) {
  const url = folder !== undefined && icon !== undefined ? artUrl(folder, icon) : undefined
  if (url) return <img className={`art ${className}`} src={url} alt="" draggable={false} />
  return (
    <span className={`art art--placeholder ${className}`} style={{ '--tint': tint } as CSSProperties} aria-hidden="true">
      <span>{initials(label)}</span>
    </span>
  )
}
