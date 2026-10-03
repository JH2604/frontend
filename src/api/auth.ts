import { http } from '@/utils/request'
import { USE_MOCK, delay, mockLogin } from '@/mock'
import {
  ACCESS_TOKEN_FIELDS,
  API_LOGIN_PATH,
  API_LOGOUT_PATH,
  API_ME_PATH,
  API_REGISTER_PATH,
  LOGIN_ID_FIELD,
  LOGIN_USER_KEY,
  REFRESH_TOKEN_FIELDS,
  Role,
  USER_NAME_FIELDS,
  pickTokenFields,
  readRole,
  readUserId,
  type RoleValue,
} from '@/utils/contract'

export interface LoginParams {
  studentId: string
  password: string
  /** 只有注册用得上（文档 A1 里 role 是必填）。不传默认按学生注册 */
  role?: RoleValue
}

export interface LoginResult {
  token: string
  /** 刷新令牌，只用于调用 A4，绝不放进任何请求头 */
  refreshToken?: string
  role: RoleValue
  username: string

  userId: number
}

function readTokenPayload(token: string): { role: RoleValue; userId?: number } {
  try {
    const part = token.split('.')[1]
    if (!part) return { role: Role.STUDENT }

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
      role: payload.role === Role.ADMIN ? Role.ADMIN : Role.STUDENT,
      userId: payload.user_id ?? payload.userId,
    }
  } catch {
    // token 不是标准 JWT 时按普通学生处理，别让页面直接崩
    return { role: Role.STUDENT }
  }
}

function pickLoginUser(res: Record<string, unknown> | undefined | null): {
  role?: RoleValue
  name?: string
  userId: number
} {
  const user = res?.[LOGIN_USER_KEY]
  return {
    role: readRole(user),
    name: pickTokenFields(user, USER_NAME_FIELDS),
    // id 是数字，所以用专门的 readUserId（见 contract.ts 第 10 节）
    userId: readUserId(user),
  }
}

// 登录（文档 A2）
export async function login(data: LoginParams): Promise<LoginResult> {
  if (USE_MOCK) {
    await delay()
    return mockLogin(data)
  }

  // 请求体：{ student_id, password }
  const res = await http<Record<string, unknown>>({
    url: API_LOGIN_PATH,
    method: 'post',
    data: { [LOGIN_ID_FIELD]: data.studentId, password: data.password },
  })

  const token = pickTokenFields(res, ACCESS_TOKEN_FIELDS) ?? ''
  const user = pickLoginUser(res)

  return {
    token,
    refreshToken: pickTokenFields(res, REFRESH_TOKEN_FIELDS),
    // 优先用后端给的 role；后端没给才去解 JWT
    role: user.role ?? readTokenPayload(token).role,
    // 优先用实名（后端从实名库查出来的），没有才退回用户输入的学号
    username: user.name ?? data.studentId,
    // 后端 user 对象里有 id 就用；没有就退回解 JWT 拿到的 user_id，再没有就是 0
    userId: user.userId || readTokenPayload(token).userId || 0,
  }
}

export async function register(data: LoginParams): Promise<{ name: string }> {
  if (USE_MOCK) {
    await delay()
    const isAdmin = data.role === "admin" || data.studentId === "admin"
    return {name: isAdmin ? "管理员" : '学生'}
  }
  const res = await http<{ id:number; student_id:string;  role:string; name:string }>({
    url: API_REGISTER_PATH,
    method: 'post',
    data: {
      [LOGIN_ID_FIELD]: data.studentId, 
      password: data.password, 
      role: data.role ?? Role.STUDENT
    },
  })
  return {name:res.name}
}

export function logoutApi() {
  return http<null>({ url: API_LOGOUT_PATH, method: 'post', silent: true })
}

// 当前登录用户（文档 U1）：可以用来检查 token 还有没有效
export function getMe() {
  return http<Record<string, unknown>>({ url: API_ME_PATH, method: 'get' })
}
