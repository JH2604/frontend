import axios, {
  isAxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResult } from '@/types/api'
import {
  ACCESS_TOKEN_FIELDS,
  API_PREFIX,
  API_REFRESH_PATH,
  BizCode,
  CODE_TEXT,
  CODE_TOKEN_EXPIRED,
  CODES_FORCE_LOGOUT,
  REFRESH_BODY_KEY,
  REFRESH_TOKEN_FIELDS,
  ROUTE_LOGIN,
  STORAGE_KEYS,
  pickMessage,
  pickTokenFields,
} from './contract'
import { clearCache } from './cache'

// =====================================================================
// 网络层：所有请求的【必经之路】
//
// 【它在哪里】—— 记住这条调用链，你以后看任何一页代码都知道自己在哪一层
//
//   views/xxx.vue          用户在页面上点了个按钮
//         ↓ 调用
//   api/xxx.ts             把页面参数整理成"后端要的格式"（下划线字段）
//         ↓ 调用
//   utils/request.ts  ★    本文件：贴令牌、拆壳、报错、令牌续期
//         ↓
//   mock/ 或 真后端         USE_MOCK=true 走假数据，否则真的发出去
//
// 【为什么要有这么一层，而不是每个页面各自 axios.get(...)】
//   如果不封这一层，每个页面都得自己写：
//     - 从 localStorage 取令牌拼 Authorization 头
//     - 判断 res.code 是不是 0
//     - 把 {code, msg, data} 里的 data 拆出来
//     - 出错时弹提示、判断要不要跳登录页
//   9 个页面就是 9 份几乎一样的代码，漏一处就是一个 bug。
//   封一次，所有页面只管拿 data。
//   C++ 类比：把重复的样板代码抽成一个函数，调用方只管业务。
//
// 【前端名词】
//   拦截器（interceptor）  请求出门前的检查员 / 响应进门后的检查员
//   拆壳                   后端返回 {code, msg, data}，我们只把 data 交给业务代码
//   业务码                 响应体里的 code（0 成功、40100 无令牌……），
//                          和 HTTP 状态码（200/400/401）是【两套】东西
//   无感刷新令牌           令牌过期时自动换新的并重发原请求，用户察觉不到
//
// 【本文件里 6 个部分，按顺序读】
//   1. axios 实例（service）
//   2. 请求拦截器：出门前贴令牌
//   3. 无感刷新令牌（40101 时自动换新的）★ 最复杂的一段
//   4. 统一的业务错误处理
//   5. 响应拦截器：拆壳 / 报错 / 登录失效处理
//   6. 对外的 http<T>() 函数 —— 业务代码只需要认识这一个
// =====================================================================

// =====================================================================
// 1. axios 实例（把"怎么发请求"的公共配置集中在一个对象上）
// =====================================================================
// baseURL 统一取 contract.ts 里的 API_PREFIX（现在 '/api/v1'）。
// 以后契约改了前缀，只改那一行，全项目的请求都会跟着变。
const service = axios.create({
  baseURL: API_PREFIX,
  timeout: 10000,
})

/**
 * 在 axios 的请求配置上挂一个我们自己的标记。
 *
 * __retried = true 表示"这条请求已经因为令牌过期重发过一次了"。
 * 用它防止死循环：重发 → 又过期 → 又重发 → ...
 */
interface RetriableConfig extends InternalAxiosRequestConfig {
  __retried?: boolean
  /** 这条请求失败时不要弹提示（例如"退出登录"，失败了也无所谓，本地照样退） */
  silent?: boolean
}

/** 业务代码调用 http() 时用的配置：就是 axios 的配置 + 我们自己的 silent 开关 */
export interface HttpConfig extends AxiosRequestConfig {
  silent?: boolean
}

// =====================================================================
// 2. 请求拦截器：出门前自动贴令牌
// =====================================================================
// 每次发请求之前，把 localStorage 里的 access_token 塞进
// Authorization 头，格式固定 Bearer {token}（文档 1.2）。
service.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.token)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * 清掉本地登录态 + 清掉内存缓存，然后跳登录页。
 *
 * 为什么要连缓存一起清？
 * 缓存里装着上一个账号看到过的列表数据。如果只清 token 不清缓存，
 * 换了账号登录后可能看到别人残留的数据，属于隐私问题。
 */
function forceLogout(): void {
  localStorage.removeItem(STORAGE_KEYS.token)
  localStorage.removeItem(STORAGE_KEYS.refreshToken)
  localStorage.removeItem(STORAGE_KEYS.role)
  localStorage.removeItem(STORAGE_KEYS.username)
  clearCache()

  // 已经在登录页就不要再跳了，否则会反复刷新页面、一直闪
  // 注意用的是 ROUTE_LOGIN（前端页面路径 '/login'），不是 API_LOGIN_PATH
  if (!window.location.pathname.startsWith(ROUTE_LOGIN)) {
    window.location.href = ROUTE_LOGIN
  }
}

/** 从响应体里把业务码读出来；读不到就返回 undefined */
function readCode(body: unknown): number | undefined {
  if (!body || typeof body !== 'object') return undefined
  const code = (body as Record<string, unknown>).code
  return typeof code === 'number' ? code : undefined
}

/** 从一条请求的头上，把当初用的那个 Bearer 令牌抠出来 */
function readBearerToken(config?: RetriableConfig): string {
  const header = config?.headers?.Authorization
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return ''
  return header.slice('Bearer '.length)
}

// =====================================================================
// 3. 无感刷新令牌（文档 1.3.6 + 接口 A4）
// =====================================================================
// 需求原文：
//   "40101 access_token 过期 → 自动调用 A4 刷新，成功后用新令牌重试原请求；
//     多个请求同时过期时只刷新一次，其他请求排队等待"
//
// 下面这四段代码就是照着这句话写的。
//
// 【为什么单独建一个 axios？】
// 不能用上面那个 service。因为刷新接口自己失败时会返回 40104，
// 如果它走 service，拦截器又会去调刷新 → 无限递归，浏览器直接卡死。
// 所以 refreshClient 是一个"干净"的实例，不挂任何拦截器。
const refreshClient = axios.create({
  baseURL: API_PREFIX,
  timeout: 10000,
})

// 正在进行的刷新。多个请求同时过期时，只有第一个真的去刷，
// 后面的都 await 同一个 Promise —— 这就是"只刷新一次，其他排队等待"。
// C++ 类比：一个共享的 std::future，所有人 get() 的是同一份结果。
let refreshing: Promise<void> | null = null

/** 这条请求是不是"刷新令牌"自己？是的话不许再触发刷新 */
function isRefreshRequest(config?: InternalAxiosRequestConfig): boolean {
  return (config?.url ?? '').startsWith(API_REFRESH_PATH)
}

/** 真正去调 A4 换新令牌 */
async function doRefresh(): Promise<void> {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken)
  if (!refreshToken) throw new Error('本地没有 refresh_token')

  // 请求体只有一件事：把 refresh_token 交给后端（文档 A4）
  const response = await refreshClient.post(API_REFRESH_PATH, {
    [REFRESH_BODY_KEY]: refreshToken,
  })

  // ⚠️ 这里必须写 response.data，不能写 response！
  // 因为上面那个 service 有响应拦截器会自动"拆壳"，
  // 而 refreshClient 没有拦截器，拿到的就是 axios 的原始响应对象，
  // 真正的响应体在 .data 里（不是 .data 里再套一层 .data）。
  const body = response.data as ApiResult<Record<string, unknown>> | undefined

  if (!body || typeof body.code !== 'number' || body.code !== BizCode.OK) {
    throw new Error(pickMessage(body) ?? '刷新登录状态失败')
  }

  const accessToken = pickTokenFields(body.data, ACCESS_TOKEN_FIELDS)
  if (!accessToken) throw new Error('刷新接口没有返回新的 access_token')

  // ⚠️ 令牌轮换：每次刷新两个令牌都会换新（文档 1.3.5 第 2 点），
  // 旧的 refresh_token 立即作废。所以必须用新值覆盖旧值，
  // 否则下次刷新会被后端判定成"重放"，把该用户所有会话全部吊销（第 3 点）。
  localStorage.setItem(STORAGE_KEYS.token, accessToken)

  const nextRefreshToken = pickTokenFields(body.data, REFRESH_TOKEN_FIELDS)
  if (nextRefreshToken) {
    localStorage.setItem(STORAGE_KEYS.refreshToken, nextRefreshToken)
  }
}

/**
 * 保证"同一时刻只有一次刷新在跑"。
 * 第一个调用者创建任务，后面的人在任务结束前都拿到同一个 Promise。
 */
function refreshTokenOnce(): Promise<void> {
  if (refreshing) return refreshing

  const task = doRefresh().finally(() => {
    // 不管成功失败都放开，否则以后永远刷不了新令牌
    refreshing = null
  })
  refreshing = task
  return task
}

// =====================================================================
// 4. 统一的业务错误处理
// =====================================================================
/**
 * 两种结局：
 *   ① 是 40101 且还有救 → 刷新令牌 → 原样重发 → 把重发的结果返回给调用方（用户无感）
 *   ② 其他情况          → 弹提示 → （该登出就登出）→ 抛错
 *
 * 注意它返回的是 Promise，所以调用方 await 时要么拿到重发后的数据，
 * 要么直接进 catch。业务代码不会拿着错误数据继续算，问题更好定位。
 */
async function handleBizError(
  code: number,
  backendMessage?: string,
  config?: RetriableConfig,
): Promise<unknown> {
  const canTryRefresh =
    code === CODE_TOKEN_EXPIRED &&
    !!config &&
    !config.__retried &&
    !isRefreshRequest(config)

  if (canTryRefresh && config) {
    // ── 情况 A：这条请求用的令牌已经不是最新的了 ──
    // 说明在我们收到 40101 的这段时间里，别的请求已经帮忙刷新过了。
    // 那就别重复刷（重复刷会白白多做一次轮换），直接拿新令牌重发。
    const usedToken = readBearerToken(config)
    const currentToken = localStorage.getItem(STORAGE_KEYS.token) ?? ''
    if (usedToken && currentToken && usedToken !== currentToken) {
      config.__retried = true
      return await service.request(config)
    }

    // ── 情况 B：正常的"过期 → 刷新 → 重发" ──
    if (localStorage.getItem(STORAGE_KEYS.refreshToken)) {
      try {
        await refreshTokenOnce()
        config.__retried = true
        // 重新走一遍完整流程：请求拦截器会自动贴上刚拿到的新令牌
        return await service.request(config)
      } catch {
        // 刷新失败（比如 refresh_token 也过期了）→ 这里不吭声，
        // 掉到下面按"登录已过期"统一处理，保证只弹一次提示
      }
    }
  }

  // ── 兜底：弹提示 + 该登出就登出 + 抛错 ──
  //
  // 大部分情况下后端 message 可以直接给用户看（文档 1.4），所以优先用它。
  //
  // 但 40101 是个例外，必须忽略后端文案：
  //   - 刷新成功的话，用户根本走不到这里（上面已经重发并返回了）
  //   - 走到这里说明刷新也失败了，而后端那句"access_token 已过期"
  //     是给开发看的黑话，对用户应该说"登录已过期，请重新登录"
  const text =
    code === CODE_TOKEN_EXPIRED
      ? (CODE_TEXT[code] ?? '登录已过期，请重新登录')
      : (backendMessage ?? CODE_TEXT[code] ?? `请求失败（业务码 ${code}）`)
  // silent 的请求失败了也不弹窗（但仍然会 reject，调用方自己决定怎么处理）
  if (!config?.silent) {
    ElMessage.error(text)
  }

  if (CODES_FORCE_LOGOUT.includes(code) || code === CODE_TOKEN_EXPIRED) {
    forceLogout()
  }

  return Promise.reject(new Error(text))
}

// =====================================================================
// 5. 响应拦截器：自动拆壳、报错、处理登录失效
// =====================================================================
service.interceptors.response.use(
  (response) => {
    const res = response.data as ApiResult | null | undefined

    // 有些接口可能直接返回空体，原样放行，不要当成错误
    if (!res || typeof res !== 'object' || typeof res.code !== 'number') {
      return response.data as never
    }

    // code 不是 0 → 业务错误（40101 会在 handleBizError 里自动续期并重发）
    if (res.code !== BizCode.OK) {
      return handleBizError(
        res.code,
        pickMessage(res),
        response.config as RetriableConfig,
      ) as never
    }

    // 成功 → 只把 data 交给业务代码（这就是"拆壳"）
    return res.data as never
  },
  (error: unknown) => {
    // 后端用的是真实 HTTP 状态码（401 / 403 / 404 ...），
    // 所以失败分支里也要把响应体里的业务码读出来，走同一套处理逻辑。
    if (isAxiosError(error)) {
      const body: unknown = error.response?.data
      const code = readCode(body)
      if (code !== undefined) {
        return handleBizError(
          code,
          pickMessage(body),
          error.config as RetriableConfig | undefined,
        ) as never
      }

      const status = error.response?.status
      if (status) {
        if (!(error.config as RetriableConfig | undefined)?.silent) {
          ElMessage.error(`请求失败（HTTP ${status}）`)
        }
        if (status === 401) forceLogout()
        return Promise.reject(error)
      }
    }

    // 真正连不上：断网、超时、跨域被拦
    if (!(isAxiosError(error) ? (error.config as RetriableConfig | undefined)?.silent : false)) {
      ElMessage.error('网络异常，请检查网络后重试')
    }
    return Promise.reject(error instanceof Error ? error : new Error(String(error)))
  },
)

// =====================================================================
// 6. 业务代码统一用这个函数，T 就是 data 的类型
// =====================================================================
export function http<T>(config: HttpConfig): Promise<T> {
  return service.request(config) as unknown as Promise<T>
}

export default service
