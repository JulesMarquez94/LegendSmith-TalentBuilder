// Every PNG under LegendSmith/Art (see the @art alias in vite.config.ts), looked up
// by "<folder>/<file name>" case-insensitively, so tree data can name art as it is on disk.
const files = import.meta.glob<string>('@art/**/*.png', { eager: true, query: '?url', import: 'default' })

const urls = new Map<string, string>()
for (const [path, url] of Object.entries(files)) {
  const match = /([^/]+\/[^/]+)\.png$/i.exec(path)
  if (match) urls.set(match[1].toLowerCase(), url)
}

export function artUrl(folder: string, name: string): string | undefined {
  return urls.get(`${folder}/${name}`.toLowerCase())
}

export function hasArt(folder: string, name: string): boolean {
  return artUrl(folder, name) !== undefined
}
