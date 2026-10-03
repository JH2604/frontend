/**
 * ============================================================
 *  契约集中地（Contract）
 * ============================================================
 *
 * 【它在哪里】
 *   最底层的基础设施，几乎每个文件都要 import 它。
 *
 *     api/*.ts        取接口路径（API_XXX_PATH）、字段名、业务码
 *     views/*.vue     取路由常量（ROUTE_XXX）、长度限制、文案表
 *     utils/request.ts 取 API_PREFIX、业务码、pickMessage、STORAGE_KEYS
 *     router/index.ts  取 ROUTE_* 和 STORAGE_KEYS
 *     mock/index.ts    取长度限制等常量
 *
 *   一句话：**"契约里写死的东西"都收在这一个文件里。**
 *
 * 【为什么要集中】
 *   接口路径、字段名、业务码、长度限制、路由地址这些东西，
 *   以前散在十几个文件里各写各的。只要有一处拼错，就会出现
 *   "明明登录了却被踢回登录页"这种极难查的 bug。
 *   集中到一个文件后：
 *     - 契约变了只改这里
 *     - 写错名字立刻编译报错（而不是运行时莫名其妙）
 *     - 想知道"这个东西到底叫什么"，只需要看一个地方
 *
 * 【本文件里放什么、不放什么】
 *   放：接口路径前缀、各接口路径、请求/响应字段名、业务码表、
 *       枚举（角色/类型/状态/主题/渠道）、长度限制、路由常量、
 *       以及几个"取字段"的小工具函数（pickMessage / readRole / ...）
 *   不放：任何业务逻辑、任何网络请求、任何界面代码。
 *
 * 【命名约定（很重要，看代码时靠它判断一个常量是给谁用的）】
 *   API_ 开头  -> 发给后端的【接口】地址，例如 API_LOGIN_PATH = '/auth/login'
 *   ROUTE_ 开头 -> 浏览器地址栏的【页面】地址，例如 ROUTE_LOGIN = '/login'
 *   ⚠️ 这两类绝不能混用。混了会让 forceLogout() 把浏览器跳到 '/auth/login'，
 *      那是接口地址，前端路由表里根本没有 -> 白屏。
 *
 * 【契约的权威来源】
 *   最终契约以 **Apifox 项目**为准（组长 2026-10-02 邀请加入的
 *   `JH-campus-lost-finding`）。
 *   文档 `01-API接口文档(2).md`（v1.1）是导出物，备份在
 *   `E:\outputs\_原始材料备份\`。
 *   ⚠️ v1.0 那份（`01-API接口文档(1).md`）已经作废 —— 别再照它写代码。
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
  /**
   * 当前登录用户的数字 id（登录响应 A2 里 user.id）。
   *
   * 为什么一定要存它？
   *   评论的"能不能删"要靠它判断（契约 C3：本人能删自己的、管理员能删所有）。
   *   光有姓名不行 —— 重名是存在的；光有令牌也不行 —— 令牌里的 id 不一定解得出。
   */
  userId: 'user_id',
  /**
   * 主题偏好（契约 1.7：light / dark / system）。
   *
   * 为什么存在本地？契约 U2 的原话是
   * "主题切换建议前端先改本地状态并立即生效，再异步调用本接口保存"。
   * 本地存一份，刷新页面时就不会先亮一下再变暗（闪烁）。
   */
  theme: 'theme',
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

/**
 * 用户资源路径（U6 查看发帖人信息）。
 * 注意和 API_ME_PATH 的区别：`/users/me` 是"我自己"，`/users/{id}` 是"看别人"。
 */
export const API_USERS_PATH = '/users'

export function userPath(userId: number | string): string {
  return `${API_USERS_PATH}/${userId}`
}

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

/**
 * 用户对象里"数字 id"的候选字段名。
 * 契约 A2 写的是 user.id，这里多留一个 user_id 兜底（后端偶尔两种写法混用）。
 *
 * 和上面按"非空字符串"取的函数不同，id 是【数字】，
 * 所以单独写一个函数，顺便做一次 Number() 转换：
 * 后端有可能把 int64 序列化成字符串再发过来（JS 的安全整数只有 2^53，
 * 后端为了保险常这么干）。这跟 C++ 里 long long 不能塞进 int 是同一个顾虑。
 */
export const USER_ID_FIELDS = ['id', 'user_id'] as const

/** 从用户对象里取出数字 id；取不到或不是数字返回 0（0 表示"未知用户"） */
export function readUserId(input: unknown): number {
  if (!input || typeof input !== 'object') return 0
  const obj = input as Record<string, unknown>
  for (const key of USER_ID_FIELDS) {
    const value = obj[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return 0
}

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

// ────────────────────────────────────────────────
// 11. 文件上传（文档 F1）
// ────────────────────────────────────────────────
export const UPLOAD_FILE_FIELD = 'file'
export const UPLOAD_USAGE_FIELD = 'usage'

/** usage 的取值：avatar 头像（≤2MB）/ post 帖子图片（≤5MB） */
export const UploadUsage = {
  AVATAR: 'avatar',
  POST: 'post',
} as const

/** 帖子最多 9 张图（文档 F1 备注 + P3 的 images 说明） */
export const POST_IMAGE_LIMIT = 9
export const POST_IMAGE_MAX_MB = 5

/** 标题 / 正文的长度限制（文档 P3） */
export const POST_TITLE_MAX = 30
export const POST_CONTENT_MAX = 1000

// ────────────────────────────────────────────────
// 12. 帖子字段名（我们内部驼峰 <-> 后端下划线）
//     映射函数在 src/api/item.ts，这里只放常量方便对照。
//
//     ⚠️ v1.1 之后这里**没有 sortBy / sort_by 了**：
//        P1 的 sort_by 参数被整个移除，comment_count 也随评论模块一起删了。
//        别照着旧文档加回来。
// ────────────────────────────────────────────────
export const POST_QUERY_PARAMS = {
  page: 'page',
  pageSize: 'page_size',
  order: 'order',
} as const

// ────────────────────────────────────────────────
// 13. 前端页面路径（注意和上面的接口路径区分）
// ────────────────────────────────────────────────
export const ROUTE_HOME = '/'
export const ROUTE_MY_POSTS = '/my-posts'
export const ROUTE_PUBLISH = '/publish'
export const ROUTE_MESSAGES = '/messages'
export const ROUTE_SETTINGS = '/settings'
export const ROUTE_ADMINS = '/admins'
export const ROUTE_ADMIN_ITEMS = '/admin/items'

export function itemDetailPath(id: number | string): string {
  return `/items/${id}`
}

/** 某个人的主页（U6 查看发帖人信息） */
export function userProfilePath(userId: number | string): string {
  return `/users/${userId}`
}

// ────────────────────────────────────────────────
// 16. 用户模块（v1.1 文档 3 章，U1~U7）
// ────────────────────────────────────────────────
export const API_USERS_ME_PATH = '/users/me'
export const API_USERS_PASSWORD_PATH = '/users/me/password'
export const API_USERS_CONTACT_PATH = '/users/me/contact'
export const API_USERS_ADMINS_PATH = '/users/admins'
export const API_VERIFICATION_CODES_PATH = '/verification-codes'

/**
 * 联系方式渠道（v1.1 新增的枚举，用在下标 U4 / U5）。
 *
 * ⚠️ v1.0 是"邮箱专用"的（U4 发邮箱验证码、U5 绑定邮箱，字段就叫 `email`）；
 *    v1.1 把手机号也并进来了，所以改成了 `channel` + `target` 两个通用字段。
 *    照 v1.0 写会变成 PUT /users/me/email —— 那个路径已经不存在了。
 */
export const ContactChannel = {
  SMS: 'sms',
  EMAIL: 'email',
} as const

export type ContactChannelValue = (typeof ContactChannel)[keyof typeof ContactChannel]

/** U4 请求体字段名 */
export const VERIFICATION_CODE_FIELDS = {
  channel: 'channel',
  target: 'target',
  scene: 'scene',
} as const

/** U5 请求体字段名（和 U4 的 target 必须一致） */
export const CONTACT_FIELDS = {
  channel: 'channel',
  target: 'target',
  code: 'code',
} as const

/**
 * 验证码的用途（契约里的 `scene`）。
 * 我们只用 `bind_contact`（绑定/修改手机号或邮箱）；
 * `reset_password` 是"忘记密码"预留的，契约明确说"需要时再加一个重置接口"。
 */
export const VERIFICATION_SCENE = {
  BIND_CONTACT: 'bind_contact',
} as const

/** U3 请求体字段名 */
export const PASSWORD_FIELDS = {
  oldPassword: 'old_password',
  newPassword: 'new_password',
} as const

/** U2 请求体字段名（只有这三个可以改） */
export const PROFILE_UPDATE_FIELDS = {
  avatarUrl: 'avatar_url',
  theme: 'theme',
  allowRemind: 'allow_remind',
} as const

/** 头像上传的大小上限（契约 F1：avatar ≤2MB / post ≤5MB） */
export const AVATAR_MAX_MB = 2

/** 验证码的长度（契约 U5 写的是"6 位验证码"） */
export const VERIFICATION_CODE_LENGTH = 6

/**
 * 手机号 / 邮箱打码（契约 U1 的说明："本人可以看到完整值；
 * 前端展示时打码（如 `138****5678`）"）。
 *
 * ⚠️ 注意契约这句话有两层意思：
 *   1. **后端给的是完整值**（本人视角），打码是**前端展示**的事；
 *   2. 所以这里只影响"显示"，判断逻辑（比如"是否已绑定"）要用原始值。
 *      如果把打码后的字符串当成数据去用，就会出现
 *      "明明绑定了却因为长度判断错误显示成未绑定"。
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  // 11 位手机号：保留前 3 后 4
  if (phone.length === 11) return `${phone.slice(0, 3)}****${phone.slice(7)}`
  // 其他长度就保守处理：少于 7 位全打码，否则留住头尾
  if (phone.length <= 7) return '*'.repeat(phone.length)
  return `${phone.slice(0, 3)}****${phone.slice(-2)}`
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return ''
  const at = email.indexOf('@')
  // 没有 @ 就不是邮箱，全打码（免得把奇怪的字符串原样显示出来）
  if (at <= 0) return '*'.repeat(email.length)
  const name = email.slice(0, at)
  const domain = email.slice(at)
  if (name.length <= 2) return `${name.slice(0, 1)}***${domain}`
  return `${name.slice(0, 2)}***${domain}`
}

/**
 * 密码规则（契约 A1 说"规则同注册"，所以我们沿用登录页的提示：
 * 8~32 位，含字母和数字）。这里给前端做即时校验 + 提示文案。
 */
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 32
export const PASSWORD_RULE_TEXT = `${PASSWORD_MIN}~${PASSWORD_MAX} 位，需同时包含字母和数字`

export function isValidPassword(pwd: string): boolean {
  if (pwd.length < PASSWORD_MIN || pwd.length > PASSWORD_MAX) return false
  return /[A-Za-z]/.test(pwd) && /\d/.test(pwd)
}


/** 某个人的私信聊天页（M3 私信记录） */
export function messageChatPath(peerId: number | string): string {
  return `${ROUTE_MESSAGES}/${peerId}`
}

// ────────────────────────────────────────────────
// 15. 消息模块（v1.1 文档第 6 章 M1~M5）
// ────────────────────────────────────────────────
/**
 * ⚠️ v1.1 把消息模块**重新编号**了，照 v1.0 的编号写代码会调错接口：
 *
 *   v1.0                        v1.1
 *   M1 未读数                   M1 未读私信数（返回体从 {total,private,comment} 变成 {total}）
 *   M2 我的消息                 M2 我的消息（去掉 kind 参数）
 *   M3 私信会话列表   ← 删除
 *   M4 私信记录                 M3 私信记录（改游标分页）
 *   M5 发送私信                 M4 发送私信（新增 remind）
 *   M6 标记已读                 M5 标记已读（{kind:"all"} 改 {all:true}）
 *
 * v1.1 还删掉了消息的 `kind` 字段（不再分 private / comment）——
 * 因为评论模块整个没了，消息就只剩私信一种。
 */
export const API_MESSAGES_PATH = '/messages'
export const API_UNREAD_COUNT_PATH = '/messages/unread-count'
export const API_MESSAGES_READ_PATH = '/messages/read'

/**
 * M3 私信记录的路径。
 * 注意 M3 既是"某人的聊天记录"，也是"进入聊天页"的入口 —— v1.1 删掉了会话列表接口，
 * 所以界面上"我能和谁聊"这件事只能靠 M2 的消息列表自己归并出来。
 */
export function conversationPath(peerId: number | string): string {
  return `${API_MESSAGES_PATH}/conversations/${peerId}`
}

/** M2 的查询参数名（v1.1：box / is_read / page / page_size，**没有 kind**） */
export const MESSAGE_QUERY_PARAMS = {
  box: 'box',
  isRead: 'is_read',
  page: 'page',
  pageSize: 'page_size',
} as const

/** M3 的查询参数名（v1.1：游标分页，不是 page/page_size） */
export const CONVERSATION_QUERY_PARAMS = {
  beforeId: 'before_id',
  limit: 'limit',
  markRead: 'mark_read',
} as const

/**
 * M3 的默认条数。契约写"`limit` 默认 20，最大 50"。
 * 所以这里放两个常量，翻页时用 limit，并且绝不传超过 50 的值。
 */
export const MESSAGE_PAGE_SIZE_DEFAULT = 20
export const MESSAGE_PAGE_SIZE_MAX = 50

/** 私信内容长度。契约 M4 没写上限，我们按经验给一个前端兜底（和有赞的 500 字一致） */
export const MESSAGE_CONTENT_MAX = 500

/** M4 发送私信时，是否请求"短信 / 邮件提醒对方" */
export const MESSAGE_REMIND_FIELD = 'remind'

/** M5 标记已读的三种用法对应的字段名（优先级 ids > peer_id > all） */
export const MESSAGE_READ_KEYS = {
  ids: 'ids',
  peerId: 'peer_id',
  all: 'all',
} as const

/**
 * M4 返回体里 remind 的 status / reason 取值（v1.1 文档有完整表格）。
 *
 * 为什么要集中放这里？
 *   因为界面上要把它翻译成给用户看的话（"已短信提醒对方" / "对方关闭了提醒"），
 *   而 reason 一共有 6 种组合。散在组件里写 switch 很容易漏一种。
 */
export const REMIND_STATUS = {
  SENT: 'sent',
  SKIPPED: 'skipped',
  FAILED: 'failed',
} as const

export const REMIND_REASON = {
  NOT_REQUESTED: 'not_requested',
  NO_CONTACT: 'no_contact',
  DISABLED: 'disabled',
  RATE_LIMITED: 'rate_limited',
  PROVIDER_ERROR: 'provider_error',
} as const

/**
 * 把 M4 的 remind 结果翻译成一句给用户看的话。
 *
 * 契约原文的表：
 *   sent    / null            已提醒；channel 为实际使用的渠道
 *   skipped / not_requested   请求里没有要求提醒
 *   skipped / no_contact      对方没有绑定手机号和邮箱
 *   skipped / disabled        对方关闭了提醒（allow_remind=false）
 *   skipped / rate_limited    触发频率限制
 *   failed  / provider_error  短信 / 邮件服务商发送失败
 *
 * ⚠️ 关键：**提醒失败不影响私信本身**（契约原文），
 *    所以这个函数只用来提示，绝不能被当成"发送失败"。
 */
export function describeRemind(
  status: string | null | undefined,
  reason: string | null | undefined,
  channel: string | null | undefined,
): string {
  if (status === REMIND_STATUS.SENT) {
    return channel === 'sms' ? '已通过短信提醒对方' : '已通过邮件提醒对方'
  }
  if (status === REMIND_STATUS.FAILED) return '私信已发送，但提醒失败了'

  // 剩下都是 skipped：分情况说清楚原因，用户才知道是不是要换个方式
  switch (reason) {
    case REMIND_REASON.NOT_REQUESTED:
      return '私信已发送'
    case REMIND_REASON.NO_CONTACT:
      return '私信已发送（对方没绑定手机号或邮箱，无法提醒）'
    case REMIND_REASON.DISABLED:
      return '私信已发送（对方关闭了提醒）'
    case REMIND_REASON.RATE_LIMITED:
      return '私信已发送（提醒太频繁，本次未提醒）'
    default:
      return '私信已发送'
  }
}

// ────────────────────────────────────────────────
// 14. P5 修改帖子状态（2026-10-02 v1.1 文档变更）
// ────────────────────────────────────────────────
/**
 * ⚠️ 路径在 v1.1 里改过，这是本轮对齐的一处**破坏性变更**：
 *   v1.0（旧）：PATCH /posts/{post_id}          —— 路径和"帖子详情"完全相同，只靠 method 区分
 *   v1.1（新）：PATCH /posts/{post_id}/status   —— 多了一段 /status
 *
 * 为什么后端要加这一段？因为 PATCH /posts/{id} 太笼统：
 * 将来想支持"改标题""改地点"，就没法和"改状态"区分开。
 * 单独给状态一个子资源，语义更清楚。C++ 类比：
 * 从 `void update(Post&)` 拆成 `void updateStatus(int id, Status)` —— 一个函数只干一件事。
 *
 * 所以这里单独写一个函数，不能再用 postPath(id)。
 */
export function postStatusPath(id: number | string): string {
  return `${API_POSTS_PATH}/${id}/status`
}

/**
 * P5 的请求体确认弹窗文案。
 *
 * v1.1 明确写了状态是**双向**的：`closed` 标记完结，`open` 撤回为进行中（比如误点）。
 * 所以文案要跟着状态走，不能写死成"标记为已找回"。
 *
 * 失物（lost）和招领（found）的说法不一样，这是 v1.1 第 1.7 节新写清楚的：
 *   open   失物帖显示"未找到"，招领帖显示"待认领"
 *   closed 失物帖显示"已找到"，招领帖显示"已认领"
 */
export const STATUS_TEXT = {
  lost: { open: '未找到', closed: '已找到' },
  found: { open: '待认领', closed: '已认领' },
} as const
