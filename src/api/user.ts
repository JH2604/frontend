import { http } from '@/utils/request'
import type { RawUserDetail, RawUserProfile, UserDetail, UserProfile } from '@/types/api'
import { USE_MOCK, delay, mockGetUserProfile } from '@/mock'
import { API_USERS_PATH, Role, userPath, type RoleValue } from '@/utils/contract'

// =====================================================================
// 用户（v1.1 文档第 3 章，这里只做 U6）
//
//   U6 GET /users/{user_id}   查看发帖人信息
//
// 契约特别强调了一句，值得原样抄在这里：
//   > 「同一个接口按查看者角色返回不同字段，**由后端控制，不靠前端隐藏**」
//
// 所以本文件的原则是：**后端给什么就映射什么，前端不拿 role 去猜该藏哪些字段**。
// 普通用户调用时后端会把 detail 置成 null，我们照着渲染就行。
// 这也是一贯的 fail-closed 思路：不自己"补"权限，也不自己"放"权限。
// =====================================================================

function toRole(raw: string | null | undefined): RoleValue {
  return raw === Role.ADMIN ? Role.ADMIN : Role.STUDENT
}

/** 管理员专属信息（普通用户看不到，后端给 null） */
function toUserDetail(raw: RawUserDetail | null | undefined): UserDetail | null {
  // ⚠️ 必须判 null：如果这里无脑造一个对象出来，界面上就会显示出
  //    "学号：（空）手机号：（空）"这种本该隐藏的信息框架，
  //    等于把"有这个字段"这件事泄露给了普通用户。
  if (!raw) return null
  return {
    studentId: raw.student_id ?? '',
    phone: raw.phone ?? null,
    email: raw.email ?? null,
    allowRemind: raw.allow_remind ?? false,
    createdAt: raw.created_at ?? '',
    lastLoginAt: raw.last_login_at ?? '',
  }
}

function toUserProfile(raw: RawUserProfile): UserProfile {
  return {
    id: raw.id ?? 0,
    name: raw.name ?? '未知用户',
    avatarUrl: raw.avatar_url ?? '',
    role: toRole(raw.role),
    postCount: raw.post_count ?? 0,
    // 两个能力开关都 fail-closed：后端没给就当"不能"
    canMessage: raw.can_message ?? false,
    canRemind: raw.can_remind ?? false,
    detail: toUserDetail(raw.detail),
  }
}

/**
 * U6 查看发帖人信息。
 *
 * 哪里会用到？—— 帖子详情页的「私信 TA」按钮。
 * 我们需要先知道 `canMessage` 才能决定这个按钮给不给出入口
 * （契约权限表里有"不能私信自己"这类限制，后端会返回 can_message=false）。
 *
 * 按交接说明第 9 节第 6 条：**知道后端一定会拒绝的操作，前端不要给出入口**。
 * 所以是先问一次 canMessage，而不是先显示按钮、点了再报错。
 */
export async function getUserProfile(userId: number): Promise<UserProfile> {
  if (USE_MOCK) {
    await delay(200)
    return toUserProfile(mockGetUserProfile(userId))
  }
  return toUserProfile(
    await http<RawUserProfile>({ url: userPath(userId), method: 'get' }),
  )
}
