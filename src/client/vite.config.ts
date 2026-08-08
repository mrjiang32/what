import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000", // 后端服务器地址
        changeOrigin: true, // 修改 Host 头为 target
      },
    },
  },
  plugins: [react(), tailwindcss()],
});
