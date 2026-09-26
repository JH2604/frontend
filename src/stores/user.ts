import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type UserRole = 'user' | 'admin'

export interface UserInfo {
  token: string
  role: UserRole
  username: string
}

// 登录状态集中放这里。刷新页面后从 localStorage 恢复
export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') ?? '')
  const role = ref<UserRole>((localStorage.getItem('role') as UserRole) || 'user')
  const username = ref(localStorage.getItem('username') ?? '')

  const isLogin = computed(() => !!token.value)
  const isAdmin = computed(() => role.value === 'admin')

  // 登录成功后调用：内存 + localStorage 一起写
  function setLogin(info: UserInfo) {
    token.value = info.token
    role.value = info.role
    username.value = info.username

    localStorage.setItem('token', info.token)
    localStorage.setItem('role', info.role)
    localStorage.setItem('username', info.username)
  }

  // 退出登录：内存 + localStorage 一起清
  function logout() {
    token.value = ''
    role.value = 'user'
    username.value = ''

    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('username')
  }

  return { token, role, username, isLogin, isAdmin, setLogin, logout }
})
