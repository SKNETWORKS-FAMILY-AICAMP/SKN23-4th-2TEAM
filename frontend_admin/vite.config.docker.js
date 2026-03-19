import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Docker Compose 환경 전용 Vite 설정
// 컨테이너 내부에서는 localhost 대신 docker-compose service name 사용
// 사용법: Dockerfile.frontend 의 CMD에서 --config 옵션으로 지정
// → "vite --config vite.config.docker.js --host 0.0.0.0 --port 5173"

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/admin': {
        target: 'http://backend-hub:8000',   // ← service name
        changeOrigin: true,
      },
      '/api/v1/dashboard': {
        target: 'http://backend-hub:8000',
        changeOrigin: true,
      },
      '/api/v1/logs': {
        target: 'http://backend-hub:8000',
        changeOrigin: true,
      },
      '/api/v1/admin-ai': {
        target: 'http://backend-worker-api:8001',  // ← service name
        changeOrigin: true,
      },
      '/api/v1/rag': {
        target: 'http://backend-worker-api:8001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(
              JSON.stringify({
                detail: 'proxy_error',
                error: err instanceof Error ? err.message : String(err),
              })
            );
          });
        },
      },
    },
  },
})
