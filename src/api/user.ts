// =====================================================================
// 用户接口层（契约 U1~U7）
//
// 【它在哪里】
//   views/user/Settings.vue      用户中心：U1 展示 / U2 改资料 / U3 改密码 / U4+U5 绑联系方式
//   views/user/UserProfile.vue   用户主页：U6
//   views/user/Admins.vue        联系管理员：U7
//   views/user/ItemDetail.vue    「私信 TA」按钮：也用 U6（先问 can_message）
//         ↓ 都调用本文件
//   api/user.ts  ★ 你在这里
//         ↓
//   utils/request.ts  →  mock/ 或 真后端
//
// 【契约里的 7 个接口】
//   U1 GET   /users/me               获取当前用户信息（我自己，联系方式是完整值）
//   U2 PATCH /users/me               改资料：只有 avatar_url / theme / allow_remind 可改
//   U3 PUT   /users/me/password      改密码（成功后【所有会话失效】）
//   U4 POST  /verification-codes     发验证码（channel: sms / email）
//   U5 PUT   /users/me/contact       绑手机号或邮箱（target 必须和 U4 时一致）
//   U6 GET   /users/{user_id}        看别人（联系方式由后端按角色遮蔽）
//   U7 GET   /users/admins           管理员列表（返回数组，不是分页对象）
//
// 【本文件里 3 处最容易搞混的地方】
//
//   ① U1 和 U6 是两回事，不要合并：
//        U1 = "我自己"，phone/email 是【完整值】，类型是 UserMe
//        U6 = "看别人"，detail 由后端遮蔽，类型是 UserProfile
//      两个类型长得像，合并后一旦后端改遮蔽规则就会两边一起错。
//
//   ② api/auth.ts 里已经有个 getMe()，所以这里的 U1 叫 getMyProfile()。
//      import 错了会拿到未映射的原始对象（一堆下划线字段，页面全是 undefined）。
//
//   ③ 打码是【展示层】的事：后端给完整值，前端原样存，
//      渲染时才调 contract.ts 的 maskPhone / maskEmail。
//      反过来做会出现"明明绑定了却显示未绑定"这种怪 bug。
//
// ⚠️ v1.1 相对 v1.0 的两处破坏性变更：
//   U5 路径从 /users/me/email 改成 /users/me/contact，
//   body 从 {email, code} 改成 {channel, target, code}。
// =====================================================================

import { http } from '@/utils/request'
import type {
  AdminContact,
  BindContactPayload,
  ChangePasswordPayload,
  ContactResult,
  RawAdminContact,
  RawContactResult,
  RawUserMe,
  RawUserProfile,
  SendCodePayload,
  UpdateMePayload,
  UserMe,
  UserProfile,
} from '@/types/api'
import {
  USE_MOCK,
  delay,
  mockBindContact,
  mockChangePassword,
  mockGetMe,
  mockGetUserProfile,
  mockListAdmins,
  mockSendCode,
  mockUpdateMe,
} from '@/mock'
import {
  API_USERS_ADMINS_PATH,
  API_USERS_CONTACT_PATH,
  API_USERS_ME_PATH,
  API_USERS_PASSWORD_PATH,
  API_VERIFICATION_CODES_PATH,
  CONTACT_FIELDS,
  PASSWORD_FIELDS,
  PROFILE_UPDATE_FIELDS,
  Role,
  VERIFICATION_CODE_FIELDS,
  VERIFICATION_SCENE,
  userPath,
  type RoleValue,
} from '@/utils/contract'

// =====================================================================
// 用户（v1.1 文档第 3 章）
//
//   U1 GET   /users/me               获取当前用户信息
//   U2 PATCH /users/me               修改个人资料（头像 / 主题 / 提醒开关）
//   U3 PUT   /users/me/password      修改密码（成功后所有会话失效）
//   U4 POST  /verification-codes     发送验证码（channel: sms / email）
//   U5 PUT   /users/me/contact       绑定/修改手机号或邮箱
//   U6 GET   /users/{user_id}        查看发帖人信息（按角色遮蔽 detail）
//   U7 GET   /users/admins           管理员列表（联系管理员）
//
// ⚠️ v1.1 相对 v1.0 的两处破坏性变更，都在这个文件里：
//   1. U5 的路径从 `/users/me/email` 改成 **`/users/me/contact`**，
//      body 从 `{email, code}` 改成 `{channel, target, code}`
//   2. U1 的返回去掉了 `email_bound`，改成 **`allow_remind`**，并新增 `phone`
//
// ⚠️ 另一个容易搞混的点：U1 和 U6 是两个不同的接口、两个不同的类型。
//    U1 是"我自己"，手机号/邮箱是完整值；
//    U6 是"看别人"，联系方式由后端按角色遮蔽。
//    详见 types/api.ts 里 UserMe 的注释。
// =====================================================================

function toRole(raw: string | null | undefined): RoleValue {
  return raw === Role.ADMIN ? Role.ADMIN : Role.STUDENT
}

/** 主题枚举兜底：认不出来就用 system（跟随系统），不写死 light/dark */
function toTheme(raw: string | null | undefined): UserMe['theme'] {
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  return 'system'
}

/** U1 我的信息 */
function toUserMe(raw: RawUserMe): UserMe {
  return {
    id: raw.id ?? 0,
    studentId: raw.student_id ?? '',
    name: raw.name ?? '未知用户',
    avatarUrl: raw.avatar_url ?? '',
    role: toRole(raw.role),
    // ⚠️ 这里保持原值（不当成空字符串）。
    //    null 的含义是"未绑定"，界面要靠它区分"没绑"和"绑了但值奇怪"。
    phone: raw.phone ?? null,
    email: raw.email ?? null,
    // fail-closed：后端没给就当"不允许提醒"？ 不 —— 契约明确写了默认 true，
    // 而且这是本人自己的开关。所以这里按契约的默认值 true 兜底。
    allowRemind: raw.allow_remind ?? true,
    theme: toTheme(raw.theme),
    postCount: raw.post_count ?? 0,
    createdAt: raw.created_at ?? '',
  }
}

function toContactResult(raw: RawContactResult | null | undefined): ContactResult {
  return {
    phone: raw?.phone ?? null,
    email: raw?.email ?? null,
  }
}

/** 管理员列表项 */
function toAdminContact(raw: RawAdminContact): AdminContact {
  return {
    id: raw.id ?? 0,
    name: raw.name ?? '管理员',
    avatarUrl: raw.avatar_url ?? '',
    role: toRole(raw.role),
    email: raw.email ?? null,
    // fail-closed：后端没给 can_message 就当"不能私信"
    canMessage: raw.can_message ?? false,
  }
}

// ---- U6 的映射（保持和上一轮一致，这里不动） ----

function toUserDetail(raw: RawUserProfile['detail']): UserProfile['detail'] {
  // ⚠️ 必须判 null：无脑造对象会让普通用户看到"学号：（空）"这种本该隐藏的骨架
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
    canMessage: raw.can_message ?? false,
    canRemind: raw.can_remind ?? false,
    detail: toUserDetail(raw.detail),
  }
}

// ---- 请求体：驼峰 -> 下划线 ----

/** U2：只把"真的传了的"字段放进去（契约：没传的字段保持不变） */
function toUpdateMeBody(payload: UpdateMePayload): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  // ⚠️ 用 !== undefined 判断，不能用真值判断。
  //    allowRemind=false 是有效值（"我不想被打扰"），真值判断会把它漏掉、
  //    变成"用户想关掉提醒但压根没发出去" —— 这是三态问题的又一次出现。
  if (payload.avatarUrl !== undefined) body[PROFILE_UPDATE_FIELDS.avatarUrl] = payload.avatarUrl
  if (payload.theme !== undefined) body[PROFILE_UPDATE_FIELDS.theme] = payload.theme
  if (payload.allowRemind !== undefined) body[PROFILE_UPDATE_FIELDS.allowRemind] = payload.allowRemind
  return body
}

// ---------------------------------------------------------------------
// 对外的 7 个函数
// ---------------------------------------------------------------------

/**
 * U1 获取当前用户信息。
 *
 * ⚠️ 名字叫 `getMyProfile` 而不是 `getMe`，是为了**避免和 `api/auth.ts` 里的
 *    `getMe()` 重名** —— 那个是老代码（也是 `GET /users/me`），但返回的是
 *    未经映射的原始对象。两个同名函数会让人 import 错，然后拿到一堆下划线字段。
 *    这里顺便把 U1 这条接口**收口到 user.ts**（auth.ts 那个留着不动，
 *    等哪天确认没人用了再删）。
 */
export async function getMyProfile(): Promise<UserMe> {
  if (USE_MOCK) {
    await delay(200)
    return toUserMe(mockGetMe())
  }
  return toUserMe(await http<RawUserMe>({ url: API_USERS_ME_PATH, method: 'get' }))
}

/**
 * U2 修改个人资料。返回修改后的完整用户信息。
 *
 * 契约特别提醒："主题切换建议前端先改本地状态并立即生效，再异步调用本接口保存，
 * 这样换设备登录时也能保持主题。"
 * → 所以调用方（设置页）应该先把 theme 应用到界面，再调这个函数，
 *    而不是等接口回来才变色。
 */
export async function updateMe(payload: UpdateMePayload): Promise<UserMe> {
  const body = toUpdateMeBody(payload)
  if (USE_MOCK) {
    await delay(300)
    return toUserMe(mockUpdateMe(payload))
  }
  return toUserMe(
    await http<RawUserMe>({ url: API_USERS_ME_PATH, method: 'patch', data: body }),
  )
}

/**
 * U3 修改密码。
 *
 * ⚠️ 契约原文：修改成功后后端会**吊销该用户全部会话**（所有设备下线），
 *    所以调用方必须清掉本地令牌并跳登录页 —— 见 Settings.vue 里的处理。
 *    （原密码错误由真后端返回 40002，拦截器会统一弹提示；
 *      mock 模式下假后端抛的是普通 Error，调用方 catch 后弹它即可。）
 */
export async function changeMyPassword(payload: ChangePasswordPayload): Promise<void> {
  if (USE_MOCK) {
    await delay(300)
    return mockChangePassword(payload)
  }
  return http<void>({
    url: API_USERS_PASSWORD_PATH,
    method: 'put',
    data: {
      [PASSWORD_FIELDS.oldPassword]: payload.oldPassword,
      [PASSWORD_FIELDS.newPassword]: payload.newPassword,
    },
  })
}

/**
 * U4 发送验证码（v1.1 合并接口：手机号和邮箱共用）。
 * `scene` 固定 `bind_contact`（绑定/修改手机号或邮箱）。
 */
export async function sendVerificationCode(payload: SendCodePayload): Promise<void> {
  if (USE_MOCK) {
    await delay(400)
    return mockSendCode(payload)
  }
  return http<void>({
    url: API_VERIFICATION_CODES_PATH,
    method: 'post',
    data: {
      [VERIFICATION_CODE_FIELDS.channel]: payload.channel,
      [VERIFICATION_CODE_FIELDS.target]: payload.target,
      [VERIFICATION_CODE_FIELDS.scene]: VERIFICATION_SCENE.BIND_CONTACT,
    },
  })
}

/**
 * U5 绑定 / 修改手机号或邮箱。
 * ⚠️ `target` 必须和 U4 发送验证码时传的那个**完全一致**（契约明确要求）。
 */
export async function bindContact(payload: BindContactPayload): Promise<ContactResult> {
  if (USE_MOCK) {
    await delay(300)
    return toContactResult(mockBindContact(payload))
  }
  return toContactResult(
    await http<RawContactResult>({
      url: API_USERS_CONTACT_PATH,
      method: 'put',
      data: {
        [CONTACT_FIELDS.channel]: payload.channel,
        [CONTACT_FIELDS.target]: payload.target,
        [CONTACT_FIELDS.code]: payload.code,
      },
    }),
  )
}

/**
 * U6 查看发帖人信息。
 *
 * 用在两处：
 *   1. 帖子详情页的「私信 TA」按钮（先问 can_message 才决定按钮显不显示）
 *   2. 用户主页 `/users/:id`
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

/**
 * U7 管理员列表（联系管理员页）。
 * 契约：返回的是一个**数组**（不是分页对象），因为管理员就那几个。
 */
export async function listAdmins(): Promise<AdminContact[]> {
  if (USE_MOCK) {
    await delay(200)
    return mockListAdmins().map(toAdminContact)
  }
  const raw = await http<RawAdminContact[]>({ url: API_USERS_ADMINS_PATH, method: 'get' })
  return (raw ?? []).map(toAdminContact)
}
