import { http } from '@/utils/request'
import { USE_MOCK, delay, mockCategories } from '@/mock'

export interface Category {
  id: number
  name: string
}

// 分类列表（下拉框用）
export async function getCategoryList() {
  if (USE_MOCK) {
    await delay(100)
    return mockCategories
  }
  return http<Category[]>({ url: '/v1/categories', method: 'get' })
}
