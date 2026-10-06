import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { Role, STORAGE_KEYS, type RoleValue } from '@/utils/contract'
import { clearCache } from '@/utils/cache'

export type UserRole = RoleValue

export interface UserInfo {
  token: string

  refreshToken?: string
  role: UserRole
  username: string

  userId: number
}

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem(STORAGE_KEYS.token) ?? '')

  const role = ref<UserRole>((localStorage.getItem(STORAGE_KEYS.role) as UserRole) || Role.STUDENT)

  const username = ref(localStorage.getItem(STORAGE_KEYS.username) ?? '')

  const userId = ref(Number(localStorage.getItem(STORAGE_KEYS.userId)) || 0)

  const isLogin = computed(() => !!token.value)
  const isAdmin = computed(() => role.value === 'admin')

  function setLogin(info: UserInfo) {
    token.value = info.token
    role.value = info.role
    username.value = info.username
    userId.value = info.userId

    localStorage.setItem(STORAGE_KEYS.token, info.token)
    localStorage.setItem(STORAGE_KEYS.role, info.role)
    localStorage.setItem(STORAGE_KEYS.username, info.username)

    localStorage.setItem(STORAGE_KEYS.userId, String(info.userId))

    if (info.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.refreshToken, info.refreshToken)
    }

    clearCache()
  }

  function logout() {
    token.value = ''
    role.value = Role.STUDENT
    username.value = ''
    userId.value = 0

    localStorage.removeItem(STORAGE_KEYS.token)
    localStorage.removeItem(STORAGE_KEYS.refreshToken)
    localStorage.removeItem(STORAGE_KEYS.role)
    localStorage.removeItem(STORAGE_KEYS.username)
    localStorage.removeItem(STORAGE_KEYS.userId)

    clearCache()
  }

  return { token, role, username, userId, isLogin, isAdmin, setLogin, logout }
})
