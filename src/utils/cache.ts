/**
 * 极简内存缓存。
 *
 * 为什么需要它？
 * 组长点名要求"考虑一下缓存策略"（组长发言.docx）。
 * 最典型的例子是"分类列表"：它几乎不变，但每次进列表页都会重新请求一次，
 * 完全没必要。
 *
 * 这里用 Map 做了一个带过期时间的缓存。
 * C++ 类比：unordered_map<string, {data, expire}>，取值前先看有没有过期。
 */

interface CacheEntry {
  data: unknown
  /** 到这一刻就过期（毫秒时间戳） */
  expireAt: number
}

// 缓存本体：键 -> 数据
const store = new Map<string, CacheEntry>()

// 正在请求中的 Promise。作用是"请求去重"：
// 如果同一个 key 有两个地方同时要，第二个直接等第一个的结果，
// 不会发两次请求。C++ 类比：共享一个 std::future。
const pending = new Map<string, Promise<unknown>>()

/**
 * 带缓存地取数据。
 *
 * @param key    缓存键，比如 'categories'
 * @param ttlMs  有效期（毫秒）。比如 30 * 60 * 1000 表示 30 分钟
 * @param loader 缓存没命中时真正去取数据的函数
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  // 1. 命中且没过期，直接返回，一个请求都不发
  const hit = store.get(key)
  if (hit && Date.now() < hit.expireAt) {
    return hit.data as T
  }

  // 2. 已经有人在取了，就搭个便车，等它
  const inflight = pending.get(key)
  if (inflight) return inflight as Promise<T>

  // 3. 自己取
  const task = (async () => {
    try {
      const data = await loader()
      store.set(key, { data, expireAt: Date.now() + ttlMs })
      return data
    } finally {
      // 不管成功失败，都要把"正在请求"的标记清掉，
      // 否则这条 key 以后永远拿不到新数据
      pending.delete(key)
    }
  })()

  pending.set(key, task)
  return task
}

/** 手动让某个 key 失效（比如管理员改了分类之后） */
export function invalidate(key: string): void {
  store.delete(key)
}

/** 让所有以某前缀开头的 key 失效，比如 invalidatePrefix('items:') */
export function invalidatePrefix(prefix: string): void {
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}

/** 全清 */
export function clearCache(): void {
  store.clear()
}
