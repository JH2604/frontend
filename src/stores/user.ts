import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { Role, STORAGE_KEYS, type RoleValue } from '@/utils/contract'
import { clearCache } from '@/utils/cache'

/**
 * 角色只有两种（文档 1.7 枚举）：
 *   'student' 学生 / 'admin' 管理员
 * 以前我们写成了 'user'，和后端对不上，已修正。
 */
export type UserRole = RoleValue

export interface UserInfo {
  token: string
  /**
   * 刷新令牌。只在调用 A4（POST /auth/refresh）时用到，
   * 绝不放进任何请求的 Authorization 头。
   * 登录接口改成返回 access_token + refresh_token 之后这里才有值。
   */
  refreshToken?: string
  role: UserRole
  username: string
  /**
   * 当前用户的数字 id（契约 A2 里 user.id）。
   *
   * 用在哪：判断"这条记录是不是我的" —— 消息模块要区分
   * "这条私信是我发的还是收到的"，U6 要判断"是不是我在看自己的主页"。
   * 取不到就是 0，表示"不知道我是谁"，权限判断按保守处理。
   */
  userId: number
}

// 登录状态集中放这里。刷新页面后从 localStorage 恢复。
//
// ⚠️ localStorage 的 key 名统一从 contract.ts 的 STORAGE_KEYS 取。
// 以前这里和 request.ts / router 守卫各写各的字符串，
// 只要有一个字打错就会出现"明明登录了却被踢回登录页"这种玄学 bug。
export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem(STORAGE_KEYS.token) ?? '')
  const role = ref<UserRole>((localStorage.getItem(STORAGE_KEYS.role) as UserRole) || Role.STUDENT)
  const username = ref(localStorage.getItem(STORAGE_KEYS.username) ?? '')
  // localStorage 里存的永远是字符串，所以读出来要转成数字。
  // Number('') 是 0，Number('abc') 是 NaN，所以这里用 || 0 把 NaN 也兜成 0。
  const userId = ref(Number(localStorage.getItem(STORAGE_KEYS.userId)) || 0)

  const isLogin = computed(() => !!token.value)
  const isAdmin = computed(() => role.value === 'admin')

  // 登录成功后调用：内存 + localStorage 一起写
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

    // 后端还没定最终字段名，可能暂时不返回 refresh_token；
    // 有就存，没有就不动，别把已有的一起清掉。
    if (info.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.refreshToken, info.refreshToken)
    }

    // 换了账号，之前账号缓存下来的列表数据必须作废
    clearCache()
  }

  // 退出登录：内存 + localStorage 一起清，缓存也要清
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

    // 不清缓存的话，换个账号登录还能看到上一个人看过的物品列表
    clearCache()
  }

  return { token, role, username, userId, isLogin, isAdmin, setLogin, logout }
})
