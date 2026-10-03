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

const service = axios.create({
  baseURL: API_PREFIX,
  timeout: 10000,
})

interface RetriableConfig extends InternalAxiosRequestConfig {
  __retried?: boolean
  /** 这条请求失败时不要弹提示（例如"退出登录"，失败了也无所谓，本地照样退） */
  silent?: boolean
}

/** 业务代码调用 http() 时用的配置：就是 axios 的配置 + 我们自己的 silent 开关 */
export interface HttpConfig extends AxiosRequestConfig {
  silent?: boolean
}

service.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.token)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function forceLogout(): void {
  localStorage.removeItem(STORAGE_KEYS.token)
  localStorage.removeItem(STORAGE_KEYS.refreshToken)
  localStorage.removeItem(STORAGE_KEYS.role)
  localStorage.removeItem(STORAGE_KEYS.username)
  localStorage.removeItem(STORAGE_KEYS.userId)
  clearCache()

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

const refreshClient = axios.create({
  baseURL: API_PREFIX,
  timeout: 10000,
})

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

  const body = response.data as ApiResult<Record<string, unknown>> | undefined

  if (!body || typeof body.code !== 'number' || body.code !== BizCode.OK) {
    throw new Error(pickMessage(body) ?? '刷新登录状态失败')
  }

  const accessToken = pickTokenFields(body.data, ACCESS_TOKEN_FIELDS)
  if (!accessToken) throw new Error('刷新接口没有返回新的 access_token')

  localStorage.setItem(STORAGE_KEYS.token, accessToken)

  const nextRefreshToken = pickTokenFields(body.data, REFRESH_TOKEN_FIELDS)
  if (nextRefreshToken) {
    localStorage.setItem(STORAGE_KEYS.refreshToken, nextRefreshToken)
  }
}

function refreshTokenOnce(): Promise<void> {
  if (refreshing) return refreshing

  const task = doRefresh().finally(() => {
    // 不管成功失败都放开，否则以后永远刷不了新令牌
    refreshing = null
  })
  refreshing = task
  return task
}

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

export function http<T>(config: HttpConfig): Promise<T> {
  return service.request(config) as unknown as Promise<T>
}

export default service
