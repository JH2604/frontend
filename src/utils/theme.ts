import { ref } from 'vue'
import type { Theme } from '@/types/api'
import { STORAGE_KEYS } from '@/utils/contract'

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

export function applyTheme(pref: Theme): void {
  themePreference.value = pref
  const actual = resolve(pref)
  resolvedTheme.value = actual

  const root = document.documentElement
  if (actual === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')

  root.style.colorScheme = actual
}

export function setThemeLocal(pref: Theme): void {
  localStorage.setItem(STORAGE_KEYS.theme, pref)
  applyTheme(pref)
}

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

export function syncThemeFromServer(pref: Theme | null | undefined): void {
  if (pref !== 'light' && pref !== 'dark' && pref !== 'system') return
  localStorage.setItem(STORAGE_KEYS.theme, pref)
  applyTheme(pref)
}
