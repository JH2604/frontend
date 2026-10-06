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

  silent?: boolean
}

export interface HttpConfig extends AxiosRequestConfig {
  silent?: boolean
}

service.interceptors.request.use((config) => {
  config.headers['X-Client-Platform'] = 'web'
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

function readCode(body: unknown): number | undefined {
  if (!body || typeof body !== 'object') return undefined
  const code = (body as Record<string, unknown>).code
  return typeof code === 'number' ? code : undefined
}

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

function isRefreshRequest(config?: InternalAxiosRequestConfig): boolean {
  return (config?.url ?? '').startsWith(API_REFRESH_PATH)
}

async function doRefresh(): Promise<void> {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken)
  if (!refreshToken) throw new Error('本地没有 refresh_token')

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
    code === CODE_TOKEN_EXPIRED && !!config && !config.__retried && !isRefreshRequest(config)

  if (canTryRefresh && config) {
    const usedToken = readBearerToken(config)
    const currentToken = localStorage.getItem(STORAGE_KEYS.token) ?? ''
    if (usedToken && currentToken && usedToken !== currentToken) {
      config.__retried = true
      return await service.request(config)
    }

    if (localStorage.getItem(STORAGE_KEYS.refreshToken)) {
      try {
        await refreshTokenOnce()
        config.__retried = true

        return await service.request(config)
      } catch {}
    }
  }

  const text =
    code === CODE_TOKEN_EXPIRED
      ? (CODE_TEXT[code] ?? '登录已过期，请重新登录')
      : (backendMessage ?? CODE_TEXT[code] ?? `请求失败（业务码 ${code}）`)

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

    if (!res || typeof res !== 'object' || typeof res.code !== 'number') {
      return response.data as never
    }

    if (res.code !== BizCode.OK) {
      return handleBizError(res.code, pickMessage(res), response.config as RetriableConfig) as never
    }

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
