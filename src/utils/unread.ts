import { onMounted, onUnmounted, ref } from 'vue'
import { getUnreadCount } from '@/api/message'
import { useUserStore } from '@/stores/user'

export const unreadTotal = ref(0)

/** 轮询间隔（毫秒）。契约 M1 建议"每 30 秒轮询一次"。 */
const POLL_INTERVAL_MS = 30000

/** 直接设一个值（M5 的返回里带了最新的 unread_total，用它最省一次请求） */
export function setUnreadTotal(n: number): void {
  // 兜底：负数没有意义，NaN / undefined 也当 0
  unreadTotal.value = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

export async function refreshUnread(): Promise<void> {
  const userStore = useUserStore()
  if (!userStore.isLogin) {
    unreadTotal.value = 0
    return
  }
  try {
    const res = await getUnreadCount(userStore.userId)
    setUnreadTotal(res.total)
  } catch {
    // 静默失败：小红点不是关键路径
  }
}

/**
 * 未读数的轮询（契约 M1）。
 *
 * 契约原文：
 *   「total > 0 时首页头像右上角显示小红点。
 *     前端在进入首页、App 回到前台时调用，或每 30 秒轮询一次；
 *     以后可以换成 WebSocket 推送。」
 *
 * 所以这里做三件事：
 *   1. 进来先拉一次
 *   2. 每 30 秒轮询一次
 *   3. 页面切回前台时立刻补一次
 *
 * ⚠️ 为什么"切回前台"要单独处理？
 *   浏览器的定时器在后台标签页会被降频（Chrome 大约每分钟才跑一次），
 *   只靠 setInterval 的话，用户切回前台可能看到的是几十秒前的旧数字。
 *
 * ⚠️ 为什么抽成函数而不是各写一遍？
 *   用户端外壳（UserLayout）和管理端外壳（AdminLayout）都需要这个小红点。
 *   抽成一个组合式函数，两边各调一次即可，定时器的创建与清理也只用维护一份。
 *
 * ⚠️ 定时器必须在组件卸载时清掉，否则【内存泄漏】：
 *   用户退出登录后外壳会被销毁，但定时器还在跑，每 30 秒发一次请求
 *   （还带着已失效的令牌），既浪费又会在控制台刷 401 错误。
 *
 * ⚠️ 这个函数必须在【组件 setup 顶层】调用：
 *   因为里面用了 onMounted / onUnmounted，它们依赖当前组件实例。
 *   放到 setTimeout 或事件回调里调用会拿不到实例，钩子不会生效。
 */
export function useUnreadPolling(): void {
  let timer: number | undefined

  function handleVisible() {
    // 只在"切回前台"时刷新；切到后台时什么都不做
    if (document.visibilityState === 'visible') refreshUnread()
  }

  onMounted(() => {
    refreshUnread()
    timer = window.setInterval(refreshUnread, POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', handleVisible)
  })

  // onMounted 里 add 了什么，onUnmounted 里就 remove 什么
  onUnmounted(() => {
    if (timer !== undefined) window.clearInterval(timer)
    document.removeEventListener('visibilitychange', handleVisible)
  })
}
