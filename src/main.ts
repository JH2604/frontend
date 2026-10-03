import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
// 中文语言包：Element Plus 自带的日期选择器、分页器等会显示中文
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import App from './App.vue'
import router from './router'
import { initTheme } from './utils/theme'

initTheme()

const app = createApp(App)

// Pinia：全局状态（登录信息存在 stores/user.ts 里）
app.use(createPinia())

// Router：管"地址栏路径 → 显示哪个页面"
app.use(router)

app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
