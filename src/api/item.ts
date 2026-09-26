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

// 注意：后端文档里给的是 /api/login、/api/register 这种写法（没有 /v1），
// 所以下面统一去掉了 /v1。等后端补上失物模块的文档后，再逐条核对路径。

// 列表（带分页、搜索、分类筛选）
export async function getItemList(params: ItemQuery) {
  if (USE_MOCK) {
    await delay()
    return mockGetItemList(params)
  }
  return http<PageResult<Item>>({ url: '/items', method: 'get', params })
}

// 详情
export async function getItemDetail(id: number) {
  if (USE_MOCK) {
    await delay()
    return mockGetItemDetail(id)
  }
  return http<Item>({ url: `/items/${id}`, method: 'get' })
}

// 发布
export async function createItem(data: Partial<Item>) {
  if (USE_MOCK) {
    await delay(400)
    return mockCreateItem(data)
  }
  return http<Item>({ url: '/items', method: 'post', data })
}

// 审核改状态：管理员"通过"传 published，"驳回"传 rejected，"关闭"传 closed
export async function updateItemStatus(id: number, status: ItemStatus) {
  if (USE_MOCK) {
    await delay()
    return mockUpdateItemStatus(id, status)
  }
  return http<Item>({ url: `/items/${id}/status`, method: 'patch', data: { status } })
}

// 删除
export async function deleteItem(id: number) {
  if (USE_MOCK) {
    await delay(200)
    return mockDeleteItem(id)
  }
  return http<void>({ url: `/items/${id}`, method: 'delete' })
}
