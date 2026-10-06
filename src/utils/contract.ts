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
  OK: 0,

  PARAM_ERROR: 40000,

  CAPTCHA_ERROR: 40001,

  OLD_PASSWORD_ERROR: 40002,

  NO_TOKEN: 40100,

  TOKEN_EXPIRED: 40101,

  LOGIN_FAILED: 40102,

  SESSION_REVOKED: 40103,

  REFRESH_INVALID: 40104,

  FORBIDDEN: 40300,

  NOT_FOUND: 40400,

  STUDENT_NOT_IN_DB: 40401,

  CONFLICT: 40900,

  FILE_TOO_LARGE: 41300,

  FILE_TYPE_UNSUPPORTED: 41500,

  TOO_MANY_REQUESTS: 42900,

  SERVER_ERROR: 50000,
} as const

export type BizCodeValue = (typeof BizCode)[keyof typeof BizCode]

export const CODES_FORCE_LOGOUT: readonly number[] = [
  BizCode.NO_TOKEN,
  BizCode.SESSION_REVOKED,
  BizCode.REFRESH_INVALID,
]

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

export function normalizePageResult<T>(raw: RawPageResult<T> | null | undefined): {
  list: T[]
  total: number
  page: number
  pageSize: number
} {
  return {
    list: raw?.list ?? [],
    total: raw?.total ?? 0,
    page: raw?.page ?? 1,
    pageSize: raw?.page_size ?? raw?.pageSize ?? PAGE_SIZE_DEFAULT,
  }
}

export const STORAGE_KEYS = {
  token: 'token',

  refreshToken: 'refresh_token',

  role: 'role',

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

export function postPath(id: number | string): string {
  return `${API_POSTS_PATH}/${id}`
}

export const LOGIN_ID_FIELD = 'student_id' as const

export const REFRESH_BODY_KEY = 'refresh_token'

export const ACCESS_TOKEN_FIELDS = ['access_token', 'token'] as const
export const REFRESH_TOKEN_FIELDS = ['refresh_token'] as const

export function pickTokenFields(input: unknown, keys: readonly string[]): string | undefined {
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

export const UploadUsage = {
  AVATAR: 'avatar',
  POST: 'post',
} as const

export const POST_IMAGE_LIMIT = 9
export const POST_IMAGE_MAX_MB = 5

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

export const VERIFICATION_CODE_FIELDS = {
  channel: 'channel',
  target: 'target',
  scene: 'scene',
} as const

export const CONTACT_FIELDS = {
  channel: 'channel',
  target: 'target',
  code: 'code',
} as const

export const VERIFICATION_SCENE = {
  BIND_CONTACT: 'bind_contact',
} as const

export const PASSWORD_FIELDS = {
  oldPassword: 'old_password',
  newPassword: 'new_password',
} as const

export const PROFILE_UPDATE_FIELDS = {
  avatarUrl: 'avatar_url',
  theme: 'theme',
  allowRemind: 'allow_remind',
} as const

export const AVATAR_MAX_MB = 2

export const VERIFICATION_CODE_LENGTH = 6

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return ''

  if (phone.length === 11) return `${phone.slice(0, 3)}****${phone.slice(7)}`

  if (phone.length <= 7) return '*'.repeat(phone.length)
  return `${phone.slice(0, 3)}****${phone.slice(-2)}`
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return ''
  const at = email.indexOf('@')

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

export function messageChatPath(peerId: number | string): string {
  return `${ROUTE_MESSAGES}/${peerId}`
}

export const API_MESSAGES_PATH = '/messages'
export const API_UNREAD_COUNT_PATH = '/messages/unread-count'
export const API_MESSAGES_READ_PATH = '/messages/read'

export function conversationPath(peerId: number | string): string {
  return `${API_MESSAGES_PATH}/conversations/${peerId}`
}

export const MESSAGE_QUERY_PARAMS = {
  box: 'box',
  isRead: 'is_read',
  page: 'page',
  pageSize: 'page_size',
} as const

export const CONVERSATION_QUERY_PARAMS = {
  beforeId: 'before_id',
  limit: 'limit',
  markRead: 'mark_read',
} as const

export const MESSAGE_PAGE_SIZE_DEFAULT = 20
export const MESSAGE_PAGE_SIZE_MAX = 50

export const MESSAGE_CONTENT_MAX = 1000

export const MESSAGE_REMIND_FIELD = 'remind'

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

export function statusActionText(type: 'lost' | 'found', status: 'open' | 'closed'): string {
  const target = nextStatus(status)
  if (status === 'open') return `标记为${STATUS_TEXT[type][target]}`
  return `撤回为${STATUS_TEXT[type][target]}`
}
