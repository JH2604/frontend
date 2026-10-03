import type { ContactChannelValue, RoleValue } from '@/utils/contract'

// ===== 统一返回体（文档 1.4）=====
// 提示字段文档里叫 message，群里 10/1 拍板叫 msg，两个都留着可选，
// 真正的取值逻辑在 src/utils/contract.ts 的 pickMessage()。
export interface ApiResult<T = unknown> {
  code: number
  message?: string
  msg?: string
  data: T
}

// ===== 分页（文档 1.5）=====
// 前端内部统一用 pageSize（驼峰），发给后端时在 api 层转成 page_size。
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

/**
 * 帖子状态：open 进行中 / closed 已完结。
 * 界面上具体显示什么字，取决于帖子类型（v1.1 第 1.7 节）：
 *   失物帖 open=未找到，closed=已找到
 *   招领帖 open=待认领，closed=已认领
 * 文案表在 utils/contract.ts 的 STATUS_TEXT，由 StatusTag.vue 渲染。
 */
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

/**
 * 列表项（对应 P1）。
 * 列表接口不带完整正文和图片数组，只给"正文前 60 字"和"第一张图 + 张数"，
 * 这是为了列表能更快返回。所以列表项和详情是两个类型，不要混用。
 */
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
  /**
   * 标记为已找到 / 已认领的时间，进行中为 null（v1.1 新增的 P1 字段 closed_at）。
   * 目前列表页不展示它，但契约里有，先接出来备用。
   */
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
  /**
   * 能不能改状态（v1.1 新增的 P2 字段 can_change_status）。
   *
   * ⚠️ 这个字段和 isMine 看着像，但**不要用 isMine 代替它**：
   *   契约第 7 章权限表写明"修改他人帖子的状态 → 管理员也不可以"，
   *   所以它等价于 isMine。但**后端算出来的才权威** ——
   *   万一以后放开"管理员也能改"，前端用 isMine 就漏了。
   *   和 canDelete 一样，前端只管照着显示按钮。
   */
  canChangeStatus: boolean
  createdAt: string
  /** 标记为已找到 / 已认领的时间，进行中为 null（v1.1 新增的 P2 字段 closed_at） */
  closedAt: string | null
}

/**
 * P5 修改状态的返回（v1.1 变更）。
 *
 * ⚠️ v1.0 返回的是【完整帖子详情】，v1.1 只返回这三个字段了：
 *   { "id": 501, "status": "closed", "closed_at": "2026-10-02T19:30:00+08:00" }
 *
 * 所以**不能**再拿它去走 toItem() —— 那会把标题、正文全变成空字符串，
 * 页面上会出现"改完状态标题没了"这种诡异现象。
 * 单独给它一个类型，诚实反映契约。
 *
 * 页面上的做法：改完状态后重新调 P2 拉一次详情（见 ItemDetail.vue）。
 */
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
  /**
   * 排序方向，按发布时间：desc 最新在前（默认）/ asc 最早在前。
   *
   * ⚠️ 这里**没有** sortBy 了：v1.1 把 P1 的 `sort_by` 参数整个移除，
   * 同时 `comment_count` 字段也随评论模块一起被删。
   * 别照着旧文档把 sort_by 加回来。
   */
  order?: 'asc' | 'desc'
}

// =====================================================================
// 以下是"后端返回的原始形状"（P1 / P2 的 JSON 原样，下划线命名）
//
// 为什么要单独定义一遍？
//   后端用 created_at / cover_url / content_preview，我们内部用驼峰。
//   与其把下划线命名扩散到所有页面，不如在 api 层做一次转换：
//   页面永远只见到驼峰，转换只发生在 src/api/item.ts 一个文件里。
//   好处：后端将来把 created_at 改名，只改一个映射函数，页面一行不用动。
// =====================================================================

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

/**
 * P5 修改状态的原始返回（v1.1）。
 * 契约原文：{ "id": 501, "status": "closed", "closed_at": "2026-10-02T19:30:00+08:00" }
 */
export interface RawStatusPatch {
  id?: number | null
  status?: string | null
  closed_at?: string | null
}

// =====================================================================
// 消息模块（v1.1 文档第 6 章，M1~M5）
//
// v1.1 相比 v1.0 的三处结构性变化（写在这里免得又照旧文档写）：
//   1. 删掉 `kind` 字段（不再分 private / comment）—— 评论模块整个没了
//   2. 新增 `reminded` 字段（这条私信是否触发过短信 / 邮件提醒）
//   3. 编号整体前移（旧 M4→M3、旧 M5→M4、旧 M6→M5），旧 M3 会话列表被删
// =====================================================================

/** 消息方向：sent 我发出的 / received 我收到的 */
export type MessageDirection = 'sent' | 'received'

/** M2 的筛选：all 全部 / sent 我发出的 / received 我收到的 */
export type MessageBox = MessageDirection | 'all'

/** 关联帖子（从帖子详情页发起私信时才有） */
export interface MessagePostRef {
  id: number
  title: string
}

/**
 * M2 消息列表项。
 *
 * ⚠️ `peer` 是"对方"：我发出的 → 接收人；我收到的 → 发送人。
 *    后端已经帮我们把方向算好了，前端不要自己去猜。
 */
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

/**
 * M3 私信记录里的一条消息。
 *
 * 和 MessageBrief 的区别：**没有 peer**。
 * 因为整条会话都是和同一个人聊的，对方信息在响应体的 `peer` 里给一次就够了，
 * 每条都重复带一遍是浪费带宽。契约就是这么设计的，所以这里分成两个类型。
 */
export interface ChatMessage {
  id: number
  direction: MessageDirection
  content: string
  isRead: boolean
  reminded: boolean
  createdAt: string
}

/**
 * M3 私信记录的完整返回。
 *
 * ⚠️ M3 用的是**游标分页**（`before_id` + `has_more`），不是 page / page_size。
 *    为什么聊天记录要用游标？因为聊天是"不断往上追加"的：
 *    用页码的话，你翻到第 2 页时如果来了新消息，整个页码都会错位，
 *    出现"翻页看到重复消息"。游标（记住最后一条的 id）就没这个问题。
 *    C++ 类比：用 `list::iterator` 而不是 `vector::operator[]` 的下标 ——
 *    容器变了，迭代器仍然指向同一条数据。
 */
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

/**
 * M4 发送私信的结果。
 *
 * ⚠️ v1.1 的返回体是**嵌套**的，和 v1.0 不一样：
 *   v1.0：data 直接就是消息对象
 *   v1.1：data = { message: {...}, remind: { status, channel, reason } }
 * 所以映射的时候要往里剥一层，别照着旧文档写。
 */
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

// =====================================================================
// 用户信息（U6，v1.1 文档 3 章）
//
// 契约特别强调："同一个接口按查看者角色返回不同字段，由后端控制，不靠前端隐藏"。
// 所以前端的做法是：**只渲染后端给了的字段**，不要自己拿 role 去猜该藏什么。
// =====================================================================

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

// =====================================================================
// 我的信息（U1）+ 个人资料修改（U2）+ 密码（U3）+ 联系方式（U4/U5）+ 管理员列表（U7）
// =====================================================================

/**
 * U1 `GET /users/me` —— **当前登录用户自己**的完整信息。
 *
 * ⚠️ 它和 U6 的 `UserProfile` 长得像，但**不是一回事**，别合并：
 *   U1：本人的信息，手机号/邮箱是**完整值**，有 theme、created_at，没有 can_message
 *   U6：看**别人**的信息，contact 由后端按角色遮蔽，有 can_message / detail
 *   混用的话，U6 的映射函数会把"本人完整手机号"当成"别人的公开信息"处理，
 *   将来后端一改遮蔽规则，两边一起错。
 *   C++ 类比：两个都叫 User 的 struct，一个含敏感字段、一个不含，不该用同一个类型。
 */
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

// =====================================================================
// 评论模块已经在 v1.1（2026-10-02）里【被删除】了。
//
// 这里的 Comment / RawComment / CreateCommentPayload / CommentQuery 等类型
// 曾经存在过，现在按 v1.1 全部删掉。同时 P1 / P2 里的 comment_count 字段也没了。
//
// 为什么留这段说明？
//   因为"删掉的东西"最容易在下次改代码时被误加回来 ——
//   有人看到 P1 少了 comment_count，可能以为是漏了，然后照着旧文档补上。
//   写清楚"这是契约要求的删除，不是遗漏"，能省一次返工。
// =====================================================================