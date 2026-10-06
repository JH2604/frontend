import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // vueDevTools 只在开发时启用：
  // 它是调试工具，打进生产包除了增加体积，还会在线上暴露一个 __devtools__ 路径。
  // 部署到公网服务器时不应该带它。
  plugins: [vue(), vueJsx(), ...(mode === 'development' ? [vueDevTools()] : [])],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // 所有 /api 开头的请求，转发到后端
      // ⚠️ 这个代理【只在 npm run dev 时有效】。
      //    打包后的 dist/ 是纯静态文件，接口地址用相对路径 /api/v1，
      //    由部署方的 nginx 反向代理到后端 —— 所以这里不用改。
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
}))
