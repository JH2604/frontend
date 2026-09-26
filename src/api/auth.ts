import { http } from '@/utils/request'

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  role: 'user' | 'admin'
  username: string
}

// 登录
export function login(data: LoginParams) {
  return http<LoginResult>({ url: '/v1/auth/login', method: 'post', data })
}

// 注册
export function register(data: LoginParams) {
  return http<LoginResult>({ url: '/v1/auth/register', method: 'post', data })
}
