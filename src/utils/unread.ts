import { ref } from 'vue'
import { getUnreadCount } from '@/api/message'
import { useUserStore } from '@/stores/user'

export const unreadTotal = ref(0)

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
