import type { Gear } from './game/gear.ts'
import type { Loadout } from './talents/loadout.ts'

// A build travels in the page's address, after "#b=": the loadout and gear as JSON, in URL-safe
// base64. Opening the link loads that build; anything in it that doesn't fit the tree data is dropped
// the same way as a build saved in this browser (see saved.ts).

export interface Build {
  loadout: Loadout
  gear: Gear
}

const PREFIX = '#b='

const toBase64Url = (text: string) => {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (code: string) => {
  const binary = atob(code.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}

/** "#b=…": the build, ready to put after the page's address. */
export const buildHash = (build: Build) => PREFIX + toBase64Url(JSON.stringify(build))

/** The build in an address's hash, or null when it has none (or it's garbled). Not checked against the trees yet. */
export function buildFromHash(hash: string): Partial<Build> | null {
  if (!hash.startsWith(PREFIX)) return null
  try {
    const build: unknown = JSON.parse(fromBase64Url(hash.slice(PREFIX.length)))
    return build && typeof build === 'object' ? (build as Partial<Build>) : null
  } catch {
    return null
  }
}

/** This page's address with the build in it: the link to share. */
export const shareUrl = (build: Build) => `${location.origin}${location.pathname}${location.search}${buildHash(build)}`
