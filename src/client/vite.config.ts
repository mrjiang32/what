import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
      'react-dom/client': path.resolve('./node_modules/react-dom/client'),
    },
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
