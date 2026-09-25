import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative paths in the build ("./assets/..."), so Electron can load
  // dist/index.html straight from disk with file:// (Step 7)
  base: './',
  server: {
    // Fixed address, so the backend's CORS setting (Step 6) can name it exactly
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
