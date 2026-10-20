import vue from '@vitejs/plugin-vue'     // Vite 的 Vue 3 单文件组件支持插件
import { defineConfig } from 'vite'     // defineConfig 提供更好的类型提示和智能补全

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],                       // 启用 Vue 插件，否则 .vue 文件无法编译
  server: {
    port: 5173,                           // 前端开发服务器端口
    proxy: {
      '/api': {                           // 开发时访问 /api/* 会被转发到后端 Express
        target: 'http://localhost:3001',   // 后端 Express 默认监听 3001，和 server/index.js 里的 PORT 对齐
        changeOrigin: true,               // 改写 Host 头为目标地址，避免后端做 Host 校验时拒绝
      },
    },
  },
  build: {
    outDir: 'dist',                       // 生产构建产物输出目录，部署时 Nginx 把根目录指向这里
  },
})
