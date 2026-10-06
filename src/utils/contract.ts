export const API_PREFIX = '/api/v1'

export const MESSAGE_KEYS = ['msg'] as const

export function pickMessage(res: unknown): string | undefined {
  if (!res || typeof res !== 'object') return undefined
  const obj = res as Record<string, unknown>
  for (const key of MESSAGE_KEYS) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return undefined
}

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

export const PAGE_SIZE_DEFAULT = 20
export const PAGE_SIZE_MAX = 50

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

export const STORAGE_KEYS = {
  /** access_token：每个请求的 Authorization 头里用 */
  token: 'token',
  /** refresh_token：只用来换新令牌，不放进请求头 */
  refreshToken: 'refresh_token',
  /** 角色：user / admin，路由守卫读它 */
  role: 'role',
  /** 界面上显示的用户名 */
  username: 'username',
  userId: 'user_id',
  theme: 'theme',
} as const
export const API_LOGIN_PATH = '/auth/login'
export const API_REGISTER_PATH = '/auth/register'
export const API_REFRESH_PATH = '/auth/refresh'
export const API_LOGOUT_PATH = '/auth/logout'
export const API_ME_PATH = '/users/me'

export const API_USERS_PATH = '/users'

export function userPath(userId: number | string): string {
  return `${API_USERS_PATH}/${userId}`
}
export const ROUTE_LOGIN = '/login'

export const API_POSTS_PATH = '/posts'
export const API_CREATE_POST_PATH = '/auth/post'
export const API_FILES_PATH = '/files'

/** 拼接 /posts/{id} 这种带 id 的路径 */
export function postPath(id: number | string): string {
  return `${API_POSTS_PATH}/${id}`
}

export const LOGIN_ID_FIELD = 'student_id' as const

export const REFRESH_BODY_KEY = 'refresh_token'

export const ACCESS_TOKEN_FIELDS = ['access_token', 'token'] as const
export const REFRESH_TOKEN_FIELDS = ['refresh_token'] as const

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

export const LOGIN_USER_KEY = 'user'
export const USER_NAME_FIELDS = ['name', 'username', 'nickname'] as const

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

export function readRole(input: unknown): RoleValue | undefined {
  if (!input || typeof input !== 'object') return undefined
  const role = (input as Record<string, unknown>).role
  if (role === Role.ADMIN) return Role.ADMIN
  if (role === Role.STUDENT) return Role.STUDENT
  return undefined
}

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

export const POST_QUERY_PARAMS = {
  page: 'page',
  pageSize: 'page_size',
  order: 'order',
} as const

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

export const API_USERS_ME_PATH = '/users/me'
export const API_USERS_PASSWORD_PATH = '/users/me/password'
export const API_USERS_CONTACT_PATH = '/users/me/contact'
export const API_USERS_ADMINS_PATH = '/users/admins'
export const API_VERIFICATION_CODES_PATH = '/verification-codes'

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

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 32
export const PASSWORD_RULE_TEXT = `${PASSWORD_MIN}~${PASSWORD_MAX} 位，需同时包含字母和数字`
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)\S{8,32}$/
export const STUDENT_ID_RULE_TEXT = '学号为 admin 或 3~20 位数字'

export function isValidPassword(pwd: string): boolean {
  return PASSWORD_REGEX.test(pwd)
}

export function isValidStudentId(value: string): boolean {
  return value === 'admin' || /^\d{3,20}$/.test(value)
}

/** 某个人的私信聊天页（M3 私信记录） */
export function messageChatPath(peerId: number | string): string {
  return `${ROUTE_MESSAGES}/${peerId}`
}

export const API_MESSAGES_PATH = '/messages'
export const API_UNREAD_COUNT_PATH = '/messages/unread-count'
export const API_MESSAGES_READ_PATH = '/messages/read'

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

export const MESSAGE_PAGE_SIZE_DEFAULT = 20
export const MESSAGE_PAGE_SIZE_MAX = 50

export const MESSAGE_CONTENT_MAX = 1000

/** M4 发送私信时，是否请求"短信 / 邮件提醒对方" */
export const MESSAGE_REMIND_FIELD = 'remind'

/** M5 标记已读的三种用法对应的字段名（优先级 ids > peer_id > all） */
export const MESSAGE_READ_KEYS = {
  ids: 'ids',
  peerId: 'peer_id',
  all: 'all',
} as const

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
  return '已提醒过对方，请耐心等待回复'
    default:
      return '私信已发送'
  }
}

export function postStatusPath(id: number | string): string {
  return `${API_POSTS_PATH}/${id}/status`
}

export const STATUS_TEXT = {
  lost: { open: '未找到', closed: '已找到' },
  found: { open: '待认领', closed: '已认领' },
} as const

export function nextStatus(status: 'open' | 'closed'): 'open' | 'closed' {
  return status === 'open' ? 'closed' : 'open'
}

export function statusActionText(
  type: 'lost' | 'found',
  status: 'open' | 'closed',
): string {
  const target = nextStatus(status)
  if (status === 'open') return `标记为${STATUS_TEXT[type][target]}`
  return `撤回为${STATUS_TEXT[type][target]}`
}
