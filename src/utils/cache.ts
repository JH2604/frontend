/**
 * ============================================================
 *  极简内存缓存（带过期时间）
 * ============================================================
 *
 * 【它在哪里】
 *   utils/ 是最底层的基础设施，被 api/ 和页面调用。
 *   目前只有 pages 里对"同一份数据反复请求"的场景会用它。
 *
 * 【为什么需要缓存】
 *   有些数据几乎不变，但每次进页面都重新请求一次，纯属浪费。
 *   加了缓存 + 过期时间，短时间内重复访问就不再发请求。
 *
 * 【这里的缓存只活在内存里】
 *   页面刷新（F5）就全没了 —— 这是有意的，避免"用户看到的是上一次登录时的旧数据"。
 *   要跨刷新保留的东西才用 localStorage（比如登录令牌）。
 *
 * 【这个文件里有两个数据结构】
 *   store    -> 已经拿到的数据（带过期时间）
 *   pending  -> 正在请求中的 Promise（用来做"请求去重"）
 *
 * 【前端名词】
 *   缓存（cache）    把结果暂存起来，下次直接用
 *   TTL              Time To Live，存活时间（毫秒）
 *   请求去重         同一个请求并发发起多次，只真正发一次，其他等结果
 *
 * 【C++ 类比】
 *   store  ≈ unordered_map<string, {data, expireAt}>
 *   pending ≈ unordered_map<string, shared_future<T>>
 *             （多个调用者 await 同一个 future，就只算一次请求）
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
// 不会发两次请求。
const pending = new Map<string, Promise<unknown>>()

/**
 * 带缓存地取数据。
 *
 * @param key    缓存键，比如 'posts:page1'
 * @param ttlMs  有效期（毫秒）。比如 30 * 60 * 1000 表示 30 分钟
 * @param loader 缓存没命中时真正去取数据的函数
 *
 * 【TypeScript 语法】
 *   `async function cached<T>(...)` 里的 `<T>` 是【泛型】，
 *   和 C++ 的 `template <typename T>` 是同一个东西：
 *   调用时由实参推断 T 是什么。cached<Item[]>('k', 1000, () => getItems())
 *   返回的就是 Promise<Item[]>。
 *
 *   `loader: () => Promise<T>` 是"函数类型的参数" ——
 *   把函数当参数传进来。C++ 里对应 std::function<Promise<T>()>。
 */
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

  // ---------- 2. 已经有人在取了，就搭个便车，等它 ----------
  // 这就是"请求去重"：10 个组件同时要同一份数据，只会真发 1 次请求。
  const inflight = pending.get(key)
  if (inflight) return inflight as Promise<T>

  // ---------- 3. 自己取 ----------
  // 注意这里是个 IIFE（立即执行的函数表达式）：`(async () => {...})()`
  // 写成这样是为了【先拿到 Promise，再登记到 pending】，
  // 如果先 await 再登记，别人就来不及搭便车了。
  const task = (async () => {
    try {
      const data = await loader()
      store.set(key, { data, expireAt: Date.now() + ttlMs })
      return data
    } finally {
      // `finally` 里的代码【无论成功失败都会执行】。
      // 这里必须清掉"正在请求"的标记，否则这条 key 以后永远拿不到新数据
      // （因为别人一看 pending 里有，就一直在等一个已经结束的 Promise）。
      // C++ 类比：RAII —— 出了作用域无论如何都要做的清理。
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
  // Array.from(...) 把 Map 的迭代器转成数组。
  // 为什么不直接 for (const key of store.keys())？
  //   因为循环里会 delete，边遍历边改容器在 JS 里是危险操作。
  //   先复制一份键的列表再删，最安全。
  // C++ 类比：遍历容器时删元素会让迭代器失效，得先拷贝一份。
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}

/** 全清（登录/退出登录时会调，避免看到上一个账号的残留数据） */
export function clearCache(): void {
  store.clear()
}
