import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Docker Compose 환경 전용 Vite 설정 (Worker)
// 컨테이너 내부에서 localhost 대신 docker-compose service name 사용

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://backend-worker-api:8001',  // ← service name
        changeOrigin: true,
        timeout: 60000,
        proxyTimeout: 60000,
      }
    }
  },
})
