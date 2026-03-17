import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/v1/dashboard': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/v1/logs': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/v1/admin-ai': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api/v1/rag': {
        target: 'http://127.0.0.1:8001',
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
