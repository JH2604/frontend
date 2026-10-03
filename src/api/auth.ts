// =====================================================================
// 认证接口层（契约 A1~A4）
//
// 【它在哪里】
//   views/LoginView.vue          登录/注册按钮
//   layouts/UserLayout.vue       退出按钮
//   layouts/AdminLayout.vue      退出按钮
//         ↓ 调用本文件
//   api/auth.ts  ★ 你在这里
//         ↓
//   utils/request.ts  →  mock/ 或 真后端
//
//   ⚠️ 还有一个"隐式调用方"：utils/request.ts 里处理 40101（令牌过期）时
//      会自己去调 A4 刷新令牌 —— 那条路不经过本文件的 refreshToken 函数，
//      而是 request.ts 内部直接用 axios 发的（原因见那边的注释）。
//
// 【契约里的 4 个接口】
//   A1 POST /auth/register   注册
//   A2 POST /auth/login      登录（返回 access_token + refresh_token + user）
//   A3 POST /auth/logout     退出（让后端把这个会话吊销掉）
//   A4 POST /auth/refresh    用 refresh_token 换一对新令牌
//
// 【本文件里 3 处关键设计】
//   1. login() 优先用后端返回的 user 对象取角色/姓名/id；
//      取不到才去解 JWT 令牌 —— 那是"后端还没改完"时的兜底。
//   2. logoutApi() 带 `silent: true`：退出失败不弹红字
//      （不管后端成不成功，本地都必须退干净）。
//   3. 字段名不写死：`student_id` 来自 contract.ts 的 LOGIN_ID_FIELD，
//      令牌字段来自 ACCESS_TOKEN_FIELDS —— 契约定下来只改那里。
//
// ⚠️ 和 api/user.ts 的 getMe() 重名问题：
//   本文件底部也有个 getMe()，也是 GET /users/me，但返回的是**未映射的原始对象**。
//   要用"我的信息"请用 api/user.ts 的 getMyProfile()（带驼峰映射）。
// =====================================================================

import { http } from '@/utils/request'
import { USE_MOCK, delay, mockLogin, mockRegister } from '@/mock'
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

/**
 * 登录 / 注册的入参（文档 A1 / A2）。
 *
 * 注意字段名叫 studentId 而不是 student_id：
 * 前端内部一律用驼峰，发给后端时再按 LOGIN_ID_FIELD 转成下划线。
 * 转换只在这一个文件里发生，页面不用管。
 */
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
  /**
   * 当前用户的数字 id（契约 A2 里 user.id）。
   *
   * 为什么登录就要把它带上？
   *   评论的"能不能删"必须知道"我是谁"（文档 C3：本人能删自己的评论）。
   *   如果不在这里传出来，页面就只能靠姓名比对 —— 重名就判断错了，
   *   而权限判断绝对不能靠姓名。
   * 取不到时是 0，表示"不知道我是谁"，页面按保守处理（不给删）。
   */
  userId: number
}

// 后端登录只返回令牌，access_token 里带了 user_id 和 role。
// JWT 就是三段用 . 拼起来的字符串：头部.载荷.签名，中间那段是 base64 编码的 JSON。
// 现在文档 A2 会额外返回一个 user 对象（有姓名和角色），
// 所以我们优先用那个；解 JWT 只作为"后端还没改完"时的兜底。
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

/**
 * 从登录响应里取出后端给的 user 对象（文档 A2）。
 * 取不到就返回空对象，由调用方兜底。
 */
function pickLoginUser(res: Record<string, unknown> | undefined | null): {
  role?: RoleValue
  name?: string
  userId: number
} {
  const user = res?.[LOGIN_USER_KEY]
  return {
    role: readRole(user),
    // pickTokenFields 是个通用的"按候选名单取第一个非空字符串"，
    // 名字里带 token 只是因为它一开始是为令牌写的，取姓名一样能用
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
    // 用 [LOGIN_ID_FIELD] 而不是写死 student_id：
    // 将来字段名要改，只改 contract.ts 里那一个常量
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

// 注册（文档 A1）：文档里注册不返回令牌，只返回用户信息，
// 所以注册成功后必须再调一次登录，才能拿到 token
export async function register(data: LoginParams): Promise<LoginResult> {
  if (USE_MOCK) {
    await delay()
    return mockRegister(data)
  }

  await http<{ id: number; student_id: string; name: string; role: string }>({
    url: API_REGISTER_PATH,
    method: 'post',
    data: {
      [LOGIN_ID_FIELD]: data.studentId,
      password: data.password,
      role: data.role ?? Role.STUDENT,
    },
  })
  return login(data)
}

// 退出登录（文档 A3）：让后端把这个会话吊销掉
//
// 为什么必须调？因为 access_token 在 2 小时内本来还有效。
// 如果只在本地删掉令牌，那个令牌在后端看来还是"活的"，
// 万一之前被人抓包拿到，他还能继续用。调了 A3，后端才会把它标记成已吊销。
export function logoutApi() {
  // silent: true —— 退出登录失败时不弹错误提示。
  // 因为不管后端成不成功，本地都必须退干净，弹个红字只会让用户困惑。
  return http<null>({ url: API_LOGOUT_PATH, method: 'post', silent: true })
}

// 当前登录用户（文档 U1）：可以用来检查 token 还有没有效
export function getMe() {
  return http<Record<string, unknown>>({ url: API_ME_PATH, method: 'get' })
}
