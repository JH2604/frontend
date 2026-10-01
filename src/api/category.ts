import { http } from '@/utils/request'
import { USE_MOCK, delay, mockCategories } from '@/mock'
import { cached } from '@/utils/cache'

export interface Category {
  id: number
  name: string
}

// 分类列表（下拉框用）
//
// 这里加了缓存：分类几乎不会变，但每次进列表页都会请求一次，没必要。
// 30 分钟内重复进页面只会请求第一次，后面直接吃缓存。
// C++ 类比：带过期时间的 unordered_map，命中就不走网络。
const CATEGORY_CACHE_KEY = 'categories'
const CATEGORY_TTL = 30 * 60 * 1000

// ⚠️ 契约里【没有】分类接口（2026-10-02 核对的 docs/01-API接口文档.md）
//
// 契约里帖子的"分类"只有 type 一个维度：lost（失物）/ found（招领）。
// 没有 证件卡片 / 电子产品 / 钱包钥匙 这种"物品类别"。
// 这套分类是产品手机原型里的概念，接口文档从头到尾没提过。
//
// 下面这个 /categories 是猜的。要么让后端补一个接口，
// 要么前端把这个下拉框去掉（改用 type 的失物/招领筛选，契约里是有的）。
export function getCategoryList(): Promise<Category[]> {
  return cached(CATEGORY_CACHE_KEY, CATEGORY_TTL, async () => {
    if (USE_MOCK) {
      await delay(100)
      return mockCategories
    }
    // 路径规则跟 /api/login 保持一致（不带 /v1）。分类接口后端还没给文档，先按这个猜
    return http<Category[]>({ url: '/categories', method: 'get' })
  })
}
