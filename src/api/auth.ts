import { http } from '@/utils/request'
import { USE_MOCK, delay, mockLogin, mockRegister } from '@/mock'

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  role: 'user' | 'admin'
  username: string
}

// 后端登录只返回 { token }，但 token 里带了 user_id 和 role。
// JWT 就是三段用 . 拼起来的字符串：头部.载荷.签名，中间那段是 base64 编码的 JSON。
// 这里把它解出来 —— 这是问后端要 role 之外的另一条路（不用后端改代码）。
function readTokenPayload(token: string): { role: 'user' | 'admin'; userId?: number } {
  try {
    const part = token.split('.')[1]
    if (!part) return { role: 'user' }

    // base64url 用的是 - 和 _，标准 base64 用的是 + 和 /，先换回来
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    // base64 长度必须是 4 的倍数，不够就用 = 补
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)

    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as {
      role?: string
      user_id?: number
      userId?: number
    }

    return {
      role: payload.role === 'admin' ? 'admin' : 'user',
      userId: payload.user_id ?? payload.userId,
    }
  } catch {
    // token 不是标准 JWT 时按普通用户处理，别让页面直接崩
    return { role: 'user' }
  }
}

// 登录
export async function login(data: LoginParams): Promise<LoginResult> {
  if (USE_MOCK) {
    await delay()
    return mockLogin(data)
  }

  const res = await http<{ token: string }>({ url: '/login', method: 'post', data })

  // token 存下来；role 从 token 里解；username 就是用户刚敲的那个
  return {
    token: res.token,
    role: readTokenPayload(res.token).role,
    username: data.username,
  }
}

// 注册：文档里注册只返回用户名（data 是个字符串），不给 token，
// 所以注册成功后必须再调一次登录，才能拿到 token
export async function register(data: LoginParams): Promise<LoginResult> {
  if (USE_MOCK) {
    await delay()
    return mockRegister(data)
  }

  await http<string>({ url: '/register', method: 'post', data })
  return login(data)
}

// 当前登录用户：可以用来检查 token 还有没有效
export function getMe() {
  return http<{ user_id: number }>({ url: '/me', method: 'get' })
}
