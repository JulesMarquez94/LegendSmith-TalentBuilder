import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, normalizePath, searchForWorkspaceRoot } from 'vite'

// Art is read straight from LegendSmith/Art, so new trees only need their PNGs
// dropped in there — nothing is copied into this project.
const artDir = normalizePath(fileURLToPath(new URL('../Art', import.meta.url)))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@art': artDir },
  },
  server: {
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), artDir] },
  },
})
