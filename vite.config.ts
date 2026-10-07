import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Serve from a sub-path when hosted inside the portfolio, e.g. BASE_PATH=/drive-or-ride/ npm run build
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
