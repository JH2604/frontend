import { onMounted, onUnmounted, ref } from 'vue'
import { getUnreadCount } from '@/api/message'
import { useUserStore } from '@/stores/user'

export const unreadTotal = ref(0)

const POLL_INTERVAL_MS = 30000

export function setUnreadTotal(n: number): void {
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
  } catch {}
}

export function useUnreadPolling(): void {
  let timer: number | undefined

  function handleVisible() {
    if (document.visibilityState === 'visible') refreshUnread()
  }

  onMounted(() => {
    refreshUnread()
    timer = window.setInterval(refreshUnread, POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', handleVisible)
  })

  onUnmounted(() => {
    if (timer !== undefined) window.clearInterval(timer)
    document.removeEventListener('visibilitychange', handleVisible)
  })
}
