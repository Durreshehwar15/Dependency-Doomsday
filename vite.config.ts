
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/health/': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/health/, '/health'),
      },
      '/api/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: () => '/health',
      },
      '/api/simulate-failure/': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/simulate-failure/, '/simulate-failure'),
      },
      
'/api/monitor-check': {
  target: 'http://localhost:3001',
  changeOrigin: true,
  rewrite: () => '/monitor-check',
},

      '/api/simulate-failure': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: () => '/simulate-failure',
      },
      '/api/restore/': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/restore/, '/restore'),
      },
      '/api/restore': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: () => '/restore',
      },
       '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
    },
  },
})
