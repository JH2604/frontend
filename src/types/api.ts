import type { RoleValue } from '@/utils/contract'

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

/** 帖子状态：open 进行中 / closed 已找回、已认领 */
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
  commentCount: number
  author: Author
  createdAt: string
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
  commentCount: number
  author: Author
  /** 是否是当前用户发布的 */
  isMine: boolean
  /** 后端算好的"能不能删"（本人或管理员），前端据此显示删除按钮 */
  canDelete: boolean
  createdAt: string
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
  sortBy?: 'created_at' | 'comment_count'
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
  comment_count?: number | null
  author?: RawAuthor | null
  created_at?: string | null
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
  comment_count?: number | null
  author?: RawAuthor | null
  is_mine?: boolean | null
  can_delete?: boolean | null
  created_at?: string | null
}

/** P1 列表响应里 data 的原始形状 */
export interface RawPostPage {
  list?: RawPostBrief[] | null
  total?: number | null
  page?: number | null
  page_size?: number | null
}