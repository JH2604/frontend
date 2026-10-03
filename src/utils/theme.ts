// =====================================================================
// 主题（契约 1.7 的枚举 light / dark / system，U2 可以改）
//
// 【它在哪里】
//   main.ts                    启动时调 initTheme()（必须在 mount 之前，否则闪一下）
//   views/user/Settings.vue    用户在"用户中心"切换主题
//   api/user.ts                登录后 / U1 拉取后，用后端的 theme 覆盖本地
//
// 【实现原理，只有一句话】
//   给 <html> 挂一个 `dark` class，全站的颜色变量就都变了。
//
//   具体分两半：
//     ① Element Plus 的暗色：靠 element-plus/theme-chalk/dark/css-vars.css
//        （在 main.ts 里 import），它定义了 html.dark 下的所有 --el-* 变量
//     ② 我们自己的颜色：靠 assets/main.css 里的 html.dark 段，
//        换掉 --color-bg / --color-text 这些自定义令牌
//
//   C++ 类比：这不是"每个控件都去改颜色"，而是【换一整套全局常量表】。
//   谁引用了这套常量，谁就自动跟着变。
//
// 【为什么 localStorage 里还要存一份】
//   刷新页面时先用本地这份立刻出正确颜色，不等后端 —— 不然会闪。
//   契约 U2 原话："建议前端先改本地状态并立即生效，再异步调用本接口保存"。
//
// 【前端名词】
//   设计令牌（design token） 把颜色/圆角/间距起个变量名统一管理
//   FOUC                     页面先闪一下默认样式再变
//   prefers-color-scheme     浏览器提供的"系统当前是深色还是浅色"
// =====================================================================

import { ref } from 'vue'
import type { Theme } from '@/types/api'
import { STORAGE_KEYS } from '@/utils/contract'

/**
 * 主题（契约 1.7 枚举：light / dark / system，U2 可以改）。
 *
 * 实现方式：给 `<html>` 挂一个 `dark` class。
 * 为什么这么做？因为 Element Plus 官方的暗色方案就是
 * `html.dark` + `element-plus/theme-chalk/dark/css-vars.css`
 * （那个文件在 main.ts 里 import 了），它会把所有 `--el-*` 变量换成暗色值。
 * 我们自己只要把 `--color-bg` 这类自定义令牌也跟着换一下就行
 * （见 assets/main.css 里的 `html.dark` 段）。
 *
 * C++ 类比：这不是"每个控件都去改颜色"，而是换一整套全局常量表 ——
 * 谁引用了这套常量，谁就自动跟着变。
 */

/** 当前生效的主题（'light' 或 'dark'，system 会先被解析成其中之一） */
export const resolvedTheme = ref<'light' | 'dark'>('light')

/** 用户在设置页选的那一项（可能是 'system'） */
export const themePreference = ref<Theme>('system')

/** 系统当前是不是暗色 */
function systemPrefersDark(): boolean {
  // 有的环境（老浏览器 / 测试环境）没有 matchMedia，兜底成亮色
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** 把 'system' 解析成实际的 light / dark */
function resolve(pref: Theme): 'light' | 'dark' {
  if (pref === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return pref
}

/**
 * 应用主题到 DOM。
 *
 * ⚠️ 只改 class，不改任何组件的样式 ——
 *    这正是用"设计令牌 + 一个 class"而不是"逐组件改色"的价值。
 */
export function applyTheme(pref: Theme): void {
  themePreference.value = pref
  const actual = resolve(pref)
  resolvedTheme.value = actual

  const root = document.documentElement
  if (actual === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')

  // 让浏览器原生控件（滚动条、表单控件）也跟着改，不然暗色页面上
  // 会出现一条亮色滚动条，很突兀
  root.style.colorScheme = actual
}

/**
 * 用户手动选主题时调用。
 *
 * 契约原文："主题切换建议前端先改本地状态并立即生效，再异步调用本接口保存，
 * 这样换设备登录时也能保持主题。"
 * → 所以这里**只管本地立即生效**，调接口保存是调用方（Settings.vue）的事，
 *    而且那个调用是异步的、失败了也不该回滚界面（顶多提示"保存失败"）。
 */
export function setThemeLocal(pref: Theme): void {
  localStorage.setItem(STORAGE_KEYS.theme, pref)
  applyTheme(pref)
}

/**
 * 启动时初始化：先用 localStorage 里的值（刷新页面不闪），
 * 登录后会由后端返回的 theme 覆盖（见 syncThemeFromServer）。
 */
export function initTheme(): void {
  const saved = localStorage.getItem(STORAGE_KEYS.theme) as Theme | null
  applyTheme(saved ?? 'system')

  // 'system' 时要跟着系统变：监听系统主题变化
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    // addEventListener 在老 Safari 上不存在，用 addListener 兜底
    const handler = () => {
      if (themePreference.value === 'system') applyTheme('system')
    }
    if (mq.addEventListener) mq.addEventListener('change', handler)
    else if (mq.addListener) mq.addListener(handler)
  }
}

/**
 * 后端返回的 theme 覆盖本地。
 * 登录成功 / U1 拉取成功后调用。
 */
export function syncThemeFromServer(pref: Theme | null | undefined): void {
  if (pref !== 'light' && pref !== 'dark' && pref !== 'system') return
  localStorage.setItem(STORAGE_KEYS.theme, pref)
  applyTheme(pref)
}
