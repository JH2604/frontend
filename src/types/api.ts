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