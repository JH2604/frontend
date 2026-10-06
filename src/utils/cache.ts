interface CacheEntry {
  data: unknown

  expireAt: number
}

const store = new Map<string, CacheEntry>()

const pending = new Map<string, Promise<unknown>>()

export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = store.get(key)
  if (hit && Date.now() < hit.expireAt) {
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

export function invalidate(key: string): void {
  store.delete(key)
}

export function invalidatePrefix(prefix: string): void {
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}

export function clearCache(): void {
  store.clear()
}
