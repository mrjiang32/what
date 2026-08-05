import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 目标后端服务就是3000端口
        changeOrigin: true,
        // 如果后端接口本身带 /api，不要rewrite；不带就开启rewrite
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})