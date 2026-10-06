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

  role?: RoleValue
}

export interface LoginResult {
  token: string

  refreshToken?: string
  role: RoleValue
  username: string

  userId: number
}

function readTokenPayload(token: string): { role: RoleValue; userId?: number } {
  try {
    const part = token.split('.')[1]
    if (!part) return { role: Role.STUDENT }

    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')

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

    userId: readUserId(user),
  }
}

export async function login(data: LoginParams): Promise<LoginResult> {
  if (USE_MOCK) {
    await delay()
    return mockLogin(data)
  }

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

    role: user.role ?? readTokenPayload(token).role,

    username: user.name ?? data.studentId,

    userId: user.userId || readTokenPayload(token).userId || 0,
  }
}

export async function register(data: LoginParams): Promise<{ name: string }> {
  if (USE_MOCK) {
    await delay()
    const isAdmin = data.role === 'admin' || data.studentId === 'admin'
    return { name: isAdmin ? '管理员' : '学生' }
  }
  const res = await http<{ id: number; student_id: string; role: string; name: string }>({
    url: API_REGISTER_PATH,
    method: 'post',
    data: {
      [LOGIN_ID_FIELD]: data.studentId,
      password: data.password,
      role: data.role ?? Role.STUDENT,
    },
  })
  return { name: res.name }
}

export function logoutApi() {
  return http<null>({ url: API_LOGOUT_PATH, method: 'post', silent: true })
}

export function getMe() {
  return http<Record<string, unknown>>({ url: API_ME_PATH, method: 'get' })
}
