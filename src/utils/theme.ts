import { ref } from 'vue'
import type { Theme } from '@/types/api'
import { STORAGE_KEYS } from '@/utils/contract'

export const resolvedTheme = ref<'light' | 'dark'>('light')

export const themePreference = ref<Theme>('system')

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

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

  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')

    const handler = () => {
      if (themePreference.value === 'system') applyTheme('system')
    }
    if (mq.addEventListener) mq.addEventListener('change', handler)
    else if (mq.addListener) mq.addListener(handler)
  }
}

