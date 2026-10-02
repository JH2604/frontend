import type {
  ItemQuery,
  ItemStatus,
  ItemType,
  RawPost,
  RawPostBrief,
  RawPostPage,
  RawStatusPatch,
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
    // 假登录的 id 和 MOCK_ME_ID 保持一致，
    // 这样"我发的帖子 / 我发的评论"在 mock 模式下才认得出是自己。
    // C++ 类比：假的 session 里也得塞上同一个 uid，否则权限判断对不上号。
    userId: isAdmin ? 9001 : MOCK_ME_ID,
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
//
// 📌 2026-10-02 v1.1 契约变更后，这里【没有评论假数据了】：
//    评论模块 C1~C3 被整个删除，comment_count 字段也从 P1/P2 消失。
//    别照着旧文档把评论假数据加回来。见 types/api.ts 末尾那段说明。
// =====================================================================

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

/**
 * 假后端自己算"当前用户能不能删这个帖子"（契约 P4：本人【或管理员】）。
 *
 * ⚠️ 为什么要按 viewerIsAdmin 现算，而不是把 can_delete 写死在种子数据里？
 *    写死 = 用假数据把真后端的行为盖住：
 *      - 管理员登录后看到的还是 false（真后端这时会给 true）
 *      - "管理员能不能删别人的帖子"这条权限永远测不出来
 *    这是上一轮（评论模块）实测踩到的坑，这里保持同样的做法。
 */
function postCanDeleteFor(post: RawPost, viewerIsAdmin = false): boolean {
  if (viewerIsAdmin) return true
  return post.author?.id === MOCK_ME_ID
}

// ===== P2 帖子详情 =====
export function mockGetItemDetail(id: number, viewerIsAdmin = false): RawPost {
  const found = posts.find((p) => p.id === id)
  if (!found) {
    // 真后端是 404 / 40400，这里抛错让页面走"没有找到这条信息"的分支
    throw new Error('帖子不存在或已删除')
  }
  return {
    ...found,
    is_mine: found.author?.id === MOCK_ME_ID,
    can_delete: postCanDeleteFor(found, viewerIsAdmin),
    // 契约 P2：can_change_status「仅本人为 true」。
    // 契约第 7 章权限表还写明"修改他人帖子的状态 → 管理员也 ✗"，
    // 所以这里【不看 viewerIsAdmin】，只认作者本人。
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

// ===== P5 修改状态，仅发帖人本人 =====
// v1.1 的返回体只有三个字段：{ id, status, closed_at }
// （v1.0 返回的是完整帖子详情，已作废 —— 页面也因此必须重新拉一次 P2）
export function mockUpdateItemStatus(id: number, status: ItemStatus): RawStatusPatch {
  const found = posts.find((p) => p.id === id)
  if (!found) throw new Error('帖子不存在或已删除')

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

