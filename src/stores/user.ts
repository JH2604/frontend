// =====================================================================
// 全局登录态（Pinia）
//
// 【它在哪里】
//   main.ts 里 app.use(createPinia()) 装上 Pinia
//      └─ 本文件定义了一个"仓库"（store）★ 你在这里
//           └─ 任何页面都能 useUserStore() 拿到同一份数据
//
// 【为什么要用"全局仓库"而不是普通变量】
//   页头要显示用户名、消息页要判断"这条是不是我发的"、请求层要贴令牌 ——
//   这些数据要跨好几个组件共享。
//   如果在 LoginView.vue 里声明，别的组件根本拿不到。
//
// 【C++ 类比】
//   如果你在算法题里写过多文件程序：
//     store ≈ 一个全局变量 + 一组操作它的函数（而且是线程安全的单例）
//   区别是：Vue 的这个"全局变量"是响应式的，改了之后界面自动更新。
//
// 【前端名词】
//   Pinia         Vue 官方的状态管理库（"状态"就是"数据"）
//   store（仓库）  用 defineStore 定义出来的一份全局数据
//   localStorage  浏览器的"本地硬盘"，关掉浏览器再打开还在（只存字符串）
//   响应式         数据变了界面自动变
// =====================================================================

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { Role, STORAGE_KEYS, type RoleValue } from '@/utils/contract'
import { clearCache } from '@/utils/cache'

/**
 * 角色只有两种（契约 1.7 枚举）：
 *   'student' 学生 / 'admin' 管理员
 * 以前我们写成了 'user'，和后端对不上，已修正。
 *
 * 【TypeScript 语法】
 *   RoleValue 是 contract.ts 里用 `as const` 从一个常量对象推导出来的联合类型，
 *   实际等价于 `'student' | 'admin'`。
 *   这比 C++ 的 enum 更轻量：运行时就是普通字符串，但编译期有检查。
 */
export type UserRole = RoleValue

export interface UserInfo {
  token: string
  /**
   * 刷新令牌。只在调用 A4（POST /auth/refresh）时用到，
   * 绝不放进任何请求的 Authorization 头。
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

// =====================================================================
// defineStore('user', () => { ... })
//
// 第一个参数 'user' 是这个 store 的【唯一名字】，用来在开发者工具里区分。
// 第二个参数是一个函数，里面写"这个仓库里有什么"，最后 return 出去。
//
// ⚠️ 名字和 return 的内容必须对应：
//    return 里没写的变量，外面就拿不到。
//    （和"类只暴露 public 成员"是一个意思）
// =====================================================================
export const useUserStore = defineStore('user', () => {
  // ---------- 状态（会被界面盯着的数据） ----------

  // 初始值从 localStorage 读 —— 这样刷新页面（F5）"登录状态还在"。
  // `?? ''` 是空值合并：读不到就给空串，避免后面拿 null 去拼接。
  const token = ref(localStorage.getItem(STORAGE_KEYS.token) ?? '')

  // `as UserRole` 是类型断言：localStorage 读出来是普通字符串，
  // 我们告诉 TS "当成 UserRole 用"。后面的 `|| Role.STUDENT` 是兜底：
  // 读不到（首次访问）就按学生处理 —— 权限判断永远往安全一侧倒（fail-closed）。
  const role = ref<UserRole>((localStorage.getItem(STORAGE_KEYS.role) as UserRole) || Role.STUDENT)

  const username = ref(localStorage.getItem(STORAGE_KEYS.username) ?? '')

  // localStorage 里存的永远是字符串，所以读出来要转成数字。
  //   Number('')    是 0
  //   Number('abc') 是 NaN
  // 所以用 `|| 0` 把 NaN 也兜成 0。
  const userId = ref(Number(localStorage.getItem(STORAGE_KEYS.userId)) || 0)

  // ---------- 计算属性（由上面几个算出来的"只读视图"） ----------
  //
  // computed 的特点：**它不是一个函数，而是一个会跟着源数据自动更新的值**。
  // 读的时候当普通变量用（注意：在 <script> 里要 .value，模板里不用）。
  //
  // C++ 类比：像是"引用"或"表达式模板"，你读它的时候才求值，源变了它也跟着变。
  const isLogin = computed(() => !!token.value) // !! 把任意值变成布尔
  const isAdmin = computed(() => role.value === 'admin')

  // ---------- 动作（会修改状态的方法） ----------

  /**
   * 登录成功后调用：内存 + localStorage 一起写。
   *
   * ⚠️ 为什么两处都要写？
   *   内存（ref）：界面要靠它即时更新
   *   localStorage：刷新页面后要靠它恢复
   *   只写内存 -> 刷新就退出登录了
   *   只写 localStorage -> 界面不会立刻变
   */
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

    // 后端可能暂时不返回 refresh_token；有就存，没有就不动，
    // 别把已有的一起清掉（否则下次刷新令牌就失败了）。
    if (info.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.refreshToken, info.refreshToken)
    }

    // 换了账号，之前账号缓存下来的列表数据必须作废。
    // 不清的话，登录 A 账号可能看到 B 账号上次看过的数据 —— 属于隐私问题。
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

  // ⚠️ 必须把要暴露的东西 return 出去，外面才能用。
  //    没写在这里面的（比如上面那些中间变量）外部拿不到 ——
  //    相当于 private 成员。
  return { token, role, username, userId, isLogin, isAdmin, setLogin, logout }
})

// =====================================================================
// 【外面怎么用】任意 .vue 文件里：
//
//   import { useUserStore } from '@/stores/user'
//   const userStore = useUserStore()
//
//   userStore.username        // 读
//   userStore.isLogin         // 读计算属性
//   userStore.setLogin(res)   // 调动作
//
// ⚠️ 两个常见坑：
//   1. 不要解构！`const { username } = useUserStore()` 会丢掉响应式
//      （解构出来的只是个快照，之后变化它不会更新）。
//      要用 storeToRefs()，或者干脆一直写 userStore.username。
//   2. useUserStore() 必须在"组件或 setup 里"调用，不能在模块顶层裸调，
//      因为 Pinia 要先被 app.use() 装上。
// =====================================================================
