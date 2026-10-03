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
  // ---------- 状态（会被界面盯着的数据） ----------

  const token = ref(localStorage.getItem(STORAGE_KEYS.token) ?? '')

  const role = ref<UserRole>((localStorage.getItem(STORAGE_KEYS.role) as UserRole) || Role.STUDENT)

  const username = ref(localStorage.getItem(STORAGE_KEYS.username) ?? '')

  const userId = ref(Number(localStorage.getItem(STORAGE_KEYS.userId)) || 0)

  const isLogin = computed(() => !!token.value) // !! 把任意值变成布尔
  const isAdmin = computed(() => role.value === 'admin')

  // ---------- 动作（会修改状态的方法） ----------

  function setLogin(info: UserInfo) {
    token.value = info.token
    role.value = info.role
    username.value = info.username
    userId.value = info.userId

    localStorage.setItem(STORAGE_KEYS.token, info.token)
    localStorage.setItem(STORAGE_KEYS.role, info.role)
    localStorage.setItem(STORAGE_KEYS.username, info.username)
    // localStorage 只能存字符串，数字会自动转过去，读的时候再转回来
    localStorage.setItem(STORAGE_KEYS.userId, String(info.userId))

    if (info.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.refreshToken, info.refreshToken)
    }

    clearCache()
  }

  /** 退出登录：内存 + localStorage 一起清，缓存也要清 */
  function logout() {
    token.value = ''
    role.value = Role.STUDENT // ⚠️ 注意回到 STUDENT，不是保留原角色
    username.value = ''
    userId.value = 0

    localStorage.removeItem(STORAGE_KEYS.token)
    localStorage.removeItem(STORAGE_KEYS.refreshToken)
    localStorage.removeItem(STORAGE_KEYS.role)
    localStorage.removeItem(STORAGE_KEYS.username)
    localStorage.removeItem(STORAGE_KEYS.userId)

    // 不清缓存的话，换个账号登录还能看到上一个人看过的物品列表
    clearCache()
  }

  return { token, role, username, userId, isLogin, isAdmin, setLogin, logout }
})
