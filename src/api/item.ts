import { http } from '@/utils/request'
import type {
  Author,
  CreateItemPayload,
  Item,
  ItemBrief,
  ItemQuery,
  ItemStatus,
  ItemType,
  Location,
  PageResult,
  RawAuthor,
  RawLocation,
  RawPost,
  RawPostBrief,
  RawPostPage,
} from '@/types/api'
import {
  USE_MOCK,
  delay,
  mockCreateItem,
  mockDeleteItem,
  mockGetItemDetail,
  mockGetItemList,
  mockUpdateItemStatus,
} from '@/mock'
import { API_POSTS_PATH, PAGE_SIZE_DEFAULT, Role, postPath, type RoleValue } from '@/utils/contract'

// =====================================================================
// 帖子（帖子 = 我们以前说的"物品"，只是名字对齐契约）
//
// 这个文件是【唯一】发生"下划线 <-> 驼峰"转换的地方。
//   后端给的：created_at / cover_url / content_preview / event_time ...
//   页面用的：createdAt  / coverUrl  / contentPreview / eventTime ...
//
// 为什么要多这一层？
//   1. 后端将来改字段名，只改这个文件，页面一行都不用动。
//   2. 后端某个字段忘了传（null），在这一层统一兜底成默认值，
//      页面永远不会拿到 undefined 去渲染，也就不会白屏。
//   3. 转换代码只写一遍。要是散在 6 个页面里，漏一个就是线上 bug。
//
// 对应的接口（文档 5 章）：
//   P1 GET    /posts            列表（首页 / 搜索 / 我的帖子 都用它）
//   P2 GET    /posts/{post_id}   详情
//   P3 POST   /posts            发布
//   P4 DELETE /posts/{post_id}   删除（本人或管理员）
//   P5 PATCH  /posts/{post_id}   改状态（仅发帖人）
// =====================================================================

// ---------------------------------------------------------------------
// 一、后端原始形状 -> 前端内部形状
// ---------------------------------------------------------------------

/** 把后端可能为 null 的地点补成"至少有名字"的对象 */
function toLocation(raw: RawLocation | null | undefined): Location {
  return {
    name: raw?.name ?? '',
    latitude: raw?.latitude ?? null,
    longitude: raw?.longitude ?? null,
  }
}

/**
 * 把后端的 role 字符串收敛成我们认识的两个值。
 * 认不出来一律当学生（fail-closed：认不出来就不给管理员权限）。
 */
function toRole(raw: string | null | undefined): RoleValue {
  return raw === Role.ADMIN ? Role.ADMIN : Role.STUDENT
}

/** 把后端可能为 null 的作者补成"未知用户" */
function toAuthor(raw: RawAuthor | null | undefined): Author {
  return {
    id: raw?.id ?? 0,
    name: raw?.name ?? '未知用户',
    avatarUrl: raw?.avatar_url ?? '',
    role: toRole(raw?.role),
  }
}

function toType(raw: string | null | undefined): ItemType {
  return raw === 'found' ? 'found' : 'lost'
}

/**
 * 状态只有 open / closed 两种。
 * 后端将来要是多出一个值，这里会把它当成 open（进行中），
 * 这样至少不会因为一个没见过的新状态导致整页渲染不出来。
 */
function toStatus(raw: string | null | undefined): ItemStatus {
  return raw === 'closed' ? 'closed' : 'open'
}

/** P1 列表项：后端原始形状 -> 内部形状 */
function toBrief(raw: RawPostBrief): ItemBrief {
  return {
    id: raw.id ?? 0,
    type: toType(raw.type),
    title: raw.title ?? '',
    contentPreview: raw.content_preview ?? '',
    coverUrl: raw.cover_url ?? null,
    imageCount: raw.image_count ?? 0,
    location: toLocation(raw.location),
    status: toStatus(raw.status),
    commentCount: raw.comment_count ?? 0,
    author: toAuthor(raw.author),
    createdAt: raw.created_at ?? '',
  }
}

/** P2 详情：后端原始形状 -> 内部形状 */
function toItem(raw: RawPost): Item {
  return {
    id: raw.id ?? 0,
    type: toType(raw.type),
    title: raw.title ?? '',
    content: raw.content ?? '',
    images: raw.images ?? [],
    location: toLocation(raw.location),
    eventTime: raw.event_time ?? null,
    status: toStatus(raw.status),
    commentCount: raw.comment_count ?? 0,
    author: toAuthor(raw.author),
    isMine: raw.is_mine ?? false,
    canDelete: raw.can_delete ?? false,
    createdAt: raw.created_at ?? '',
  }
}

// ---------------------------------------------------------------------
// 二、前端内部形状 -> 发给后端的样子
// ---------------------------------------------------------------------

/**
 * 列表查询参数：驼峰 -> 下划线。
 *
 * 注意这里"空的参数直接不放进去"：
 *   type=all 是前端下拉框的"全部"，契约里没有 all 这个值，
 *   所以不能发出去，不发就等于"不筛选"。
 */
function toQueryParams(params: ItemQuery): Record<string, unknown> {
  const q: Record<string, unknown> = {
    page: params.page,
    page_size: params.pageSize,
  }

  if (params.type && params.type !== 'all') q.type = params.type
  if (params.status && params.status !== 'all') q.status = params.status
  if (params.keyword && params.keyword.trim()) q.keyword = params.keyword.trim()
  if (params.mine) q.mine = true
  if (params.sortBy) q.sort_by = params.sortBy
  if (params.order) q.order = params.order

  return q
}

/** 发布帖子的请求体：驼峰 -> 下划线（文档 P3） */
function toCreateBody(payload: CreateItemPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    type: payload.type,
    title: payload.title,
    content: payload.content,
    // P3 里 location 是【必填】，至少要有 name
    location: {
      name: payload.location.name,
      latitude: payload.location.latitude ?? null,
      longitude: payload.location.longitude ?? null,
    },
  }

  // images 是可选的：一张都没有就别发这个字段
  if (payload.images && payload.images.length > 0) body.images = payload.images
  // event_time 也是可选的
  if (payload.eventTime) body.event_time = payload.eventTime

  return body
}

// ---------------------------------------------------------------------
// 三、对外的 5 个函数
// ---------------------------------------------------------------------

/**
 * P1 帖子列表。
 * 首页、搜索结果、"我发布的"三个页面共用这一个函数，
 * 区别只在传进来的 params 里 mine 是不是 true。
 */
export async function getItemList(params: ItemQuery): Promise<PageResult<ItemBrief>> {
  if (USE_MOCK) {
    await delay()
    const raw = mockGetItemList(params)
    return {
      // 假数据也走一遍 toBrief，保证转换代码在 mock 模式下就被真跑过
      list: (raw.list ?? []).map(toBrief),
      total: raw.total ?? 0,
      page: raw.page ?? 1,
      pageSize: raw.page_size ?? params.pageSize ?? PAGE_SIZE_DEFAULT,
    }
  }

  const raw = await http<RawPostPage>({
    url: API_POSTS_PATH,
    method: 'get',
    params: toQueryParams(params),
  })

  return {
    list: (raw?.list ?? []).map(toBrief),
    total: raw?.total ?? 0,
    page: raw?.page ?? 1,
    pageSize: raw?.page_size ?? params.pageSize ?? PAGE_SIZE_DEFAULT,
  }
}

/** P2 帖子详情。找不到时后端返回 40400，异常由调用方 catch 成"没有找到这条信息" */
export async function getItemDetail(id: number): Promise<Item> {
  if (USE_MOCK) {
    await delay()
    return toItem(mockGetItemDetail(id))
  }
  return toItem(await http<RawPost>({ url: postPath(id), method: 'get' }))
}

/** P3 发布帖子 */
export async function createItem(payload: CreateItemPayload): Promise<Item> {
  if (USE_MOCK) {
    await delay(400)
    return toItem(mockCreateItem(payload))
  }
  return toItem(
    await http<RawPost>({
      url: API_POSTS_PATH,
      method: 'post',
      data: toCreateBody(payload),
    }),
  )
}

/**
 * P5 修改帖子状态（标记已找回 / 已认领）。
 *
 * 注意契约里写明【只有发帖人本人】能改，
 * 所以这个按钮只在详情页 isMine 为 true 时才显示，
 * 管理端不提供"改状态"，管理员要做的是删除（P4）。
 */
export async function updateItemStatus(id: number, status: ItemStatus): Promise<Item> {
  if (USE_MOCK) {
    await delay()
    return toItem(mockUpdateItemStatus(id, status))
  }
  return toItem(
    await http<RawPost>({ url: postPath(id), method: 'patch', data: { status } }),
  )
}

/**
 * P4 删除帖子（本人或管理员）。
 * reason 是可选的，删别人的帖子时说明一下原因比较得体。
 */
export async function deleteItem(id: number, reason?: string): Promise<void> {
  if (USE_MOCK) {
    await delay(200)
    return mockDeleteItem(id)
  }
  return http<void>({
    url: postPath(id),
    method: 'delete',
    data: reason ? { reason } : undefined,
  })
}
