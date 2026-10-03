import type { ContactChannelValue, RoleValue } from '@/utils/contract'

export interface ApiResult<T = unknown> {
  code: number
  message?: string
  msg?: string
  data: T
}

export interface PageQuery {
  page: number
  pageSize: number
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// ===== 枚举（文档 1.7）=====
/** 帖子类型：lost 失物（我丢了东西）/ found 招领（我捡到东西） */
export type ItemType = 'lost' | 'found'

export type ItemStatus = 'open' | 'closed'

/** 主题偏好（文档 1.7） */
export type Theme = 'light' | 'dark' | 'system'

// ===== 公共数据模型（文档 1.7）=====

/** Location：地点名称必填，经纬度可选 */
export interface Location {
  name: string
  latitude?: number | null
  longitude?: number | null
}

/** UserBrief：出现在帖子、评论、消息里的用户简要信息 */
export interface Author {
  id: number
  /** 实名，来自实名库，不可修改 */
  name: string
  /** 头像地址 */
  avatarUrl: string
  role: RoleValue
}

// ===== 帖子（我们内部用的驼峰形状）=====

export interface ItemBrief {
  id: number
  type: ItemType
  title: string
  /** 正文前 60 字（P1 的 content_preview） */
  contentPreview: string
  /** 第一张图，无图为 null（P1 的 cover_url） */
  coverUrl: string | null
  /** 图片张数（P1 的 image_count） */
  imageCount: number
  location: Location
  status: ItemStatus
  author: Author
  createdAt: string

  closedAt: string | null
}

/** 详情（对应 P2） */
export interface Item {
  id: number
  type: ItemType
  title: string
  /** 完整正文（P2 的 content） */
  content: string
  images: string[]
  location: Location
  /** 丢失 / 拾到的时间（用户填写，可为 null） */
  eventTime: string | null
  status: ItemStatus
  author: Author
  /** 是否是当前用户发布的 */
  isMine: boolean
  /** 后端算好的"能不能删"（本人或管理员），前端据此显示删除按钮 */
  canDelete: boolean

  canChangeStatus: boolean
  createdAt: string
  /** 标记为已找到 / 已认领的时间，进行中为 null（v1.1 新增的 P2 字段 closed_at） */
  closedAt: string | null
}

export interface StatusPatchResult {
  id: number
  status: ItemStatus
  closedAt: string | null
}

/** 发布帖子的请求体（P3），发给后端前会被转成下划线字段 */
export interface CreateItemPayload {
  type: ItemType
  title: string
  content: string
  images?: string[]
  location: { name: string; latitude?: number | null; longitude?: number | null }
  eventTime?: string | null
}

/** 帖子列表的查询参数（P1），发给后端前会被转成下划线字段 */
export interface ItemQuery extends PageQuery {
  type?: ItemType | 'all'
  keyword?: string
  /** true 时只返回当前用户发布的帖子 */
  mine?: boolean
  status?: ItemStatus | 'all'

  order?: 'asc' | 'desc'
}

export interface RawLocation {
  name?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface RawAuthor {
  id?: number | null
  name?: string | null
  avatar_url?: string | null
  role?: string | null
}

/** P1 列表项原始形状 */
export interface RawPostBrief {
  id?: number | null
  type?: string | null
  title?: string | null
  content_preview?: string | null
  cover_url?: string | null
  image_count?: number | null
  location?: RawLocation | null
  status?: string | null
  author?: RawAuthor | null
  created_at?: string | null
  closed_at?: string | null
}

/** P2 详情原始形状 */
export interface RawPost {
  id?: number | null
  type?: string | null
  title?: string | null
  content?: string | null
  images?: string[] | null
  location?: RawLocation | null
  event_time?: string | null
  status?: string | null
  author?: RawAuthor | null
  is_mine?: boolean | null
  can_delete?: boolean | null
  can_change_status?: boolean | null
  created_at?: string | null
  closed_at?: string | null
}

/** P1 列表响应里 data 的原始形状 */
export interface RawPostPage {
  list?: RawPostBrief[] | null
  total?: number | null
  page?: number | null
  page_size?: number | null
}

export interface RawStatusPatch {
  id?: number | null
  status?: string | null
  closed_at?: string | null
}

/** 消息方向：sent 我发出的 / received 我收到的 */
export type MessageDirection = 'sent' | 'received'

/** M2 的筛选：all 全部 / sent 我发出的 / received 我收到的 */
export type MessageBox = MessageDirection | 'all'

/** 关联帖子（从帖子详情页发起私信时才有） */
export interface MessagePostRef {
  id: number
  title: string
}

export interface MessageBrief {
  id: number
  direction: MessageDirection
  peer: Author
  content: string
  /** 从帖子详情发起私信时的关联帖子，否则为 null */
  post: MessagePostRef | null
  /** 收到的消息：我是否已读；发出的消息：对方是否已读 */
  isRead: boolean
  /** 这条私信是否触发过短信 / 邮件提醒（只有 sent 有意义） */
  reminded: boolean
  createdAt: string
}

/** M2 列表的查询参数（前端内部形状） */
export interface MessageQuery extends PageQuery {
  box?: MessageBox
  /** true 只看未读。注意契约里是"不传返回全部"，所以这里用 undefined 表示不筛选 */
  isRead?: boolean
}

export interface ChatMessage {
  id: number
  direction: MessageDirection
  content: string
  isRead: boolean
  reminded: boolean
  createdAt: string
}

export interface Conversation {
  peer: Author
  /** 能否提醒对方（对方绑了手机/邮箱 且 没关提醒）。决定界面上显不显示"提醒对方"开关 */
  canRemind: boolean
  /** 按时间【正序】排列，方便直接渲染聊天气泡（契约原文） */
  list: ChatMessage[]
  hasMore: boolean
}

/** M3 的查询参数（游标分页） */
export interface ConversationQuery {
  /** 加载这条消息【之前】的记录；不传表示最新 */
  beforeId?: number
  limit?: number
  /** 是否把对方发给我的消息标记为已读，默认 true */
  markRead?: boolean
}

/** M4 发送私信的结果里，提醒那一部分（契约叫 remind 对象） */
export interface RemindResult {
  status: string
  channel: string | null
  reason: string | null
}

export interface SendMessageResult {
  message: ChatMessage
  remind: RemindResult
}

/** M4 发送私信的入参（前端内部形状） */
export interface SendMessagePayload {
  receiverId: number
  content: string
  /** 从帖子详情页发起私信时带上，对方能看到"来自帖子 xxx" */
  postId?: number
  /** 是否请求短信 / 邮件提醒对方，默认 false */
  remind?: boolean
}

/** M5 标记已读的入参：三种用法任选其一 */
export interface MarkReadPayload {
  ids?: number[]
  peerId?: number
  all?: boolean
}

/** M1 未读数的返回 */
export interface UnreadCount {
  total: number
}

/** M5 标记已读的返回（v1.1：可以直接拿它更新小红点，不用再调 M1） */
export interface MarkReadResult {
  updated: number
  unreadTotal: number
}

// ---- 以下是"后端返回的原始形状"（下划线命名） ----

export interface RawMessageBrief {
  id?: number | null
  direction?: string | null
  peer?: RawAuthor | null
  content?: string | null
  post?: { id?: number | null; title?: string | null } | null
  is_read?: boolean | null
  reminded?: boolean | null
  created_at?: string | null
}

export interface RawMessagePage {
  list?: RawMessageBrief[] | null
  total?: number | null
  page?: number | null
  page_size?: number | null
}

export interface RawChatMessage {
  id?: number | null
  direction?: string | null
  content?: string | null
  is_read?: boolean | null
  reminded?: boolean | null
  created_at?: string | null
}

export interface RawConversation {
  peer?: RawAuthor | null
  can_remind?: boolean | null
  list?: RawChatMessage[] | null
  has_more?: boolean | null
}

export interface RawRemindResult {
  status?: string | null
  channel?: string | null
  reason?: string | null
}

export interface RawSendMessage {
  message?: RawChatMessage | null
  remind?: RawRemindResult | null
}

export interface RawUnreadCount {
  total?: number | null
}

export interface RawMarkRead {
  updated?: number | null
  unread_total?: number | null
}

/** U6 返回的公开信息（普通用户和管理员都能看到） */
export interface UserPublic {
  id: number
  name: string
  avatarUrl: string
  role: RoleValue
  postCount: number
  /** 能否私信对方（不能私信自己） */
  canMessage: boolean
  /** 能否在私信里勾选"提醒对方" */
  canRemind: boolean
}

/** 管理员才能看到的信息（普通用户看时 detail 固定为 null） */
export interface UserDetail {
  studentId: string
  phone: string | null
  email: string | null
  allowRemind: boolean
  createdAt: string
  lastLoginAt: string
}

export interface UserProfile extends UserPublic {
  /** 只有管理员查看时才有值；普通用户查看时是 null */
  detail: UserDetail | null
}

// ---- 原始形状 ----

export interface RawUserDetail {
  student_id?: string | null
  phone?: string | null
  email?: string | null
  allow_remind?: boolean | null
  created_at?: string | null
  last_login_at?: string | null
}

export interface RawUserProfile {
  id?: number | null
  name?: string | null
  avatar_url?: string | null
  role?: string | null
  post_count?: number | null
  can_message?: boolean | null
  can_remind?: boolean | null
  detail?: RawUserDetail | null
}

export interface UserMe {
  id: number
  studentId: string
  name: string
  avatarUrl: string
  role: RoleValue
  /** 未绑定为 null */
  phone: string | null
  /** 未绑定为 null */
  email: string | null
  /** 是否允许别人给我发私信时通过短信/邮件提醒我 */
  allowRemind: boolean
  theme: Theme
  postCount: number
  createdAt: string
}

/** U2 `PATCH /users/me` 的入参：只有这三个能改 */
export interface UpdateMePayload {
  avatarUrl?: string
  theme?: Theme
  allowRemind?: boolean
}

/** U4 `POST /verification-codes` 的入参 */
export interface SendCodePayload {
  channel: ContactChannelValue
  /** 手机号（11 位）或邮箱地址 */
  target: string
}

/** U5 `PUT /users/me/contact` 的入参。注意 target 必须和 U4 时一致 */
export interface BindContactPayload {
  channel: ContactChannelValue
  target: string
  code: string
}

/** U5 的返回：绑定后最新的手机号 / 邮箱 */
export interface ContactResult {
  phone: string | null
  email: string | null
}

/** U3 `PUT /users/me/password` 的入参 */
export interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
}

/** U7 `GET /users/admins` 的列表项 */
export interface AdminContact {
  id: number
  name: string
  avatarUrl: string
  role: RoleValue
  /** 管理员对外公开的工作邮箱，用来做 mailto: 链接 */
  email: string | null
  canMessage: boolean
}

// ---- 原始形状 ----

export interface RawUserMe {
  id?: number | null
  student_id?: string | null
  name?: string | null
  avatar_url?: string | null
  role?: string | null
  phone?: string | null
  email?: string | null
  allow_remind?: boolean | null
  theme?: string | null
  post_count?: number | null
  created_at?: string | null
}

export interface RawContactResult {
  phone?: string | null
  email?: string | null
}

export interface RawAdminContact {
  id?: number | null
  name?: string | null
  avatar_url?: string | null
  role?: string | null
  email?: string | null
  can_message?: boolean | null
}
