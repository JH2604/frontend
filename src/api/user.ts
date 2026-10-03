import { useUserStore } from '@/stores/user'
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
    phone: raw.phone ?? null,
    email: raw.email ?? null,
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
  if (payload.avatarUrl !== undefined) body[PROFILE_UPDATE_FIELDS.avatarUrl] = payload.avatarUrl
  if (payload.theme !== undefined) body[PROFILE_UPDATE_FIELDS.theme] = payload.theme
  if (payload.allowRemind !== undefined) body[PROFILE_UPDATE_FIELDS.allowRemind] = payload.allowRemind
  return body
}

export async function getMyProfile(): Promise<UserMe> {
  if (USE_MOCK) {
    await delay(200)
    return toUserMe(mockGetMe())
  }
  return toUserMe(await http<RawUserMe>({ url: API_USERS_ME_PATH, method: 'get' }))
}

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

export async function getUserProfile(userId: number): Promise<UserProfile> {
  if (USE_MOCK) {
    await delay(200)
    const userStore = useUserStore()
    return toUserProfile(mockGetUserProfile(userId,userStore.userId,userStore.isAdmin))
  }
  return toUserProfile(
    await http<RawUserProfile>({ url: userPath(userId), method: 'get' }),
  )
}

export async function listAdmins(): Promise<AdminContact[]> {
  if (USE_MOCK) {
    await delay(200)
    return mockListAdmins().map(toAdminContact)
  }
  const raw = await http<RawAdminContact[]>({ url: API_USERS_ADMINS_PATH, method: 'get' })
  return (raw ?? []).map(toAdminContact)
}
