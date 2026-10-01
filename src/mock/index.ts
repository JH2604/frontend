import type {
  Item,
  ItemQuery,
  ItemStatus,
  Claim,
  ClaimQuery,
  ClaimStatus,
  PageResult,
} from '@/types/api'

// ===== 总开关 =====
// 后端接口通了以后，把这里改成 false，全项目就切到真实接口
export const USE_MOCK = true

// 模拟网络延迟，让 loading 动画看得见
export function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ===== 假登录 / 假注册 =====
// 契约（文档 A1/A2）：
//   入参 { student_id, password }（注册时还要 role）
//   出参 { access_token, refresh_token, user: { name, role, ... } }
// 这里模拟成"名字来自实名库"的效果：你输学号，界面上显示的是后端查出来的名字。
// 想用管理员身份，注册时选"管理员"，或者学号直接填 admin。
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
    // 注意这里展示的是"后端查出来的实名"，不是用户敲的学号
    username: isAdmin ? '管理员' : data.studentId,
  }
}

export function mockRegister(data: MockLoginParams) {
  return mockLogin(data)
}

// ===== 假数据 =====

export const mockCategories = [
  { id: 1, name: '证件卡片' },
  { id: 2, name: '电子产品' },
  { id: 3, name: '钱包钥匙' },
  { id: 4, name: '其他' },
]

let mockItems: Item[] = [
  {
    id: 1,
    title: '黑色钱包',
    type: 'lost',
    categoryId: 3,
    description: '在图书馆三楼自习时丢失，内有学生卡、身份证和少量现金。',
    images: [],
    place: '图书馆三楼',
    happenTime: '2026-09-19 14:00',
    status: 'published',
    userId: 1,
    createdAt: '2026-09-19 15:00',
  },
  {
    id: 2,
    title: '学生卡（李四）',
    type: 'found',
    categoryId: 1,
    description: '在二食堂门口捡到，已交到宿管处。',
    images: [],
    place: '第二食堂',
    happenTime: '2026-09-20 12:00',
    status: 'pending',
    userId: 2,
    createdAt: '2026-09-20 12:30',
  },
  {
    id: 3,
    title: '白色蓝牙耳机',
    type: 'lost',
    categoryId: 2,
    description: '充电盒上有划痕，在体育馆打羽毛球时丢的。',
    images: [],
    place: '体育馆',
    happenTime: '2026-09-21 19:30',
    status: 'published',
    userId: 1,
    createdAt: '2026-09-21 20:00',
  },
  {
    id: 4,
    title: '一串钥匙',
    type: 'found',
    categoryId: 3,
    description: '挂着一个小熊挂件，在教学楼 A 座一楼捡到。',
    images: [],
    place: '教学楼 A 座',
    happenTime: '2026-09-22 09:10',
    status: 'published',
    userId: 3,
    createdAt: '2026-09-22 09:30',
  },
  {
    id: 5,
    title: '考研数学笔记',
    type: 'lost',
    categoryId: 4,
    description: '蓝色活页本，封面写有名字，内容很重要。',
    images: [],
    place: '第三教学楼 201',
    happenTime: '2026-09-22 16:00',
    status: 'rejected',
    userId: 1,
    createdAt: '2026-09-22 16:20',
  },
  {
    id: 6,
    title: '银色保温杯',
    type: 'found',
    categoryId: 4,
    description: '在图书馆二楼靠窗位置捡到。',
    images: [],
    place: '图书馆二楼',
    happenTime: '2026-09-23 11:00',
    status: 'published',
    userId: 2,
    createdAt: '2026-09-23 11:15',
  },
]

// ===== 假接口：把后端要干的活在前端演一遍 =====

// 列表：支持关键字 / 分类 / 状态筛选，再分页
export function mockGetItemList(query: ItemQuery): PageResult<Item> {
  const { page = 1, pageSize = 10, keyword, categoryId, status } = query

  let rows = [...mockItems]
  if (keyword) rows = rows.filter((it) => it.title.includes(keyword))
  if (categoryId) rows = rows.filter((it) => it.categoryId === categoryId)
  if (status) rows = rows.filter((it) => it.status === status)

  const start = (page - 1) * pageSize
  return {
    list: rows.slice(start, start + pageSize),
    total: rows.length,
    page,
    pageSize,
  }
}

// 详情
export function mockGetItemDetail(id: number): Item {
  const found = mockItems.find((it) => it.id === id)
  if (!found) throw new Error('物品不存在')
  return found
}

// 新建：分配一个新 id，插到最前面
export function mockCreateItem(data: Partial<Item>): Item {
  const maxId = mockItems.reduce((max, it) => (it.id > max ? it.id : max), 0)
  const item: Item = {
    id: maxId + 1,
    title: data.title ?? '',
    type: data.type ?? 'lost',
    categoryId: data.categoryId ?? 0,
    description: data.description ?? '',
    images: data.images ?? [],
    place: data.place ?? '',
    happenTime: data.happenTime ?? '',
    status: 'pending',
    userId: 1,
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  mockItems = [item, ...mockItems]
  return item
}

// 审核：改状态（管理员"通过"传 published，"驳回"传 rejected，"关闭"传 closed）
export function mockUpdateItemStatus(id: number, status: ItemStatus): Item {
  const found = mockItems.find((it) => it.id === id)
  if (!found) throw new Error('物品不存在')

  // found 是数组里那个对象本身，改它就是改原数据
  found.status = status
  return found
}

// 删除：把这条从数组里过滤掉
export function mockDeleteItem(id: number): void {
  mockItems = mockItems.filter((it) => it.id !== id)
}

// ===== 认领申请 =====

let mockClaims: Claim[] = [
  {
    id: 1,
    itemId: 1,
    itemTitle: '黑色钱包',
    userId: 1,
    username: 'zhangsan',
    contact: '138****1234',
    message: '钱包是我丢的，里面有我的学生卡，卡号后四位 6789。',
    status: 'pending',
    createdAt: '2026-09-24 10:20',
  },
  {
    id: 2,
    itemId: 6,
    itemTitle: '银色保温杯',
    userId: 1,
    username: 'zhangsan',
    contact: '微信 fu****',
    message: '杯底有个小凹痕，是我的。',
    status: 'approved',
    createdAt: '2026-09-25 09:05',
  },
]

// 认领：提交申请。默认状态是待审核，等管理员处理
export function mockCreateClaim(data: Partial<Claim>): Claim {
  const maxId = mockClaims.reduce((max, c) => (c.id > max ? c.id : max), 0)
  const claim: Claim = {
    id: maxId + 1,
    itemId: data.itemId ?? 0,
    itemTitle: data.itemTitle ?? '',
    userId: 1,
    username: 'zhangsan',
    contact: data.contact ?? '',
    message: data.message ?? '',
    status: 'pending',
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  mockClaims = [claim, ...mockClaims]
  return claim
}

// 认领：我的申请（真后端会按 token 里的 user_id 过滤，这里写死 1）
export function mockGetMyClaims(query: ClaimQuery): PageResult<Claim> {
  const { page = 1, pageSize = 10, status } = query

  let rows = mockClaims.filter((c) => c.userId === 1)
  if (status) rows = rows.filter((c) => c.status === status)

  const start = (page - 1) * pageSize
  return {
    list: rows.slice(start, start + pageSize),
    total: rows.length,
    page,
    pageSize,
  }
}

// 认领：管理端看全部申请
export function mockGetClaimList(query: ClaimQuery): PageResult<Claim> {
  const { page = 1, pageSize = 10, status } = query

  let rows = [...mockClaims]
  if (status) rows = rows.filter((c) => c.status === status)

  const start = (page - 1) * pageSize
  return {
    list: rows.slice(start, start + pageSize),
    total: rows.length,
    page,
    pageSize,
  }
}

// 认领：审核
export function mockAuditClaim(id: number, status: ClaimStatus): Claim {
  const found = mockClaims.find((c) => c.id === id)
  if (!found) throw new Error('认领申请不存在')
  found.status = status
  return found
}
