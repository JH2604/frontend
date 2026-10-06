import { http } from '@/utils/request'
import { useUserStore } from '@/stores/user'
import type {
  Author,
  CreateItemPayload,
  Item,
  ItemBrief,
  ItemQuery,
  ItemStatus,
  ItemType,
  Location,
  PageResult,
  RawAuthor,
  RawLocation,
  RawPost,
  RawPostBrief,
  RawPostPage,
  RawStatusPatch,
  StatusPatchResult,
} from '@/types/api'
import {
  USE_MOCK,
  delay,
  mockCreateItem,
  mockDeleteItem,
  mockGetItemDetail,
  mockGetItemList,
  mockUpdateItemStatus,
} from '@/mock'
import {
  API_CREATE_POST_PATH,
  API_POSTS_PATH,
  PAGE_SIZE_DEFAULT,
  Role,
  postPath,
  postStatusPath,
  type RoleValue,
} from '@/utils/contract'

function toLocation(raw: RawLocation | null | undefined): Location {
  return {
    name: raw?.name ?? '',
    latitude: raw?.latitude ?? null,
    longitude: raw?.longitude ?? null,
  }
}

function toRole(raw: string | null | undefined): RoleValue {
  return raw === Role.ADMIN ? Role.ADMIN : Role.STUDENT
}

function toAuthor(raw: RawAuthor | null | undefined): Author {
  return {
    id: raw?.id ?? 0,
    name: raw?.name ?? '未知用户',
    avatarUrl: raw?.avatar_url ?? '',
    role: toRole(raw?.role),
  }
}

function toType(raw: string | null | undefined): ItemType {
  return raw === 'found' ? 'found' : 'lost'
}

function toStatus(raw: string | null | undefined): ItemStatus {
  return raw === 'closed' ? 'closed' : 'open'
}

function toBrief(raw: RawPostBrief): ItemBrief {
  return {
    id: raw.id ?? 0,
    type: toType(raw.type),
    title: raw.title ?? '',
    contentPreview: raw.content_preview ?? '',
    coverUrl: raw.cover_url ?? null,
    imageCount: raw.image_count ?? 0,
    location: toLocation(raw.location),
    status: toStatus(raw.status),
    author: toAuthor(raw.author),
    createdAt: raw.created_at ?? '',
    closedAt: raw.closed_at ?? null,
  }
}

function toItem(raw: RawPost): Item {
  return {
    id: raw.id ?? 0,
    type: toType(raw.type),
    title: raw.title ?? '',
    content: raw.content ?? '',
    images: raw.images ?? [],
    location: toLocation(raw.location),
    eventTime: raw.event_time ?? null,
    status: toStatus(raw.status),
    author: toAuthor(raw.author),
    isMine: raw.is_mine ?? false,
    canDelete: raw.can_delete ?? false,

    canChangeStatus: raw.can_change_status ?? false,
    createdAt: raw.created_at ?? '',
    closedAt: raw.closed_at ?? null,
  }
}

function toStatusPatch(raw: RawStatusPatch): StatusPatchResult {
  return {
    id: raw.id ?? 0,
    status: toStatus(raw.status),
    closedAt: raw.closed_at ?? null,
  }
}

function toQueryParams(params: ItemQuery): Record<string, unknown> {
  const q: Record<string, unknown> = {
    page: params.page,
    page_size: params.pageSize,
  }

  if (params.type && params.type !== 'all') q.type = params.type
  if (params.status && params.status !== 'all') q.status = params.status
  if (params.keyword && params.keyword.trim()) q.keyword = params.keyword.trim()
  if (params.mine) q.mine = true
  if (params.order) q.order = params.order

  return q
}

function toCreateBody(payload: CreateItemPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    type: payload.type,
    title: payload.title,
    content: payload.content,

    location: {
      name: payload.location.name,
      latitude: payload.location.latitude ?? null,
      longitude: payload.location.longitude ?? null,
    },
  }

  if (payload.images && payload.images.length > 0) body.images = payload.images

  if (payload.eventTime) body.event_time = payload.eventTime

  return body
}

export async function getItemList(params: ItemQuery): Promise<PageResult<ItemBrief>> {
  if (USE_MOCK) {
    await delay()
    const raw = mockGetItemList(params)
    return {
      list: (raw.list ?? []).map(toBrief),
      total: raw.total ?? 0,
      page: raw.page ?? 1,
      pageSize: raw.page_size ?? params.pageSize ?? PAGE_SIZE_DEFAULT,
    }
  }

  const raw = await http<RawPostPage>({
    url: API_POSTS_PATH,
    method: 'get',
    params: toQueryParams(params),
  })

  return {
    list: (raw?.list ?? []).map(toBrief),
    total: raw?.total ?? 0,
    page: raw?.page ?? 1,
    pageSize: raw?.page_size ?? params.pageSize ?? PAGE_SIZE_DEFAULT,
  }
}

export async function getItemDetail(id: number): Promise<Item> {
  if (USE_MOCK) {
    await delay()
    const userStore = useUserStore()
    return toItem(mockGetItemDetail(id, userStore.isAdmin))
  }
  return toItem(await http<RawPost>({ url: postPath(id), method: 'get' }))
}

export async function createItem(payload: CreateItemPayload): Promise<Item> {
  if (USE_MOCK) {
    await delay(400)
    return toItem(mockCreateItem(payload))
  }
  return toItem(
    await http<RawPost>({
      url: API_CREATE_POST_PATH,
      method: 'post',
      data: toCreateBody(payload),
    }),
  )
}

export async function updateItemStatus(id: number, status: ItemStatus): Promise<StatusPatchResult> {
  if (USE_MOCK) {
    await delay()
    return toStatusPatch(mockUpdateItemStatus(id, status))
  }
  return toStatusPatch(
    await http<RawStatusPatch>({
      url: postStatusPath(id),
      method: 'patch',
      data: { status },
    }),
  )
}

export async function deleteItem(id: number, reason?: string): Promise<void> {
  if (USE_MOCK) {
    await delay(200)
    return mockDeleteItem(id)
  }
  return http<void>({
    url: postPath(id),
    method: 'delete',
    data: reason ? { reason } : undefined,
  })
}
