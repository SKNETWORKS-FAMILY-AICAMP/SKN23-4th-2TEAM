import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        timeout: 60000,     // 프록시 타임아웃 60초로 증가 (부하 대비)
        proxyTimeout: 60000, // 프록시 타임아웃 60초로 증가
      }
    }
  },
})
