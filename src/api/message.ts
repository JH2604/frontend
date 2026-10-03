import { http } from '@/utils/request'
import type {
  Author,
  ChatMessage,
  Conversation,
  ConversationQuery,
  MarkReadPayload,
  MarkReadResult,
  MessageBrief,
  MessageDirection,
  MessageQuery,
  MessagePostRef,
  PageResult,
  RawAuthor,
  RawChatMessage,
  RawConversation,
  RawMarkRead,
  RawMessageBrief,
  RawMessagePage,
  RawRemindResult,
  RawSendMessage,
  RawUnreadCount,
  RemindResult,
  SendMessagePayload,
  SendMessageResult,
  UnreadCount,
} from '@/types/api'
import {
  USE_MOCK,
  delay,
  mockGetConversation,
  mockGetMessageList,
  mockGetUnreadCount,
  mockMarkRead,
  mockSendMessage,
} from '@/mock'
import {
  API_MESSAGES_PATH,
  API_MESSAGES_READ_PATH,
  API_UNREAD_COUNT_PATH,
  CONVERSATION_QUERY_PARAMS,
  MESSAGE_CONTENT_MAX,
  MESSAGE_PAGE_SIZE_DEFAULT,
  MESSAGE_PAGE_SIZE_MAX,
  MESSAGE_QUERY_PARAMS,
  MESSAGE_READ_KEYS,
  PAGE_SIZE_DEFAULT,
  Role,
  conversationPath,
  type RoleValue,
} from '@/utils/contract'

/** 认不出来一律当学生（fail-closed，和 item.ts 同一套逻辑） */
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

function toDirection(raw: string | null | undefined): MessageDirection {
  return raw === 'sent' ? 'sent' : 'received'
}

function toPostRef(
  raw: { id?: number | null; title?: string | null } | null | undefined,
): MessagePostRef | null {
  if (!raw) return null
  return { id: raw.id ?? 0, title: raw.title ?? '' }
}

/** M2 列表项（导出是为了让沙箱测试能直接验转换层） */
export function toMessageBrief(raw: RawMessageBrief): MessageBrief {
  return {
    id: raw.id ?? 0,
    direction: toDirection(raw.direction),
    peer: toAuthor(raw.peer),
    content: raw.content ?? '',
    post: toPostRef(raw.post),
    isRead: raw.is_read ?? false,
    reminded: raw.reminded ?? false,
    createdAt: raw.created_at ?? '',
  }
}

/** M3 / M4 里的单条消息（没有 peer）。导出原因同 toMessageBrief */
export function toChatMessage(raw: RawChatMessage): ChatMessage {
  return {
    id: raw.id ?? 0,
    direction: toDirection(raw.direction),
    content: raw.content ?? '',
    isRead: raw.is_read ?? false,
    reminded: raw.reminded ?? false,
    createdAt: raw.created_at ?? '',
  }
}

export function toConversation(raw: RawConversation): Conversation {
  return {
    peer: toAuthor(raw.peer),
    // fail-closed：后端没给 can_remind 就当"不能提醒"，绝不默认放开
    canRemind: raw.can_remind ?? false,
    list: (raw.list ?? []).map(toChatMessage),
    hasMore: raw.has_more ?? false,
  }
}

export function toRemindResult(raw: RawRemindResult | null | undefined): RemindResult {
  return {
    status: raw?.status ?? '',
    channel: raw?.channel ?? null,
    reason: raw?.reason ?? null,
  }
}

function toSendMessageResult(raw: RawSendMessage | null | undefined): SendMessageResult {
  return {
    message: toChatMessage(raw?.message ?? {}),
    remind: toRemindResult(raw?.remind),
  }
}

/** M2 查询参数：驼峰 -> 下划线。空值直接不发（不发 = 不筛选） */
export function toMessageQueryParams(params: MessageQuery): Record<string, unknown> {
  const q: Record<string, unknown> = {
    page: params.page,
    page_size: params.pageSize,
  }
  if (params.box && params.box !== 'all') q[MESSAGE_QUERY_PARAMS.box] = params.box
  if (params.isRead !== undefined) q[MESSAGE_QUERY_PARAMS.isRead] = params.isRead
  return q
}

/** M3 查询参数：游标分页 */
export function toConversationParams(params: ConversationQuery): Record<string, unknown> {
  const q: Record<string, unknown> = {
    // 契约写 limit 默认 20、最大 50，超了就自己夹住，别让后端去拒绝
    [CONVERSATION_QUERY_PARAMS.limit]: Math.min(
      params.limit ?? MESSAGE_PAGE_SIZE_DEFAULT,
      MESSAGE_PAGE_SIZE_MAX,
    ),
  }
  if (params.beforeId) q[CONVERSATION_QUERY_PARAMS.beforeId] = params.beforeId
  if (params.markRead !== undefined) q[CONVERSATION_QUERY_PARAMS.markRead] = params.markRead
  return q
}

/** M4 请求体：驼峰 -> 下划线 */
function toSendBody(payload: SendMessagePayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    receiver_id: payload.receiverId,
    // 契约 M4 没写 content 上限，这里按前端常量兜底截断
    content: payload.content.slice(0, MESSAGE_CONTENT_MAX),
  }
  if (payload.postId) body.post_id = payload.postId
  // remind 是 boolean，契约说默认 false，所以只有 true 才发出去（少发一个字段）
  if (payload.remind) body.remind = true
  return body
}

/** M5 请求体：三种用法任选其一，优先级 ids > peer_id > all */
export function toMarkReadBody(payload: MarkReadPayload): Record<string, unknown> {
  if (payload.ids && payload.ids.length > 0) {
    return { [MESSAGE_READ_KEYS.ids]: payload.ids }
  }
  if (payload.peerId) {
    return { [MESSAGE_READ_KEYS.peerId]: payload.peerId }
  }
  return { [MESSAGE_READ_KEYS.all]: true }
}

export async function getUnreadCount(currentUserId = 0): Promise<UnreadCount> {
  if (USE_MOCK) {
    await delay(150)
    // 假后端要按"我是谁"数未读（只有我收到的未读才算）
    return { total: mockGetUnreadCount(currentUserId) }
  }
  const raw = await http<RawUnreadCount>({ url: API_UNREAD_COUNT_PATH, method: 'get' })
  return { total: raw?.total ?? 0 }
}

export async function getMessageList(
  params: MessageQuery,
  currentUserId = 0,
): Promise<PageResult<MessageBrief>> {
  if (USE_MOCK) {
    await delay()
    const raw = mockGetMessageList(params, currentUserId)
    return {
      list: (raw.list ?? []).map(toMessageBrief),
      total: raw.total ?? 0,
      page: raw.page ?? 1,
      pageSize: raw.page_size ?? params.pageSize ?? PAGE_SIZE_DEFAULT,
    }
  }

  const raw = await http<RawMessagePage>({
    url: API_MESSAGES_PATH,
    method: 'get',
    params: toMessageQueryParams(params),
  })

  return {
    list: (raw?.list ?? []).map(toMessageBrief),
    total: raw?.total ?? 0,
    page: raw?.page ?? 1,
    pageSize: raw?.page_size ?? params.pageSize ?? PAGE_SIZE_DEFAULT,
  }
}

export async function getConversation(
  peerId: number,
  params: ConversationQuery = {},
  currentUserId = 0,
): Promise<Conversation> {
  if (USE_MOCK) {
    await delay()
    return toConversation(mockGetConversation(peerId, params, currentUserId))
  }
  return toConversation(
    await http<RawConversation>({
      url: conversationPath(peerId),
      method: 'get',
      params: toConversationParams(params),
    }),
  )
}

export async function sendMessage(
  payload: SendMessagePayload,
  currentUserId = 0,
): Promise<SendMessageResult> {
  // 先规范化（截断 + 统一字段名），mock 和真后端两条分支用同一份数据
  const body = toSendBody(payload)

  if (USE_MOCK) {
    await delay(400)
    const raw = mockSendMessage(
      {
        receiverId: payload.receiverId,
        // ⚠️ 取 body 里的（已截断），不是 payload 里的原始内容
        content: body.content as string,
        // post_id 在真发出去时才是下划线，这里转回内部驼峰形状
        postId: (body.post_id as number | undefined) ?? undefined,
        remind: body.remind === true,
      },
      currentUserId,
    )
    return toSendMessageResult(raw)
  }

  return toSendMessageResult(
    await http<RawSendMessage>({
      url: API_MESSAGES_PATH,
      method: 'post',
      data: body,
    }),
  )
}

export async function markRead(
  payload: MarkReadPayload,
  currentUserId = 0,
): Promise<MarkReadResult> {
  // 同样先规范化（决定用 ids / peer_id / all 哪一种），再分叉
  const body = toMarkReadBody(payload)

  if (USE_MOCK) {
    await delay(200)
    const raw = mockMarkRead(payload, currentUserId)
    return { updated: raw.updated ?? 0, unreadTotal: raw.unread_total ?? 0 }
  }

  const raw = await http<RawMarkRead>({
    url: API_MESSAGES_READ_PATH,
    method: 'put',
    data: body,
  })
  return { updated: raw?.updated ?? 0, unreadTotal: raw?.unread_total ?? 0 }
}
