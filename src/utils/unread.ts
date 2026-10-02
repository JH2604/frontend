import { ref } from 'vue'
import { getUnreadCount } from '@/api/message'
import { useUserStore } from '@/stores/user'

/**
 * 未读私信数的共享状态（契约 M1）。
 *
 * 为什么单独放一个文件，而不是写在 UserLayout 里？
 *   因为有两个地方要动它，而且它们没有父子关系：
 *     1. UserLayout 的菜单小红点 —— 显示它
 *     2. Messages.vue / Conversation.vue —— 标已读之后它要变小
 *   如果状态放在 UserLayout 里，消息页想改它就得靠 emit 一层层往上抛，
 *   或者用 provide/inject。用一个模块级的 ref 最简单直接。
 *
 * C++ 类比：一个全局的 `std::atomic<int> unread_total;`，
 * 谁都能读、谁都能写，不用把引用在构造函数里传一圈。
 * （Vue 的 ref 在这里天然就是响应式的，改了界面自动更新。）
 *
 * ⚠️ 为什么不放进 Pinia（我们已经有一个 stores/user.ts）？
 *   因为它只有"一个数字 + 一个刷新动作"，为它建一个 store 太重。
 *   等它长出四五个字段再搬进 Pinia 也不迟。
 */
export const unreadTotal = ref(0)

/** 直接设一个值（M5 的返回里带了最新的 unread_total，用它最省一次请求） */
export function setUnreadTotal(n: number): void {
  // 兜底：负数没有意义，NaN / undefined 也当 0
  unreadTotal.value = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/**
 * 去后端拉一次未读数。
 *
 * ⚠️ 这里必须吞掉异常。原因：
 *   M1 是在 UserLayout 里被调用的，而 UserLayout 包着所有页面。
 *   如果未读数拉失败（后端没起、网络抖）就往上抛，
 *   会变成一个没人 catch 的 Promise rejection，
 *   浏览器控制台一堆红字，用户看到的页面还可能是好的 —— 非常难查。
 *   小红点拉不到就让它是 0，不影响任何主流程。
 */
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
