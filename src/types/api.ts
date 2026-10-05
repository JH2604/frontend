import type { ContactChannelValue, RoleValue } from '@/utils/contract'

export interface ApiResult<T = unknown> {
  code: number
  message?: string
  msg?: string
  data: T
}

export interface PageQuery {
  page: number
  pageSize: number
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export type ItemType = 'lost' | 'found'

export type ItemStatus = 'open' | 'closed'

export type Theme = 'light' | 'dark' | 'system'

export interface Location {
  name: string
  latitude?: number | null
  longitude?: number | null
}

export interface Author {
  id: number

  name: string

  avatarUrl: string
  role: RoleValue
}

export interface ItemBrief {
  id: number
  type: ItemType
  title: string

  contentPreview: string

  coverUrl: string | null

  imageCount: number
  location: Location
  status: ItemStatus
  author: Author
  createdAt: string

  closedAt: string | null
}

export interface Item {
  id: number
  type: ItemType
  title: string

  content: string
  images: string[]
  location: Location

  eventTime: string | null
  status: ItemStatus
  author: Author

  isMine: boolean

  canDelete: boolean

  canChangeStatus: boolean
  createdAt: string

  closedAt: string | null
}

export interface StatusPatchResult {
  id: number
  status: ItemStatus
  closedAt: string | null
}

export interface CreateItemPayload {
  type: ItemType
  title: string
  content: string
  images?: string[]
  location: { name: string; latitude?: number | null; longitude?: number | null }
  eventTime?: string | null
}

export interface ItemQuery extends PageQuery {
  type?: ItemType | 'all'
  keyword?: string

  mine?: boolean
  status?: ItemStatus | 'all'

  order?: 'asc' | 'desc'
}

export interface RawLocation {
  name?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface RawAuthor {
  id?: number | null
  name?: string | null
  avatar_url?: string | null
  role?: string | null
}

export interface RawPostBrief {
  id?: number | null
  type?: string | null
  title?: string | null
  content_preview?: string | null
  cover_url?: string | null
  image_count?: number | null
  location?: RawLocation | null
  status?: string | null
  author?: RawAuthor | null
  created_at?: string | null
  closed_at?: string | null
}

export interface RawPost {
  id?: number | null
  type?: string | null
  title?: string | null
  content?: string | null
  images?: string[] | null
  location?: RawLocation | null
  event_time?: string | null
  status?: string | null
  author?: RawAuthor | null
  is_mine?: boolean | null
  can_delete?: boolean | null
  can_change_status?: boolean | null
  created_at?: string | null
  closed_at?: string | null
}

export interface RawPostPage {
  list?: RawPostBrief[] | null
  total?: number | null
  page?: number | null
  page_size?: number | null
}

export interface RawStatusPatch {
  id?: number | null
  status?: string | null
  closed_at?: string | null
}

export type MessageDirection = 'sent' | 'received'

export type MessageBox = MessageDirection | 'all'

export interface MessagePostRef {
  id: number
  title: string
}

export interface MessageBrief {
  id: number
  direction: MessageDirection
  peer: Author
  content: string

  post: MessagePostRef | null

  isRead: boolean

  reminded: boolean
  createdAt: string
}

export interface MessageQuery extends PageQuery {
  box?: MessageBox

  isRead?: boolean
}

export interface ChatMessage {
  id: number
  direction: MessageDirection
  content: string
  isRead: boolean
  reminded: boolean
  createdAt: string
}

export interface Conversation {
  peer: Author

  canRemind: boolean

  list: ChatMessage[]
  hasMore: boolean
}

export interface ConversationQuery {
  beforeId?: number
  limit?: number

  markRead?: boolean
}

export interface RemindResult {
  status: string
  channel: string | null
  reason: string | null
}

export interface SendMessageResult {
  message: ChatMessage
  remind: RemindResult
}

export interface SendMessagePayload {
  receiverId: number
  content: string

  postId?: number

  remind?: boolean
}

export interface MarkReadPayload {
  ids?: number[]
  peerId?: number
  all?: boolean
}

export interface UnreadCount {
  total: number
}

export interface MarkReadResult {
  updated: number
  unreadTotal: number
}

export interface RawMessageBrief {
  id?: number | null
  direction?: string | null
  peer?: RawAuthor | null
  content?: string | null
  post?: { id?: number | null; title?: string | null } | null
  is_read?: boolean | null
  reminded?: boolean | null
  created_at?: string | null
}

export interface RawMessagePage {
  list?: RawMessageBrief[] | null
  total?: number | null
  page?: number | null
  page_size?: number | null
}

export interface RawChatMessage {
  id?: number | null
  direction?: string | null
  content?: string | null
  is_read?: boolean | null
  reminded?: boolean | null
  created_at?: string | null
}

export interface RawConversation {
  peer?: RawAuthor | null
  can_remind?: boolean | null
  list?: RawChatMessage[] | null
  has_more?: boolean | null
}

export interface RawRemindResult {
  status?: string | null
  channel?: string | null
  reason?: string | null
}

export interface RawSendMessage {
  message?: RawChatMessage | null
  remind?: RawRemindResult | null
}

export interface RawUnreadCount {
  total?: number | null
}

export interface RawMarkRead {
  updated?: number | null
  unread_total?: number | null
}

export interface UserPublic {
  id: number
  name: string
  avatarUrl: string
  role: RoleValue
  postCount: number

  canMessage: boolean

  canRemind: boolean
}

export interface UserDetail {
  studentId: string
  phone: string | null
  email: string | null
  allowRemind: boolean
  createdAt: string
  lastLoginAt: string
}

export interface UserProfile extends UserPublic {
  detail: UserDetail | null
}

export interface RawUserDetail {
  student_id?: string | null
  phone?: string | null
  email?: string | null
  allow_remind?: boolean | null
  created_at?: string | null
  last_login_at?: string | null
}

export interface RawUserProfile {
  id?: number | null
  name?: string | null
  avatar_url?: string | null
  role?: string | null
  post_count?: number | null
  can_message?: boolean | null
  can_remind?: boolean | null
  detail?: RawUserDetail | null
}

export interface UserMe {
  id: number
  studentId: string
  name: string
  avatarUrl: string
  role: RoleValue

  phone: string | null

  email: string | null

  allowRemind: boolean
  theme: Theme
  postCount: number
  createdAt: string
}

export interface UpdateMePayload {
  avatarUrl?: string
  theme?: Theme
  allowRemind?: boolean
}

export interface SendCodePayload {
  channel: ContactChannelValue

  target: string
}

export interface BindContactPayload {
  channel: ContactChannelValue
  target: string
  code: string
}

export interface ContactResult {
  phone: string | null
  email: string | null
}

export interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
}

export interface AdminContact {
  id: number
  name: string
  avatarUrl: string
  role: RoleValue

  email: string | null
  canMessage: boolean
}

export interface RawUserMe {
  id?: number | null
  student_id?: string | null
  name?: string | null
  avatar_url?: string | null
  role?: string | null
  phone?: string | null
  email?: string | null
  allow_remind?: boolean | null
  theme?: string | null
  post_count?: number | null
  created_at?: string | null
}

export interface RawContactResult {
  phone?: string | null
  email?: string | null
}

export interface RawAdminContact {
  id?: number | null
  name?: string | null
  avatar_url?: string | null
  role?: string | null
  email?: string | null
  can_message?: boolean | null
}
