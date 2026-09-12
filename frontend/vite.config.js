import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // split vendor bundles so the chart library is cached independently
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          icons: ['lucide-react']
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true, ws: true },
      '/evidence': { target: 'http://localhost:8000', changeOrigin: true }
    }
  }
})
