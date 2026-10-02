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
  RawStatusPatch,
  StatusPatchResult,
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
import { API_POSTS_PATH, PAGE_SIZE_DEFAULT, Role, postPath, postStatusPath, type RoleValue } from '@/utils/contract'

// =====================================================================
// 帖子（帖子 = 我们以前说的"物品"，只是名字对齐契约）
//
// 这个文件是发生"下划线 <-> 驼峰"转换的两个地方之一（另一个是 utils/contract.ts
// 里的通用取值函数）。页面永远只见到驼峰字段。
//
// 为什么要多这一层？
//   1. 后端将来改字段名，只改这个文件，页面一行都不用动。
//   2. 后端某个字段忘了传（null），在这一层统一兜底成默认值，
//      页面永远不会拿到 undefined 去渲染，也就不会白屏。
//   3. 转换代码只写一遍。要是散在 6 个页面里，漏一个就是线上 bug。
//
// 对应的接口（2026-10-02 v1.1 文档第 5 章）：
//   P1 GET    /posts                  列表（首页 / 搜索 / 我的帖子 都用它）
//   P2 GET    /posts/{post_id}         详情
//   P3 POST   /posts                  发布
//   P4 DELETE /posts/{post_id}         删除（本人或管理员）
//   P5 PATCH  /posts/{post_id}/status  改状态（仅发帖人本人）
//
// ⚠️ v1.1 相对 v1.0 在这个文件里的三处变化：
//   1. P5 路径多了 /status（以前和 P2 同路径，只靠 method 区分）
//   2. P5 返回体从"完整详情"缩成 { id, status, closed_at }
//   3. P1 去掉了 sort_by 参数；P1 / P2 去掉了 comment_count 字段
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
    author: toAuthor(raw.author),
    createdAt: raw.created_at ?? '',
    closedAt: raw.closed_at ?? null,
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
    author: toAuthor(raw.author),
    isMine: raw.is_mine ?? false,
    canDelete: raw.can_delete ?? false,
    // fail-closed：后端没给这个字段就当"不能改"，绝不默认放开
    canChangeStatus: raw.can_change_status ?? false,
    createdAt: raw.created_at ?? '',
    closedAt: raw.closed_at ?? null,
  }
}

/**
 * P5 返回体：后端原始形状 -> 内部形状（v1.1）。
 * 和 toItem 分开写：契约只给 id / status / closed_at 三个字段，
 * 拿它去走 toItem 会凭空造出一堆默认值（标题变成空字符串等）。
 */
function toStatusPatch(raw: RawStatusPatch): StatusPatchResult {
  return {
    id: raw.id ?? 0,
    status: toStatus(raw.status),
    closedAt: raw.closed_at ?? null,
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
 *
 * ⚠️ v1.1 之后这里【没有 sort_by 了】：P1 的 sort_by 参数被整个移除，
 *    只保留 order（按发布时间 asc / desc）。
 *    详见 types/api.ts 里 ItemQuery 的注释。
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
 * P5 修改帖子状态（标记已找到 / 已认领，或撤回为进行中）。
 *
 * v1.1 有**两处破坏性变更**，都在这个函数里：
 *
 *   1. 路径多了 `/status`：
 *        旧 PATCH /posts/{id}      →  新 PATCH /posts/{id}/status
 *        所以这里用 postStatusPath(id)，不能用 postPath(id)。
 *
 *   2. 返回体变了：
 *        旧：完整帖子详情            新：{ id, status, closed_at }
 *        所以**不能**再走 toItem()。走了的话标题、正文全变成空字符串，
 *        用户会看到"改完状态之后标题没了"。
 *        这里单独用一个小的映射，诚实反映契约。
 *
 * ⚠️ 权限：契约第 7 章权限表写明"修改他人帖子的状态 → 管理员也 ✗"。
 *    所以按钮只在 canChangeStatus 为 true 时显示，管理端【不提供】这个操作。
 */
export async function updateItemStatus(
  id: number,
  status: ItemStatus,
): Promise<StatusPatchResult> {
  if (USE_MOCK) {
    await delay()
    return toStatusPatch(mockUpdateItemStatus(id, status))
  }
  return toStatusPatch(
    await http<RawStatusPatch>({
      url: postStatusPath(id),
      method: 'patch',
      data: { status },
    }),
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
