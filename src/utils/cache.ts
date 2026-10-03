interface CacheEntry {
  data: unknown
  /** 到这一刻就过期（毫秒时间戳） */
  expireAt: number
}

// 缓存本体：键 -> 数据
const store = new Map<string, CacheEntry>()

const pending = new Map<string, Promise<unknown>>()

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  // ---------- 1. 命中且没过期，直接返回，一个请求都不发 ----------
  const hit = store.get(key)
  if (hit && Date.now() < hit.expireAt) {
    // `as T` 是类型断言：Map 里存的是 unknown，我们告诉 TS "它就是 T"
    return hit.data as T
  }

  const inflight = pending.get(key)
  if (inflight) return inflight as Promise<T>

  const task = (async () => {
    try {
      const data = await loader()
      store.set(key, { data, expireAt: Date.now() + ttlMs })
      return data
    } finally {
      pending.delete(key)
    }
  })()

  pending.set(key, task)
  return task
}

/** 手动让某个 key 失效（比如管理员改了数据之后，要强制下次重新拉） */
export function invalidate(key: string): void {
  store.delete(key)
}

/** 让所有以某前缀开头的 key 失效，比如 invalidatePrefix('posts:') */
export function invalidatePrefix(prefix: string): void {
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}

/** 全清（登录/退出登录时会调，避免看到上一个账号的残留数据） */
export function clearCache(): void {
  store.clear()
}
