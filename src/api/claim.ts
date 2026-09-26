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

// 提交认领申请（挂在某个物品下面）
export async function createClaim(data: Partial<Claim>) {
  if (USE_MOCK) {
    await delay()
    return mockCreateClaim(data)
  }
  return http<Claim>({ url: `/items/${data.itemId}/claims`, method: 'post', data })
}

// 我的认领申请
export async function getMyClaims(params: ClaimQuery) {
  if (USE_MOCK) {
    await delay()
    return mockGetMyClaims(params)
  }
  return http<PageResult<Claim>>({ url: '/claims/mine', method: 'get', params })
}

// 管理端：全部认领申请
export async function getClaimList(params: ClaimQuery) {
  if (USE_MOCK) {
    await delay()
    return mockGetClaimList(params)
  }
  return http<PageResult<Claim>>({ url: '/claims', method: 'get', params })
}

// 管理端：审核认领（通过 / 驳回）
export async function auditClaim(id: number, status: ClaimStatus) {
  if (USE_MOCK) {
    await delay()
    return mockAuditClaim(id, status)
  }
  return http<Claim>({ url: `/claims/${id}/status`, method: 'patch', data: { status } })
}
