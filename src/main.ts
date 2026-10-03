// =====================================================================
// 程序入口（相当于 C++ 的 main()）
//
// 【它在哪里】
//   index.html  ← 只有一个空的 <div id="app">
//      └─ 本文件 ★ 你在这里：把 Vue 应用挂到那个 div 上
//           └─ App.vue（根组件）→ RouterView → 各种页面
//
// 【这个文件按顺序干 4 件事】
//   1. 引样式（CSS）
//   2. 挂主题（暗色/亮色，必须在 mount 之前，否则会闪一下白）
//   3. 装插件（Pinia / Router / Element Plus）
//   4. mount 挂载到 index.html 的 #app 上
//
// 【前端名词】
//   app.use(x)  给应用装一个"外挂能力"，x 叫插件
//   mount(选择器) 把 Vue 应用挂到页面上的某个容器里
//   FOUC        "先闪一下默认样式再变"的现象（所以主题要提前挂）
// =====================================================================

// ---------- 1. 样式 ----------
// 顺序有讲究：
//   先我们自己的 main.css（定义设计令牌 --color-*）
//   再 Element Plus 的样式（它也有自己的变量 --el-*）
//   最后暗色变量表（覆盖上面两者的变量值）
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// Element Plus 的暗色变量表。它配合 <html class="dark"> 生效，
// 会把所有 --el-* 变量换成暗色值（那个 class 由 utils/theme.ts 负责挂）。
import 'element-plus/theme-chalk/dark/css-vars.css'
// 中文语言包：Element Plus 自带的日期选择器、分页器等会显示中文
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import App from './App.vue'
import router from './router'
import { initTheme } from './utils/theme'

// ---------- 2. 主题 ----------
// 必须在 mount 之前调用！
// 如果放在 mount 之后，页面会先按亮色渲染一帧，再变成暗色 —— 就是"闪一下"。
// 契约 U2 要求主题在换设备登录后也保持，所以这个值之后还会被后端的 theme 覆盖。
initTheme()

// ---------- 3. 装插件 ----------
// createApp(App)：用根组件造一个 Vue 应用实例
const app = createApp(App)

// Pinia：全局状态（登录信息存在 stores/user.ts 里）
app.use(createPinia())

// Router：管"地址栏路径 → 显示哪个页面"
app.use(router)

// Element Plus：别人写好的按钮/表格/弹窗组件库
// { locale: zhCn } 让它说中文
app.use(ElementPlus, { locale: zhCn })

// ---------- 4. 挂载 ----------
// 把整个应用画进 index.html 里那个 <div id="app"></div>
// ⚠️ 这一行必须在最后：前面的插件都装好了才能开始渲染。
app.mount('#app')
