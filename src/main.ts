import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// Element Plus 的暗色变量表。它配合 <html class="dark"> 生效，
// 会把所有 --el-* 变量换成暗色值（那个 class 由 utils/theme.ts 负责挂）。
import 'element-plus/theme-chalk/dark/css-vars.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import App from './App.vue'
import router from './router'
import { initTheme } from './utils/theme'

// 挂载之前先把主题定下来，避免"先亮一下再变暗"的闪烁（FOUC）。
// 契约 U2 要求主题在换设备登录后也保持，所以这个值之后还会被后端的 theme 覆盖。
initTheme()

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
