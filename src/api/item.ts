import { http } from '@/utils/request'
import type { Item, ItemQuery, PageResult } from '@/types/api'
import { USE_MOCK, delay, mockGetItemList, mockGetItemDetail, mockCreateItem } from '@/mock'

// 列表（带分页、搜索、分类筛选）
export async function getItemList(params: ItemQuery) {
  if (USE_MOCK) {
    await delay()
    return mockGetItemList(params)
  }
  return http<PageResult<Item>>({ url: '/v1/items', method: 'get', params })
}

// 详情
export async function getItemDetail(id: number) {
  if (USE_MOCK) {
    await delay()
    return mockGetItemDetail(id)
  }
  return http<Item>({ url: `/v1/items/${id}`, method: 'get' })
}

// 发布
export async function createItem(data: Partial<Item>) {
  if (USE_MOCK) {
    await delay(400)
    return mockCreateItem(data)
  }
  return http<Item>({ url: '/v1/items', method: 'post', data })
}

// 删除
export async function deleteItem(id: number) {
  if (USE_MOCK) {
    await delay(200)
    return
  }
  return http<void>({ url: `/v1/items/${id}`, method: 'delete' })
}
