import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://sola-backend-api.essxm01.workers.dev',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://sola-backend-api.essxm01.workers.dev',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
