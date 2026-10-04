import {ElMessage} from 'element-plus'
import type {
  ItemQuery,
  ItemStatus,
  ItemType,
  MarkReadPayload,
  MessageQuery,
  RawAdminContact,
  RawContactResult,
  RawConversation,
  RawMarkRead,
  RawMessageBrief,
  RawMessagePage,
  RawPost,
  RawPostBrief,
  RawPostPage,
  RawSendMessage,
  RawStatusPatch,
  RawUserMe,
  RawUserProfile,
  ConversationQuery,
  CreateItemPayload,
  SendMessagePayload,
} from '@/types/api'

export const USE_MOCK = true

// 模拟网络延迟，让 loading 动画看得见
export function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
export function mockFail (message: string): never {
  ElMessage.error(message)
  throw new Error(message)
}
export type MockLoginParams = {
  studentId: string
  password: string
  role?: 'student' | 'admin'
}

export function mockLogin(data: MockLoginParams) {
  const isAdmin = data.role === 'admin' || data.studentId === 'admin'
  return {
    token: `mock-token-${Date.now()}`,
    refreshToken: `mock-refresh-${Date.now()}`,
    role: (isAdmin ? 'admin' : 'student') as 'student' | 'admin',
    username: isAdmin ? '管理员' : data.studentId,
    userId: isAdmin ? 9001 : MOCK_ME_ID,
  }
}

export function mockRegister(data: MockLoginParams) {
  return mockLogin(data)
}

/** 假装当前登录用户的 id，用来实现 mine=true（我发布的） */
export const MOCK_ME_ID = 1001
/** 假装管理员用户的 id（用 admin 学号登录时用） */
export const MOCK_ADMIN_ID = 9001
const MOCK_ME = { id: MOCK_ME_ID, name: '张三', avatar_url: '', role: 'student' }

function author(id: number, name: string, role = 'student') {
  return { id, name, avatar_url: `https://cdn.example.com/avatar/${id}.png`, role }
}

/** P2 详情形状的种子数据 */
const posts: RawPost[] = [
  {
    id: 1,
    type: 'lost',
    title: '黑色钱包',
    content: '黑色长款钱包，内有校园卡一张和若干现金。9月19日下午在图书馆三楼自习区丢失。',
    images: ['https://cdn.example.com/post/1_1.webp', 'https://cdn.example.com/post/1_2.webp'],
    location: { name: '图书馆三楼自习区', latitude: 30.2291, longitude: 120.0412 },
    event_time: '2026-09-19T14:00:00+08:00',
    status: 'open',
    closed_at: null,
    author: MOCK_ME,
    is_mine: true,
    can_delete: true,
    created_at: '2026-09-19T15:00:00+08:00',
  },
  {
    id: 2,
    type: 'found',
    title: '校园卡一张',
    content: '在一教门口捡到校园卡一张，姓名已打码。请失主联系我核对信息后归还。',
    images: ['https://cdn.example.com/post/2_1.webp'],
    location: { name: '一教门口', latitude: 30.2301, longitude: 120.042 },
    event_time: '2026-09-20T12:00:00+08:00',
    status: 'closed',
    closed_at: null,
    author: author(1002, '李四'),
    is_mine: false,
    can_delete: undefined,
    created_at: '2026-09-20T12:30:00+08:00',
  },
  {
    id: 3,
    type: 'lost',
    title: '钥匙串（带小熊挂件）',
    content: '一串钥匙，上面挂了一只棕色小熊。晚上在操场跑步时可能掉了。',
    images: [],
    location: { name: '操场', latitude: null, longitude: null },
    event_time: '2026-09-21T19:30:00+08:00',
    status: 'open',
    closed_at: null,
    author: author(1003, '王五'),
    is_mine: false,
    can_delete: undefined,
    created_at: '2026-09-21T20:00:00+08:00',
  },
  {
    id: 4,
    type: 'found',
    title: '白色无线耳机',
    content: '图书馆三楼服务台捡到白色无线耳机一副，已交到服务台。',
    images: ['https://cdn.example.com/post/4_1.webp'],
    location: { name: '图书馆三楼', latitude: 30.2295, longitude: 120.0418 },
    event_time: '2026-09-22T09:10:00+08:00',
    status: 'open',
    closed_at: null,
    author: MOCK_ME,
    is_mine: true,
    can_delete: true,
    created_at: '2026-09-22T09:30:00+08:00',
  },
  {
    id: 5,
    type: 'lost',
    title: '蓝色的雨伞',
    content: '长柄雨伞，伞面是深蓝色。下雨天在二食堂门口忘拿了。',
    images: [],
    location: { name: '二食堂', latitude: 30.2288, longitude: 120.0409 },
    event_time: null,
    status: 'closed',
    closed_at: null,
    author: author(1004, '赵六'),
    is_mine: false,
    can_delete: undefined,
    created_at: '2026-09-23T11:15:00+08:00',
  },
  {
    id: 6,
    type: 'found',
    title: '一本《数据结构》教材',
    content: '在三教 205 教室捡到《数据结构》教材，扉页有名字，请失主联系。',
    images: ['https://cdn.example.com/post/6_1.webp'],
    location: { name: '三教 205', latitude: null, longitude: null },
    event_time: '2026-09-23T16:00:00+08:00',
    status: 'open',
    closed_at: null,
    author: author(1005, '孙七'),
    is_mine: false,
    can_delete: undefined,
    created_at: '2026-09-23T16:20:00+08:00',
  },
]

let nextId = 100

/** 把详情形状裁成列表形状（P1 只给前 60 字 + 第一张图 + 张数） */
function toBrief(p: RawPost): RawPostBrief {
  return {
    id: p.id,
    type: p.type,
    title: p.title,
    content_preview: (p.content ?? '').slice(0, 60),
    cover_url: p.images && p.images.length > 0 ? (p.images[0] ?? null) : null,
    image_count: p.images?.length ?? 0,
    location: p.location,
    status: p.status,
    closed_at: p.closed_at ?? null,
    author: p.author,
    created_at: p.created_at,
  }
}

// ===== P1 帖子列表 =====
export function mockGetItemList(query: ItemQuery): RawPostPage {
  let list = posts.slice()

  if (query.type && query.type !== 'all') {
    list = list.filter((p) => p.type === query.type)
  }
  if (query.status && query.status !== 'all') {
    list = list.filter((p) => p.status === query.status)
  }
  if (query.mine) {
    list = list.filter((p) => p.author?.id === MOCK_ME_ID)
  }
  if (query.keyword) {
    const kw = query.keyword.trim()
    // 文档 P1：模糊匹配标题、正文、地点名称
    list = list.filter((p) =>
      `${p.title ?? ''}${p.content ?? ''}${p.location?.name ?? ''}`.includes(kw),
    )
  }

  // 排序：默认按发布时间倒序（新的在前）
  const desc = (query.order ?? 'desc') === 'desc'
  list.sort((a, b) => {
    const ta = new Date(a.created_at ?? 0).getTime()
    const tb = new Date(b.created_at ?? 0).getTime()
    return desc ? tb - ta : ta - tb
  })

  const total = list.length
  const pageSize = query.pageSize || 20
  const page = query.page || 1
  const start = (page - 1) * pageSize

  return {
    list: list.slice(start, start + pageSize).map(toBrief),
    total,
    page,
    page_size: pageSize,
  }
}

function postCanDeleteFor(post: RawPost, viewerIsAdmin = false): boolean {
  if (viewerIsAdmin) return true
  return post.author?.id === MOCK_ME_ID
}

// ===== P2 帖子详情 =====
export function mockGetItemDetail(id: number, viewerIsAdmin = false): RawPost {
  const found = posts.find((p) => p.id === id)
  if (!found) {
    // 真后端是 404 / 40400，这里抛错让页面走"没有找到这条信息"的分支
    mockFail('帖子不存在或已删除')
  }
  return {
    ...found,
    is_mine: found.author?.id === MOCK_ME_ID,
    can_delete: postCanDeleteFor(found, viewerIsAdmin),
    can_change_status: found.author?.id === MOCK_ME_ID,
  }
}

// ===== P3 发布帖子 =====
export function mockCreateItem(payload: CreateItemPayload): RawPost {
  const created: RawPost = {
    id: nextId++,
    type: payload.type,
    title: payload.title,
    content: payload.content,
    images: payload.images ?? [],
    location: payload.location,
    event_time: payload.eventTime ?? null,
    status: 'open',
    // 契约 P3：新建的帖子 status 固定为 open，所以 closed_at 一定是 null
    closed_at: null,
    author: MOCK_ME,
    is_mine: true,
    can_delete: true,
    // 自己刚发的帖子，当然能改自己的状态
    can_change_status: true,
    created_at: new Date().toISOString(),
  }
  posts.unshift(created)
  return created
}

export function mockUpdateItemStatus(id: number, status: ItemStatus): RawStatusPatch {
  const found = posts.find((p) => p.id === id)
  if (!found) mockFail('帖子不存在或已删除')

  found.status = status
  // closed_at 跟着状态走：标记完结就记下时间，撤回就清空
  found.closed_at = status === 'closed' ? new Date().toISOString() : null

  return { id: found.id, status: found.status, closed_at: found.closed_at }
}

// ===== P4 删除帖子 =====
export function mockDeleteItem(id: number): void {
  const idx = posts.findIndex((p) => p.id === id)
  if (idx >= 0) posts.splice(idx, 1)
}
export function mockUploadFile(file: { name?: string }): {
  url: string
  width: number
  height: number
  size: number
} {
  const name = file?.name ?? 'image.png'
  return {
    // 用时间戳保证每次上传拿到不同的地址，方便看出"确实传上去了"
    url: `https://cdn.example.com/upload/${Date.now()}-${name}`,
    width: 800,
    height: 600,
    size: 123456,
  }
}

/** 假数据的 id 段位（和帖子 1xx、评论曾经用过的 9xxx 都错开） */
const MSG_IDS = {
  LI_SI_ASK: 7001,
  ME_ANSWER: 7002,
  LI_SI_ASK_CARD: 7003,
  ME_ANSWER_CARD: 7004,
  WANG_WU_HELLO: 7005,
  ME_ANSWER_WANG: 7006,
  ME_ASK_ADMIN: 7007,
  ZHAO_LIU_ASK: 7008,
  SUN_QI_ASK: 7009,
  ME_GROUP_REPLY: 7010,
} as const

/** 假数据里用到的用户 id（页面可以直接引用，别写魔法数字） */
export const MOCK_PEER_LI_SI = 1002
export const MOCK_PEER_WANG_WU = 1003
export const MOCK_PEER_ZHAO_LIU = 1004
export const MOCK_PEER_SUN_QI = 1005

/**
 * U7 管理员列表里的"第二个"管理员（李老师）的 id。
 *
 * ⚠️ 别和 MOCK_ADMIN_ID(9001) 搞混，两者是不同的人：
 *   MOCK_ADMIN_ID = 9001 -> 用 admin 学号登录后拿到的 userId，也就是"王老师本人"
 *   MOCK_PEER_ADMIN = 1  -> 列表里的另一位管理员"李老师"，
 *                           故意设成"没绑手机号/邮箱"，用来演示"提醒开关不显示"
 */
export const MOCK_PEER_ADMIN = 1

interface MockMessageRecord {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  /** 关联帖子（从帖子详情发起私信时才有） */
  post_id: number | null
  is_read: boolean
  reminded: boolean
  created_at: string
}

/** 只给"我"和这四个人之间造消息，方便演示 */
function messageAuthor(id: number) {
  if (id === MOCK_ADMIN_ID) return author(MOCK_ADMIN_ID, '王老师', 'admin')
  if (id === MOCK_ME_ID) return MOCK_ME
  const names: Record<number, string> = {
    [MOCK_PEER_LI_SI]: '李四',
    [MOCK_PEER_WANG_WU]: '王五',
    [MOCK_PEER_ZHAO_LIU]: '赵六',
    [MOCK_PEER_SUN_QI]: '孙七',
  }
  return author(id, names[id] ?? `用户${id}`)
}

let nextMessageId = 7100

const messages: MockMessageRecord[] = [
  // ── 和李四：关于「白色无线耳机」（帖子 4）──
  {
    id: MSG_IDS.LI_SI_ASK,
    sender_id: MOCK_PEER_LI_SI,
    receiver_id: MOCK_ME_ID,
    content: '你好，那副白色无线耳机是我的，请问在图书馆哪个服务台？',
    post_id: 4,
    is_read: false, // ← 未读，用来演示小红点
    reminded: false,
    created_at: '2026-10-01T10:00:00+08:00',
  },
  {
    id: MSG_IDS.ME_ANSWER,
    sender_id: MOCK_ME_ID,
    receiver_id: MOCK_PEER_LI_SI,
    content: '三楼服务台，我交到那里了，你报一下耳机的特征就行。',
    post_id: 4,
    is_read: true, // 发出的消息，true 表示"对方已读"
    reminded: true,
    created_at: '2026-10-01T10:20:00+08:00',
  },

  // ── 和李四：关于「校园卡一张」（帖子 2）──
  {
    id: MSG_IDS.LI_SI_ASK_CARD,
    sender_id: MOCK_PEER_LI_SI,
    receiver_id: MOCK_ME_ID,
    content: '校园卡是不是蓝色卡套的？我丢的那张正好是蓝色的。',
    post_id: 2,
    is_read: false, // ← 第二条未读
    reminded: false,
    created_at: '2026-10-01T13:00:00+08:00',
  },
  {
    id: MSG_IDS.ME_ANSWER_CARD,
    sender_id: MOCK_ME_ID,
    receiver_id: MOCK_PEER_LI_SI,
    content: '不是蓝色，是透明卡套。可能不是你的那张。',
    post_id: 2,
    is_read: false, // 对方还没读
    reminded: false,
    created_at: '2026-10-01T13:10:00+08:00',
  },

  // ── 和王五 ──
  {
    id: MSG_IDS.WANG_WU_HELLO,
    sender_id: MOCK_PEER_WANG_WU,
    receiver_id: MOCK_ME_ID,
    content: '在操场捡到一串钥匙，上面有小熊挂件，是你的吗？',
    post_id: 3,
    is_read: true,
    reminded: false,
    created_at: '2026-09-30T19:00:00+08:00',
  },
  {
    id: MSG_IDS.ME_ANSWER_WANG,
    sender_id: MOCK_ME_ID,
    receiver_id: MOCK_PEER_WANG_WU,
    content: '是的！我明天下午去找你拿，谢谢！',
    post_id: 3,
    is_read: true,
    reminded: true,
    created_at: '2026-09-30T19:15:00+08:00',
  },

  // ── 和"王老师"管理员（没有关联帖子）──
  {
    id: MSG_IDS.ME_ASK_ADMIN,
    sender_id: MOCK_ME_ID,
    // ⚠️ 这里必须是 MOCK_ADMIN_ID(9001)，不是 MOCK_PEER_ADMIN(1)。
    //    因为用 admin 学号登录时拿到的 userId 就是 9001 ——
    //    用 1 的话管理员登录后看不到这条消息，管理端的消息页会永远是空的。
    receiver_id: MOCK_ADMIN_ID,
    content: '老师您好，想问一下捡到的东西可以交到哪个办公室？',
    post_id: null,
    is_read: true,
    reminded: false,
    created_at: '2026-09-29T09:00:00+08:00',
  },

  // ── 和赵六、孙七：各一条收到的未读 ──
  {
    id: MSG_IDS.ZHAO_LIU_ASK,
    sender_id: MOCK_PEER_ZHAO_LIU,
    receiver_id: MOCK_ME_ID,
    content: '你发的那个蓝色雨伞还在吗？我舍友前天在二食堂丢了一把。',
    post_id: 5,
    is_read: false, // ← 第三条未读
    reminded: false,
    created_at: '2026-09-28T16:00:00+08:00',
  },
  {
    id: MSG_IDS.SUN_QI_ASK,
    sender_id: MOCK_PEER_SUN_QI,
    receiver_id: MOCK_ME_ID,
    content: '那本《数据结构》教材我领回来了，谢谢你还特地发帖！',
    post_id: 6,
    is_read: true,
    reminded: false,
    created_at: '2026-09-27T11:00:00+08:00',
  },
  {
    id: MSG_IDS.ME_GROUP_REPLY,
    sender_id: MOCK_ME_ID,
    receiver_id: MOCK_PEER_SUN_QI,
    content: '不客气，找到就好。',
    post_id: 6,
    is_read: true,
    reminded: false,
    created_at: '2026-09-27T11:30:00+08:00',
  },
]

/** 按时间倒序（新的在前），和帖子列表一致 */
function byCreatedDesc(a: MockMessageRecord, b: MockMessageRecord): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}

function toRawBrief(m: MockMessageRecord, viewerId: number): RawMessageBrief {
  const isSent = m.sender_id === viewerId
  return {
    id: m.id,
    direction: isSent ? 'sent' : 'received',
    peer: messageAuthor(isSent ? m.receiver_id : m.sender_id),
    content: m.content,
    // 从 post_id 反查帖子标题，模拟后端 join 出来的 { id, title }
    post: m.post_id === null ? null : { id: m.post_id, title: postTitle(m.post_id) },
    is_read: m.is_read,
    reminded: m.reminded,
    created_at: m.created_at,
  }
}

function postTitle(postId: number): string {
  return posts.find((p) => p.id === postId)?.title ?? ''
}

export function __debugMessages(): ReadonlyArray<{
  id: number
  sender_id: number
  receiver_id: number
  content: string
  is_read: boolean
  reminded: boolean
}> {
  return messages.map((m) => ({ ...m }))
}

// ===== M1 未读私信数 =====

export function mockGetUnreadCount(viewerId = MOCK_ME_ID): number {
  const viewer = viewerId || MOCK_ME_ID
  return messages.filter((m) => m.receiver_id === viewer && !m.is_read).length
}

// ===== M2 我的消息 =====
export function mockGetMessageList(query: MessageQuery, viewerId = MOCK_ME_ID): RawMessagePage {
  const viewer = viewerId || MOCK_ME_ID

  // 只返回和我有关的（发出的 + 收到的）
  let list = messages.filter((m) => m.sender_id === viewer || m.receiver_id === viewer)

  // box：all / sent / received
  if (query.box === 'sent') list = list.filter((m) => m.sender_id === viewer)
  if (query.box === 'received') list = list.filter((m) => m.receiver_id === viewer)

  // is_read：契约是"不传返回全部；false 只看未读"
  if (query.isRead === false) list = list.filter((m) => !m.is_read)
  if (query.isRead === true) list = list.filter((m) => m.is_read)

  const sorted = list.slice().sort(byCreatedDesc)

  const pageSize = query.pageSize || 20
  const page = query.page || 1
  const start = (page - 1) * pageSize

  return {
    list: sorted.slice(start, start + pageSize).map((m) => toRawBrief(m, viewer)),
    total: sorted.length,
    page,
    page_size: pageSize,
  }
}

// ===== M3 私信记录（游标分页）=====
export function mockGetConversation(
  peerId: number,
  query: ConversationQuery = {},
  viewerId = MOCK_ME_ID,
): RawConversation {
  const viewer = viewerId || MOCK_ME_ID

  // 我和这个人之间的所有消息
  const both = messages.filter(
    (m) =>
      (m.sender_id === viewer && m.receiver_id === peerId) ||
      (m.sender_id === peerId && m.receiver_id === viewer),
  )

  // 游标：只取 before_id 之前的
  const filtered = query.beforeId ? both.filter((m) => m.id < query.beforeId!) : both

  const ascending = filtered.slice().sort((a, b) => a.id - b.id)

  const limit = Math.min(query.limit ?? 20, 50)
  const hasMore = ascending.length > limit
  const pageItems = hasMore ? ascending.slice(ascending.length - limit) : ascending

  // mark_read 默认 true：进聊天页就把对方发给我的标为已读
  if (query.markRead !== false) {
    for (const m of pageItems) {
      if (m.receiver_id === viewer) m.is_read = true
    }
  }

  // 「李老师」(id=1) 没绑联系方式，所以和他聊天时不显示提醒开关
  const canRemind = peerId !== MOCK_PEER_ADMIN

  return {
    peer: messageAuthor(peerId),
    can_remind: canRemind,
    list: pageItems.map((m) => ({
      id: m.id,
      direction: m.sender_id === viewer ? 'sent' : 'received',
      content: m.content,
      is_read: m.is_read,
      reminded: m.reminded,
      created_at: m.created_at,
    })),
    has_more: hasMore,
  }
}

// ===== M4 发送私信 =====
export function mockSendMessage(
  payload: SendMessagePayload,
  senderId = MOCK_ME_ID,
): RawSendMessage {
  const sender = senderId || MOCK_ME_ID

  const selfSend = payload.receiverId === sender

  const created: MockMessageRecord = {
    id: nextMessageId++,
    sender_id: sender,
    receiver_id: payload.receiverId,
    content: payload.content,
    post_id: payload.postId ?? null,
    // 自己刚发的消息，对方当然还没读
    is_read: false,
    // reminded 由下面的提醒逻辑决定
    reminded: false,
    created_at: new Date().toISOString(),
  }

  // ⚠️ 提醒失败不影响私信本身（契约原文），所以先把消息存进去
  messages.push(created)

  // 假后端算提醒结果，规则和契约的表格一一对应
  let remind: { status: string; channel: string | null; reason: string | null }
  if (!payload.remind) {
    remind = { status: 'skipped', channel: null, reason: 'not_requested' }
  } else if (selfSend) {
    // 界面上不该出现这种情况，真后端会直接 40300
    remind = { status: 'skipped', channel: null, reason: 'no_contact' }
  } else if (payload.receiverId === MOCK_PEER_ADMIN) {
    // 王老师没绑手机/邮箱 —— 用来演示"对方没有联系方式"
    remind = { status: 'skipped', channel: null, reason: 'no_contact' }
  } else {
    // 有手机号就发短信（契约的渠道选择规则：有手机号发短信，否则发邮件）
    remind = { status: 'sent', channel: 'sms', reason: null }
    created.reminded = true
  }

  return {
    message: {
      id: created.id,
      direction: 'sent',
      content: created.content,
      is_read: created.is_read,
      reminded: created.reminded,
      created_at: created.created_at,
    },
    remind,
  }
}

// ===== M5 标记已读 =====
export function mockMarkRead(payload: MarkReadPayload, viewerId = MOCK_ME_ID): RawMarkRead {
  const viewer = viewerId || MOCK_ME_ID
  let updated = 0

  for (const m of messages) {
    // 只有"我收到的"才谈得上"我把它标为已读"
    if (m.receiver_id !== viewer) continue

    const hit = payload.ids && payload.ids.length > 0
      ? payload.ids.includes(m.id)
      : payload.peerId
        ? m.sender_id === payload.peerId
        : true // all

    if (hit && !m.is_read) {
      m.is_read = true
      updated += 1
    }
  }

  return { updated, unread_total: mockGetUnreadCount(viewer) }
}

// ===== U6 查看发帖人信息 =====

export function mockGetUserProfile(
  userId: number,
  viewerId = MOCK_ME_ID,
  viewerIsAdmin = false,
): RawUserProfile {
  const isSelf = userId === (viewerId || MOCK_ME_ID)

  // 只给已知的几个假用户造资料，其他人给一份通用资料
  const known: Record<number, { name: string; role: string; posts: number }> = {
    [MOCK_ME_ID]: { name: '张三', role: 'student', posts: 2 },
    [MOCK_PEER_LI_SI]: { name: '李四', role: 'student', posts: 1 },
    [MOCK_PEER_WANG_WU]: { name: '王五', role: 'student', posts: 0 },
    [MOCK_PEER_ZHAO_LIU]: { name: '赵六', role: 'student', posts: 1 },
    [MOCK_PEER_SUN_QI]: { name: '孙七', role: 'student', posts: 1 },
    [MOCK_ADMIN_ID]: { name: '王老师', role: 'admin', posts: 0 },
    [MOCK_PEER_ADMIN]: { name: '王老师', role: 'admin', posts: 0 },
  }
  const info = known[userId] ?? { name: `用户${userId}`, role: 'student', posts: 0 }

  return {
    id: userId,
    name: info.name,
    avatar_url: `https://cdn.example.com/avatar/${userId}.png`,
    role: info.role,
    post_count: info.posts,
    // 契约：不能私信自己
    can_message: !isSelf,
    // 「李老师」(MOCK_PEER_ADMIN) 没绑联系方式，所以不能提醒他
    can_remind: !isSelf && userId !== MOCK_PEER_ADMIN,
    // ⚠️ 只有管理员查看时才有 detail。普通用户这里是 null。
    detail: viewerIsAdmin
      ? {
          student_id: `2021${String(userId).padStart(6, '0')}`,
          phone: userId === MOCK_PEER_ADMIN ? null : `138${String(userId).padStart(8, '0')}`,
          email: `user${userId}@example.com`,
          allow_remind: true,
          created_at: '2026-09-01T09:00:00+08:00',
          last_login_at: '2026-10-02T18:30:00+08:00',
        }
      : null,
  }
}

/** 当前登录用户（U1）的假数据。U2 改资料、U5 绑联系方式都会改它。 */
const meProfile: RawUserMe = {
  id: MOCK_ME_ID,
  student_id: '202301010101',
  name: '张三',
  avatar_url: 'https://cdn.example.com/avatar/1001.png',
  role: 'student',
  phone: '13812345678',
  email: 'zhangsan@example.com',
  allow_remind: true,
  theme: 'system',
  post_count: 2,
  created_at: '2026-09-01T10:00:00+08:00',
}

let pendingCode: { channel: string; target: string; code: string } | null = null

/** U1 获取当前用户信息 */
export function mockGetMe(): RawUserMe {
  return { ...meProfile }
}

export function mockUpdateMe(payload: {
  avatarUrl?: string
  theme?: string
  allowRemind?: boolean
}): RawUserMe {
  if (payload.avatarUrl !== undefined) meProfile.avatar_url = payload.avatarUrl
  if (payload.theme !== undefined) meProfile.theme = payload.theme
  if (payload.allowRemind !== undefined) meProfile.allow_remind = payload.allowRemind
  return { ...meProfile }
}

let MOCK_CURRENT_PASSWORD = 'abc12345'

export function mockChangePassword(payload: {
  oldPassword: string
  newPassword: string
}): void {
  if (payload.oldPassword !== MOCK_CURRENT_PASSWORD) {
    mockFail('原密码错误')
  }
  if (!MOCK_PASSWORD_OK(payload.newPassword)) {
    mockFail('新密码格式不合法')
  }
  // 记住新密码，模拟真后端的持久化
  MOCK_CURRENT_PASSWORD = payload.newPassword
}

/** 密码规则：8~32 位且同时含字母和数字（和 contract.ts 的 isValidPassword 同一套） */
function MOCK_PASSWORD_OK(pwd: string): boolean {
  if (pwd.length < 8 || pwd.length > 32) return false
  return /[A-Za-z]/.test(pwd) && /\d/.test(pwd)
}

export function mockSendCode(payload: { channel: string; target: string }): void {
  if (!payload.target) mockFail('手机号或邮箱不能为空')
  // 简单的格式校验，模拟契约里的 400 / 40000
  if (payload.channel === 'sms' && !/^\d{11}$/.test(payload.target)) {
    mockFail('手机号格式不正确')
  }
  if (payload.channel === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.target)) {
    mockFail('邮箱格式不正确')
  }

  pendingCode = { channel: payload.channel, target: payload.target, code: '123456' }
}

export function mockBindContact(payload: {
  channel: string
  target: string
  code: string
}): RawContactResult {
  if (!pendingCode) {
    mockFail('请先获取验证码')
  }
  if (pendingCode.channel !== payload.channel || pendingCode.target !== payload.target) {
    mockFail('手机号或邮箱和获取验证码时不一致')
  }
  if (pendingCode.code !== payload.code) {
    mockFail('验证码错误或已过期')
  }

  // 绑定成功：写进 meProfile，并清掉这次验证码（真后端也是一次性的）
  if (payload.channel === 'sms') meProfile.phone = payload.target
  if (payload.channel === 'email') meProfile.email = payload.target
  pendingCode = null

  return { phone: meProfile.phone ?? null, email: meProfile.email ?? null }
}

export function mockListAdmins(): RawAdminContact[] {
  return [
    {
      id: MOCK_ADMIN_ID,
      name: '王老师',
      avatar_url: `https://cdn.example.com/avatar/${MOCK_ADMIN_ID}.png`,
      role: 'admin',
      email: 'teacher.wang@example.com',
      can_message: true,
    },
    {
      id: MOCK_PEER_ADMIN,
      name: '李老师',
      avatar_url: `https://cdn.example.com/avatar/${MOCK_PEER_ADMIN}.png`,
      role: 'admin',
      // 故意不给邮箱：用来演示"没有公开邮箱"这个分支
      email: null,
      can_message: true,
    },
  ]
}
