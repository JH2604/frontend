import { http } from '@/utils/request'
import {
  USE_MOCK,
  delay,
  mockCreateClaim,
  mockGetMyClaims,
  mockGetClaimList,
  mockAuditClaim,
} from '@/mock'
import type { Claim, ClaimQuery, ClaimStatus, PageResult } from '@/types/api'
import { normalizePageResult, type RawPageResult } from '@/utils/contract'

// =====================================================================
// ⚠️⚠️ 整个"认领"模块在接口契约里【不存在】⚠️⚠️
// =====================================================================
// 2026-10-02 拿到的契约（docs/01-API接口文档.md）一共只有 6 个模块：
//   认证 A1~A4 / 用户 U1~U7 / 文件 F1 / 帖子 P1~P5 / 评论 C1~C3 / 消息 M1~M6
// 里面【没有】认领申请表，也【没有】认领审核接口。
//
// 契约里的"认领"指的是另一件事：把帖子本身的状态改成 closed
//   （文档 P5：修改帖子状态"标记已找回 / 已认领"，且标注为【建议】【待定】）
// 也就是说：契约里没有"提交认领申请 → 管理员审核 → 通过/驳回"这条流程。
//
// 下面这 4 个函数的路径是我按现有命名习惯**猜**的，不是文档里的。
// 联调前必须让组长拍板：认领模块到底做不做、接口叫什么。
// =====================================================================

// 提交认领申请（挂在某个物品下面）
export async function createClaim(data: Partial<Claim>) {
  if (USE_MOCK) {
    await delay()
    return mockCreateClaim(data)
  }
  return http<Claim>({ url: `/items/${data.itemId}/claims`, method: 'post', data })
}

// 我的认领申请
export async function getMyClaims(params: ClaimQuery): Promise<PageResult<Claim>> {
  if (USE_MOCK) {
    await delay()
    return mockGetMyClaims(params)
  }
  const raw = await http<RawPageResult<Claim>>({ url: '/claims/mine', method: 'get', params })
  return normalizePageResult(raw)
}

// 管理端：全部认领申请
export async function getClaimList(params: ClaimQuery): Promise<PageResult<Claim>> {
  if (USE_MOCK) {
    await delay()
    return mockGetClaimList(params)
  }
  const raw = await http<RawPageResult<Claim>>({ url: '/claims', method: 'get', params })
  return normalizePageResult(raw)
}

// 管理端：审核认领（通过 / 驳回）
export async function auditClaim(id: number, status: ClaimStatus) {
  if (USE_MOCK) {
    await delay()
    return mockAuditClaim(id, status)
  }
  return http<Claim>({ url: `/claims/${id}/status`, method: 'patch', data: { status } })
}
