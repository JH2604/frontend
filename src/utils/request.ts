import axios, { type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResult } from '@/types/api'

// 1. 创建一个 axios 实例
const service = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 2. 请求拦截器：出门前自动贴上 token
service.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 3. 响应拦截器：回来后自动拆壳、报错、处理登录失效
service.interceptors.response.use(
  (response) => {
    const res = response.data as ApiResult

    // code 不是 0 -> 业务错误
    if (res.code !== 0) {
      ElMessage.error(res.msg || '请求失败')

      // 40003 -> 未登录 / token 过期，清登录态并踢回登录页
      if (res.code === 40003) {
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        localStorage.removeItem('username')
        window.location.href = '/login'
      }
      return Promise.reject(new Error(res.msg))
    }

    // 成功 -> 只把 data 交给业务代码
    return res.data as never
  },
  (error) => {
    // 网络层错误（断网、超时、502 等）
    ElMessage.error(error.message || '网络异常')
    return Promise.reject(error)
  },
)

// 4. 业务代码统一用这个函数，T 就是 data 的类型
export function http<T>(config: AxiosRequestConfig): Promise<T> {
  return service.request(config) as unknown as Promise<T>
}

export default service
