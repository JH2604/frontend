/**
 * ============================================================
 *  契约集中地（Contract）
 * ============================================================
 * 为什么要有这个文件？
 *
 * 10/1 组长把接口详情导入了 Apifox，并说"比那个 md 更直观一点"，
 * 所以最终契约的"源"是 Apifox，01-API接口文档(1).md 只是导出物。
 * 而且群里还有几处没定（群聊记录 10/1 19:26 后端 gukuya 问的那 6 条）。
 *
 * 解决办法：把所有"可能会变"的东西集中到这一个文件里。
 * 等 Apifox 确认之后，只改这一个文件，其它代码不用动。
 *
 * ⚠️ 每个 TODO 后面写的是"去哪儿找答案"，不是猜测。
 * ============================================================
 */

// ────────────────────────────────────────────────
// 1. 接口路径前缀
//    ✅ 已确认（2026-10-02 群里通知）："路径全部统一到 /api/v1/"
//    文档 1.1 写的也是 https://{host}/api/v1
//    不用再猜了。
// ────────────────────────────────────────────────
export const API_PREFIX = '/api/v1'

// ────────────────────────────────────────────────
// 2. 响应体里"提示信息"的字段名
//    文档 1.4 写的是 message
//    群里 10/1 15:37 不吃香菜. 拍板"就 msg 哈"
//    两个还没统一，所以这里做成"按顺序找，谁有用谁"。
//    TODO[Apifox]：确认后只留一个即可
// ────────────────────────────────────────────────
export const MESSAGE_KEYS = ['message', 'msg'] as const

/**
 * 从后端返回的响应体里取出提示文字。
 * 依次看 MESSAGE_KEYS 里的字段，谁是非空字符串就用谁。
 */
export function pickMessage(res: unknown): string | undefined {
  if (!res || typeof res !== 'object') return undefined
  const obj = res as Record<string, unknown>
  for (const key of MESSAGE_KEYS) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return undefined
}

// ────────────────────────────────────────────────
// 3. 业务码表（文档 1.6）
//    TODO[Apifox]：组长有一份"新的错误码表"（群聊 10/1 18:43），
//                  拿到后只改这里
// ────────────────────────────────────────────────
export const BizCode = {
  /** 成功 */
  OK: 0,
  /** 参数错误 */
  PARAM_ERROR: 40000,
  /** 验证码错误或已过期 */
  CAPTCHA_ERROR: 40001,
  /** 原密码错误 */
  OLD_PASSWORD_ERROR: 40002,
  /** 未携带 access_token / 格式或签名无效 */
  NO_TOKEN: 40100,
  /** access_token 已过期 */
  TOKEN_EXPIRED: 40101,
  /** 学号或密码错误 */
  LOGIN_FAILED: 40102,
  /** 会话已失效（已退出 / 已改密码 / 被吊销） */
  SESSION_REVOKED: 40103,
  /** refresh_token 无效、过期或被重放 */
  REFRESH_INVALID: 40104,
  /** 无权限 */
  FORBIDDEN: 40300,
  /** 资源不存在 */
  NOT_FOUND: 40400,
  /** 学号不在实名库中（注册） */
  STUDENT_NOT_IN_DB: 40401,
  /** 资源冲突（学号已注册 / 邮箱已被绑定） */
  CONFLICT: 40900,
  /** 文件过大 */
  FILE_TOO_LARGE: 41300,
  /** 文件类型不支持 */
  FILE_TYPE_UNSUPPORTED: 41500,
  /** 请求过于频繁 */
  TOO_MANY_REQUESTS: 42900,
  /** 服务器内部错误 */
  SERVER_ERROR: 50000,
} as const

export type BizCodeValue = (typeof BizCode)[keyof typeof BizCode]

/** 收到这些码 → 清掉本地登录态并跳登录页（文档 1.3.6） */
export const CODES_FORCE_LOGOUT: readonly number[] = [
  BizCode.NO_TOKEN,
  BizCode.SESSION_REVOKED,
  BizCode.REFRESH_INVALID,
]

/** 收到这个码 → 应该先刷新令牌再重试（文档 1.3.6）。还没实现，见 request.ts */
export const CODE_TOKEN_EXPIRED: number = BizCode.TOKEN_EXPIRED

/**
 * 业务码 → 中文兜底提示。
 * 只在后端没给 message 的时候用（后端 message 可以直接给用户看，优先用它）。
 */
export const CODE_TEXT: Readonly<Record<number, string>> = {
  [BizCode.PARAM_ERROR]: '参数有误，请检查后重试',
  [BizCode.CAPTCHA_ERROR]: '验证码错误或已过期',
  [BizCode.OLD_PASSWORD_ERROR]: '原密码错误',
  [BizCode.NO_TOKEN]: '请先登录',
  [BizCode.TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [BizCode.LOGIN_FAILED]: '学号或密码错误',
  [BizCode.SESSION_REVOKED]: '登录状态已失效，请重新登录',
  [BizCode.REFRESH_INVALID]: '登录状态已失效，请重新登录',
  [BizCode.FORBIDDEN]: '没有权限进行此操作',
  [BizCode.NOT_FOUND]: '内容不存在或已被删除',
  [BizCode.STUDENT_NOT_IN_DB]: '学号不在实名库中',
  [BizCode.CONFLICT]: '该记录已存在',
  [BizCode.FILE_TOO_LARGE]: '文件太大了',
  [BizCode.FILE_TYPE_UNSUPPORTED]: '不支持这种文件格式',
  [BizCode.TOO_MANY_REQUESTS]: '操作太频繁了，请稍后再试',
  [BizCode.SERVER_ERROR]: '服务器出了点问题，请稍后重试',
}

// ────────────────────────────────────────────────
// 4. 分页字段名
//    文档 1.5 用 page_size；现有前端内部用 pageSize
//    ✅ 已确认（文档 1.5）：默认 20 条，最大 50 条
// ────────────────────────────────────────────────
export const PAGE_SIZE_DEFAULT = 20
export const PAGE_SIZE_MAX = 50

/**
 * 把后端返回的分页对象统一成前端内部的形状。
 *
 * 后端可能返回 { page_size }，也可能返回 { pageSize }，
 * 这里两个都接受，省得契约定下来之前到处报错。
 * C++ 类比：一个"兼容两种协议版本的解包函数"。
 */
export interface RawPageResult<T> {
  list?: T[] | null
  total?: number | null
  page?: number | null
  page_size?: number | null
  pageSize?: number | null
}

export function normalizePageResult<T>(
  raw: RawPageResult<T> | null | undefined,
): { list: T[]; total: number; page: number; pageSize: number } {
  return {
    list: raw?.list ?? [],
    total: raw?.total ?? 0,
    page: raw?.page ?? 1,
    pageSize: raw?.page_size ?? raw?.pageSize ?? PAGE_SIZE_DEFAULT,
  }
}

// ────────────────────────────────────────────────
// 5. 本地存储（localStorage）的 key 名
//    这些字符串散在好几个文件里（request / stores / router），
//    写错一个字符的后果是"登录状态莫名其妙丢失"，非常难查。
//    集中在这里，保证"写进去的名字"和"读出来的名字"永远一致。
// ────────────────────────────────────────────────
export const STORAGE_KEYS = {
  /** access_token：每个请求的 Authorization 头里用 */
  token: 'token',
  /** refresh_token：只用来换新令牌，不放进请求头 */
  refreshToken: 'refresh_token',
  /** 角色：user / admin，路由守卫读它 */
  role: 'role',
  /** 界面上显示的用户名 */
  username: 'username',
} as const

// ────────────────────────────────────────────────
// 6. 认证 / 用户相关的【接口】路径（文档 A1~A4、U1）
//    ✅ 已确认（2026-10-02 群里通知 + 文档 A1~A4）
//    注意：这里全部是"发给后端的接口地址"，不是浏览器地址栏里的页面地址。
// ────────────────────────────────────────────────
export const API_LOGIN_PATH = '/auth/login'
export const API_REGISTER_PATH = '/auth/register'
export const API_REFRESH_PATH = '/auth/refresh'
export const API_LOGOUT_PATH = '/auth/logout'
export const API_ME_PATH = '/users/me'

// ⚠️⚠️ 这个和上面的 API_LOGIN_PATH 完全不是一回事，千万别混用：
//    ROUTE_LOGIN    = 浏览器地址栏里的【前端页面】路径，用来跳转、判断"现在是不是登录页"
//    API_LOGIN_PATH = 发给后端的【接口】地址，用来发登录请求
//    混用的后果：forceLogout() 会把浏览器跳到 '/auth/login' —— 那是接口地址，
//    前端路由表里根本没有，用户会看到一个空白页。
export const ROUTE_LOGIN = '/login'

// ────────────────────────────────────────────────
// 6.1 业务资源路径（文档 4 / 5 章）
//     ✅ 已确认（2026-10-02 群里通知 + 文档 P1~P5 / F1）
//     注意：我们代码里一直叫它"物品 item"，契约里叫"帖子 post"，
//           是同一个东西，接口路径是 /posts 不是 /items。
// ────────────────────────────────────────────────
export const API_POSTS_PATH = '/posts'
export const API_FILES_PATH = '/files'

/** 拼接 /posts/{id} 这种带 id 的路径 */
export function postPath(id: number | string): string {
  return `${API_POSTS_PATH}/${id}`
}

// ────────────────────────────────────────────────
// 7. 登录 / 注册请求体里"学号"的字段名
//    ✅ 已确认（文档 A1/A2）：字段名是 student_id，值是学号字符串
//    后端按学号从实名库查姓名，所以系统里姓名都不可自定义。
// ────────────────────────────────────────────────
export const LOGIN_ID_FIELD: 'student_id' | 'username' = 'student_id'

// ────────────────────────────────────────────────
// 8. 刷新令牌的请求体字段名（文档 A4）
// ────────────────────────────────────────────────
export const REFRESH_BODY_KEY = 'refresh_token'

// ────────────────────────────────────────────────
// 9. 令牌在响应体里的字段名
//    登录（A2）和刷新（A4）都会返回一对令牌：
//      文档 1.3.2 / A4 写的是 access_token + refresh_token
//      现有实现用的是 token
//    还没统一，所以这里做成"按候选名单找，谁有用谁"。
//    TODO[Apifox]：确认后只留一个
// ────────────────────────────────────────────────
export const ACCESS_TOKEN_FIELDS = ['access_token', 'token'] as const
export const REFRESH_TOKEN_FIELDS = ['refresh_token'] as const

/**
 * 从一段对象里按候选名单取第一个非空字符串。
 *
 * 为什么不是直接 obj.access_token？
 * 因为字段名还没跟后端定死，写死一个名字的话，
 * 后端一改名整个登录就废了。做成"按名单找"能同时兼容两种写法。
 * C++ 类比：不是硬编码下标，而是按优先级依次 find 一遍。
 */
export function pickTokenFields(
  input: unknown,
  keys: readonly string[],
): string | undefined {
  if (!input || typeof input !== 'object') return undefined
  const obj = input as Record<string, unknown>
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value) return value
  }
  return undefined
}

// ────────────────────────────────────────────────
// 10. 登录响应里的"用户对象"（文档 A2）
//     data: { access_token, ..., user: { id, student_id, name, avatar_url, role, theme } }
//     以前我们是自己解 JWT 拿 role 和用户名的；现在后端直接把 user 给我们了，
//     优先用后端给的（更准更全，还有头像和主题），解 JWT 只作为兜底。
// ────────────────────────────────────────────────
export const LOGIN_USER_KEY = 'user'
export const USER_NAME_FIELDS = ['name', 'username', 'nickname'] as const

/** 角色的合法取值（文档 1.7 枚举）：student 学生 / admin 管理员 */
export const Role = {
  STUDENT: 'student',
  ADMIN: 'admin',
} as const

export type RoleValue = (typeof Role)[keyof typeof Role]

/**
 * 把后端给的 role 字符串转成前端认识的两种值之一。
 *
 * 认不出来就返回 undefined，交给调用方兜底。
 * ⚠️ 注意这里是"不认识就不给权限"，而不是"不认识就当管理员"。
 *    权限判断永远要往安全的一侧兜底（fail-closed）。
 */
export function readRole(input: unknown): RoleValue | undefined {
  if (!input || typeof input !== 'object') return undefined
  const role = (input as Record<string, unknown>).role
  if (role === Role.ADMIN) return Role.ADMIN
  if (role === Role.STUDENT) return Role.STUDENT
  return undefined
}
