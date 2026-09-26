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
  // 路径规则跟 /api/login 保持一致（不带 /v1）。分类接口后端还没给文档，先按这个猜
  return http<Category[]>({ url: '/categories', method: 'get' })
}
