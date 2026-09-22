import { http } from '@/utils/request'
import type { Item, ItemQuery, PageResult } from '@/types/api'

// 列表（带分页和搜索）
export const getItemList = (params: ItemQuery) =>
  http<PageResult<Item>>({ url: '/v1/items', method: 'get', params })

// 详情
export const getItemDetail = (id: number) =>
  http<Item>({ url: `/v1/items/${id}`, method: 'get' })

// 发布
export const createItem = (data: Partial<Item>) =>
  http<Item>({ url: '/v1/items', method: 'post', data })

// 删除
export const deleteItem = (id: number) =>
  http<void>({ url: `/v1/items/${id}`, method: 'delete' })
