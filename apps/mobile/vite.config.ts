import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envDir: '../..', // shared .env at the repo root
  server: { port: 5173 },
})
