import { http } from '@/utils/request'
import type { Item, ItemQuery, ItemStatus, PageResult } from '@/types/api'
import {
  USE_MOCK,
  delay,
  mockGetItemList,
  mockGetItemDetail,
  mockCreateItem,
  mockUpdateItemStatus,
  mockDeleteItem,
} from '@/mock'
import { API_POSTS_PATH, normalizePageResult, postPath, type RawPageResult } from '@/utils/contract'

// ⚠️ 契约对齐说明（2026-10-02 群里通知）：
//   路径全部统一到 /api/v1/，统一前缀在 utils/request.ts 的 baseURL 里，
//   所以这里只写资源名。
//
//   我们代码里叫"物品 item"，契约（文档 5 章）里叫"帖子 post" —— 是同一个东西。
//   对应的接口：
//     P1 GET    /posts                列表（首页 / 搜索 / 我的帖子 合并）
//     P2 GET    /posts/{post_id}       详情
//     P3 POST   /posts                发布
//     P4 DELETE /posts/{post_id}       删除
//     P5 PATCH  /posts/{post_id}       改状态【建议，待定】
//
//   路径前缀统一由 contract.ts 的 API_PREFIX 决定，这里不写死。

// 列表（带分页、搜索、分类筛选）
// 契约里的查询参数：type / keyword / mine / status / sort_by / order / page / page_size
export async function getItemList(params: ItemQuery): Promise<PageResult<Item>> {
  if (USE_MOCK) {
    await delay()
    return mockGetItemList(params)
  }
  // 后端可能用 page_size，也可能用 pageSize，统一转成前端内部的形状再返回
  const raw = await http<RawPageResult<Item>>({
    url: API_POSTS_PATH,
    method: 'get',
    params,
  })
  return normalizePageResult(raw)
}

// 详情（P2）
export async function getItemDetail(id: number) {
  if (USE_MOCK) {
    await delay()
    return mockGetItemDetail(id)
  }
  return http<Item>({ url: postPath(id), method: 'get' })
}

// 发布（P3）
export async function createItem(data: Partial<Item>) {
  if (USE_MOCK) {
    await delay(400)
    return mockCreateItem(data)
  }
  return http<Item>({ url: API_POSTS_PATH, method: 'post', data })
}

// 改状态（P5，文档里标注【建议】P2 待定）
//
// ⚠️ 这里有个必须找组长定清楚的问题：
//   契约里的 status 只有 open（进行中）/ closed（已找回、已认领）两个值，
//   而我们管理端做的是"审核"，用的是 pending / published / rejected / closed 四个值。
//   "审核"这件事在契约里**完全没有对应接口**。
//   下面这个路径是照 P5 写的，但值域定不下来，联调一定对不上。
export async function updateItemStatus(id: number, status: ItemStatus) {
  if (USE_MOCK) {
    await delay()
    return mockUpdateItemStatus(id, status)
  }
  return http<Item>({ url: postPath(id), method: 'patch', data: { status } })
}

// 删除（P4）
export async function deleteItem(id: number) {
  if (USE_MOCK) {
    await delay(200)
    return mockDeleteItem(id)
  }
  return http<void>({ url: postPath(id), method: 'delete' })
}