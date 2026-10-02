import type {
  ItemQuery,
  ItemStatus,
  ItemType,
  RawPost,
  RawPostBrief,
  RawPostPage,
  CreateItemPayload,
} from '@/types/api'

// ===== 总开关 =====
// 后端接口通了以后，把这里改成 false，全项目就切到真实接口
export const USE_MOCK = true

// 模拟网络延迟，让 loading 动画看得见
export function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ===== 假登录 / 假注册（文档 A1/A2）=====
// 契约入参：{ student_id, password }（注册时还要 role）
// 契约出参：{ access_token, refresh_token, user: { name, role, ... } }
// 这里模拟成"名字来自实名库"的效果：你输学号，界面上显示的是后端查出来的名字。
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
  }
}

export function mockRegister(data: MockLoginParams) {
  return mockLogin(data)
}

// =====================================================================
// 假数据（严格按接口文档的【原始形状】写，下划线命名）
//
// ⚠️ 这一点很重要：假数据故意做成"后端返回的原样"，
//    这样 src/api/item.ts 里的字段转换代码在 USE_MOCK = true 时也会被真正跑一遍。
//    如果假数据直接写成驼峰，等切到真后端时转换层才第一次执行，很容易翻车。
// =====================================================================

/** 假装当前登录用户的 id，用来实现 mine=true（我发布的） */
const MOCK_ME_ID = 1001
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
    comment_count: 0,
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
    comment_count: 0,
    author: author(1002, '李四'),
    is_mine: false,
    can_delete: false,
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
    comment_count: 0,
    author: author(1003, '王五'),
    is_mine: false,
    can_delete: false,
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
    comment_count: 0,
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
    comment_count: 0,
    author: author(1004, '赵六'),
    is_mine: false,
    can_delete: false,
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
    comment_count: 0,
    author: author(1005, '孙七'),
    is_mine: false,
    can_delete: false,
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
    comment_count: p.comment_count,
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

// ===== P2 帖子详情 =====
export function mockGetItemDetail(id: number): RawPost {
  const found = posts.find((p) => p.id === id)
  if (!found) {
    // 真后端是 404 / 40400，这里抛错让页面走"没有找到这条信息"的分支
    throw new Error('帖子不存在或已删除')
  }
  return { ...found, is_mine: found.author?.id === MOCK_ME_ID, can_delete: found.author?.id === MOCK_ME_ID }
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
    comment_count: 0,
    author: MOCK_ME,
    is_mine: true,
    can_delete: true,
    created_at: new Date().toISOString(),
  }
  posts.unshift(created)
  return created
}

// ===== P5 修改状态（标记已找回 / 已认领），仅发帖人 =====
export function mockUpdateItemStatus(id: number, status: ItemStatus): RawPost {
  const found = posts.find((p) => p.id === id)
  if (!found) throw new Error('帖子不存在或已删除')
  found.status = status
  return { ...found }
}

// ===== P4 删除帖子 =====
export function mockDeleteItem(id: number): void {
  const idx = posts.findIndex((p) => p.id === id)
  if (idx >= 0) posts.splice(idx, 1)
}
// ===== F1 文件上传 =====
// 假实现：不发任何请求，直接返回一个"看起来像真的"的上传结果。
// 真后端返回的是 { url, width, height, size }（文档 F1）。
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
