import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  // '/' for a root-served build; the GitHub Pages build sets
  // VITE_BASE_PATH=/labstore/ because Pages serves the repo under a subpath.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  resolve: {
    // The "@/..." alias for src/ (mirrors jsconfig paths).
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
