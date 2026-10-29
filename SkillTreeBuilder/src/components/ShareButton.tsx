import { useEffect, useState } from 'react'
import { shareUrl, type Build } from '../share.ts'

/** Copies a link to this build: whoever opens it gets the same artifact, level, abilities, talents and gear. */
export function ShareButton({ build }: { build: Build }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    const url = shareUrl(build)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // No clipboard (an old browser, or a page without permission): show the link to copy by hand.
      window.prompt('Copy this link to share the build:', url)
    }
  }

  return (
    <button type="button" className="btn btn--lg" onClick={copy} aria-live="polite">
      {copied ? 'Link copied' : 'Copy build link'}
    </button>
  )
}
