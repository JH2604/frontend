// =====================================================================
// 消息接口层（契约 M1~M5）
//
// 【它在哪里】
//   layouts/UserLayout.vue        菜单上的未读小红点（M1）
//   views/user/Messages.vue       消息列表（M2 列表 + M5 标记已读）
//   views/user/Conversation.vue   聊天页（M3 记录 + M4 发送 + M5 标记已读）
//   utils/unread.ts               未读数的共享状态（内部调 M1）
//         ↓ 都调用本文件
//   api/message.ts  ★ 你在这里
//         ↓
//   utils/request.ts  →  mock/ 或 真后端
//
// 【契约里的 5 个接口】
//   M1 GET  /messages/unread-count              未读私信数（只数"我收到的"）
//   M2 GET  /messages                           我的消息（我收到的 + 我发出的）
//   M3 GET  /messages/conversations/{peer_id}   私信记录（【游标】分页）
//   M4 POST /messages                           发送私信（可带提醒）
//   M5 PUT  /messages/read                      标记已读（ids / peer_id / all）
//
// ⚠️ 编号和 v1.0 不一样，别混：
//   旧 M3 会话列表【被删了】；旧 M4 私信记录 = 新 M3；
//   旧 M5 发送私信 = 新 M4；旧 M6 标记已读 = 新 M5。
//
// 【本文件里 4 处最容易写错的地方（都有对应注释）】
//   1. 未读有两个含义：received 的 is_read 是"我读没读"（算小红点）；
//      sent 的 is_read 是"对方读没读"（不算）。所以 M1 只数我收到的。
//   2. M3 是【游标分页】（before_id + has_more），不是 page/page_size。
//      而且 M3 的 list 按时间【正序】（M2 是倒序）。
//   3. M4 返回体是嵌套的 { message, remind }，不是直接给消息对象。
//   4. 契约原文："提醒失败不影响私信本身" —— 不能因为 remind.status 是
//      failed 就当成发送失败。
//
// 【一个通用约定（踩过两次的坑）】
//   `if (USE_MOCK)` 这种分叉里，**校验和规范化必须写在分叉之前**。
//   本文件的 sendMessage 就是先调 toSendBody（截断 + 转字段名）再分叉，
//   否则假后端会存下没截断的超长内容。
// =====================================================================

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

// =====================================================================
// 消息（v1.1 文档第 6 章，M1~M5）
//
//   M1 GET  /messages/unread-count              未读私信数（首页小红点）
//   M2 GET  /messages                           我的消息（收到的 + 发出的）
//   M3 GET  /messages/conversations/{peer_id}   私信记录（游标分页）
//   M4 POST /messages                           发送私信（可带提醒）
//   M5 PUT  /messages/read                      标记已读（ids / peer_id / all）
//
// ⚠️ 编号和 v1.0 不一样，别混：旧 M4 私信记录 = 新 M3；旧 M5 发送 = 新 M4；
//    旧 M6 标记已读 = 新 M5；旧的 M3 会话列表接口**被删了**。
//
// 本文件同样只做两件事：把下划线转成驼峰、把 null 兜底成安全默认值。
// =====================================================================

// ---------------------------------------------------------------------
// 一、后端原始形状 -> 前端内部形状
// ---------------------------------------------------------------------

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

/**
 * 方向只有 sent / received 两种。
 *
 * 兜底成 received 而不是 sent 是有意的：**收到**的消息更"安全"——
 * 万一方向字段后端没给，把它当"我收到的"最多是界面标签不对；
 * 当成"我发出的"则可能在界面上暗示"这是我发的"，属于信息错误。
 * （这属于"往保守一侧兜底"的一贯做法。）
 */
function toDirection(raw: string | null | undefined): MessageDirection {
  return raw === 'sent' ? 'sent' : 'received'
}

function toPostRef(
  raw: { id?: number | null; title?: string | null } | null | undefined,
): MessagePostRef | null {
  // ⚠️ 必须判 null：一级兜底如果直接 toPostRef 会造出 { id: 0, title: '' }，
  //    界面上就会显示"来自帖子 "这种半截文本。
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
  // 契约保证 data 里一定有 message；万一没有，给一条空消息而不是抛异常，
  // 免得把整个聊天页搞崩（页面会显示一条空气泡，比白屏好定位）
  return {
    message: toChatMessage(raw?.message ?? {}),
    remind: toRemindResult(raw?.remind),
  }
}

// ---------------------------------------------------------------------
// 二、前端内部形状 -> 发给后端的样子
// ---------------------------------------------------------------------

/** M2 查询参数：驼峰 -> 下划线。空值直接不发（不发 = 不筛选） */
export function toMessageQueryParams(params: MessageQuery): Record<string, unknown> {
  const q: Record<string, unknown> = {
    page: params.page,
    page_size: params.pageSize,
  }
  // box=all 是前端下拉框的"全部"，契约里 all 是合法值，
  // 但"不发就等于全部"，所以干脆不发，少一个参数少一个出错机会
  if (params.box && params.box !== 'all') q[MESSAGE_QUERY_PARAMS.box] = params.box
  // ⚠️ 这里必须判 undefined，不能写 if (params.isRead)：
  //    isRead=false 是"只看未读"，是有效条件，用真值判断会被漏掉。
  //    这就是 C++ 里"三态"的场景：true / false / 不传，三个含义都不一样。
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

// ---------------------------------------------------------------------
// 三、对外的 5 个函数
// ---------------------------------------------------------------------

/**
 * M1 未读私信数。
 *
 * v1.1 的返回体只有 `{ total }`——v1.0 里还有 private / comment 两个字段，
 * 因为当时消息分"私信 / 评论通知"两种。评论没了，就只剩一个总数。
 */
export async function getUnreadCount(currentUserId = 0): Promise<UnreadCount> {
  if (USE_MOCK) {
    await delay(150)
    // 假后端要按"我是谁"数未读（只有我收到的未读才算）
    return { total: mockGetUnreadCount(currentUserId) }
  }
  const raw = await http<RawUnreadCount>({ url: API_UNREAD_COUNT_PATH, method: 'get' })
  return { total: raw?.total ?? 0 }
}

/**
 * M2 我的消息（收到的 + 发出的，合并成一个列表）。
 *
 * currentUserId 不是发给后端的，是给转 mock 用的（假后端要按"我是谁"算 peer 的显示名）。
 * 真后端不需要它——真后端从令牌里就知道你是谁。
 */
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

/**
 * M3 私信记录（游标分页）。
 *
 * 首次进入聊天页不传 beforeId（拿最新的），
 * 往上滚动加载更多时把当前最早那条的 id 当 beforeId 传进去。
 */
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

/**
 * M4 发送私信。
 *
 * ⚠️ 三处容易写错的地方：
 *
 *   1. 返回体是嵌套的 `{ message, remind }`，不是直接给消息对象。
 *
 *   2. **提醒失败不影响私信本身**（契约原文）—— 接口仍然返回 201，
 *      所以这里绝不因为 remind.status 是 failed 就抛异常。
 *
 *   3. ⚠️⚠️ **先规范化，再分叉**。
 *      这一版最初我把截断写在 `toSendBody` 里，而它在 mock 分支里根本没被调用，
 *      结果假后端存下了 600 字的超长内容（前端上限是 500）。
 *      这和上一轮评论模块踩的是**同一个坑**（见交接说明第 9 条约定）。
 *
 *      C++ 类比：参数校验要放在函数入口，不要放在某一个 if 分支里 ——
 *      换个分支走，校验就被绕过了。
 */
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

/**
 * M5 标记已读（三种用法任选其一，优先级 ids > peer_id > all）。
 * 返回里带 `unreadTotal`，可以直接拿它更新小红点，不用再调 M1。
 */
export async function markRead(
  payload: MarkReadPayload,
  currentUserId = 0,
): Promise<MarkReadResult> {
  // 同样先规范化（决定用 ids / peer_id / all 哪一种），再分叉
  const body = toMarkReadBody(payload)

  if (USE_MOCK) {
    await delay(200)
    // ⚠️ 必须把 currentUserId 传进去：
    //    假后端要按"我是谁"决定哪些消息算"我收到的"，
    //    不传的话它会永远按默认的 MOCK_ME_ID 算，
    //    换个账号登录时"标记已读"就会标错人。
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
