<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { ChatMessage, Conversation, Item } from '@/types/api'
import { getConversation, markRead, sendMessage } from '@/api/message'
import { getItemDetail } from '@/api/item'
import { useUserStore } from '@/stores/user'
import StatusTag from '@/components/StatusTag.vue'
import {
  MESSAGE_CONTENT_MAX,
  MESSAGE_PAGE_SIZE_DEFAULT,
  ROUTE_MESSAGES,
  describeRemind,
  itemDetailPath,
  userProfilePath,
} from '@/utils/contract'
import { formatDateTime, fromNow } from '@/utils/format'
import { setUnreadTotal } from '@/utils/unread'

defineOptions({ name: 'Conversation' })

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const loadingMore = ref(false)
const sending = ref(false)

const conversation = ref<Conversation | null>(null)
const list = ref<ChatMessage[]>([])
const hasMore = ref(false)

const draft = ref('')

const wantRemind = ref(false)

const scroller = ref<HTMLElement | null>(null)

const peerId = computed(() => Number(route.params.peerId))
const peer = computed(() => conversation.value?.peer ?? null)
const canRemind = computed(() => conversation.value?.canRemind ?? false)

const postId = ref<number | undefined>(route.query.postId ? Number(route.query.postId) : undefined)
const linkedPost = ref<Item | null>(null)

async function fetchLinkedPost() {
  const id = postId.value
  if (!id) return
  try {
    linkedPost.value = await getItemDetail(id)
  } catch {
    linkedPost.value = null
  }
}

function isMine(m: ChatMessage): boolean {
  return m.direction === 'sent'
}

async function scrollToBottom() {
  await nextTick()
  const el = scroller.value
  if (el) el.scrollTop = el.scrollHeight
}

async function fetchConversation() {
  loading.value = true
  try {
    const res = await getConversation(
      peerId.value,

      { limit: MESSAGE_PAGE_SIZE_DEFAULT },
      userStore.userId,
    )
    conversation.value = res
    list.value = res.list
    hasMore.value = res.hasMore

    try {
      const marked = await markRead({ peerId: peerId.value })
      setUnreadTotal(marked.unreadTotal)
    } catch {}

    await scrollToBottom()
  } catch {
    conversation.value = null
    list.value = []
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  const earliest = list.value[0]
  if (!earliest || loadingMore.value || !hasMore.value) return
  const box = scroller.value
  const oldHeight = box?.scrollHeight ?? 0

  loadingMore.value = true
  try {
    const res = await getConversation(
      peerId.value,
      { beforeId: earliest.id, limit: MESSAGE_PAGE_SIZE_DEFAULT },
      userStore.userId,
    )
    const existing = new Set(list.value.map((m) => m.id))
    const older = res.list.filter((m) => !existing.has(m.id))
    list.value = [...older, ...list.value]
    hasMore.value = res.hasMore
    await nextTick()
    if (box) box.scrollTop = box.scrollHeight - oldHeight
  } catch {
  } finally {
    loadingMore.value = false
  }
}

function handleScroll() {
  const el = scroller.value
  if (!el || el.scrollTop !== 0 || !hasMore.value || loadingMore.value) return
  loadMore()
}

async function handleSend() {
  const content = draft.value.trim()
  if (!content) {
    ElMessage.warning('请先写点内容')
    return
  }
  if (content.length > MESSAGE_CONTENT_MAX) {
    ElMessage.warning(`私信最多 ${MESSAGE_CONTENT_MAX} 字`)
    return
  }

  sending.value = true
  try {
    const res = await sendMessage(
      {
        receiverId: peerId.value,
        content,

        postId: postId.value,

        remind: wantRemind.value || undefined,
      },
      userStore.userId,
    )

    const remindText = describeRemind(res.remind.status, res.remind.reason, res.remind.channel)
    ElMessage.success(remindText)

    list.value = [...list.value, res.message]
    draft.value = ''
    wantRemind.value = false
    postId.value = undefined
    await scrollToBottom()
  } catch {
  } finally {
    sending.value = false
  }
}

watch(peerId, (id) => {
  if (id) fetchConversation()
})

onMounted(() => {
  fetchConversation()
  fetchLinkedPost()
})
</script>

<template>
  <el-card v-loading="loading" class="chat">
    <template #header>
      <div class="head">
        <el-button link @click="router.push(ROUTE_MESSAGES)">← 返回消息列表</el-button>
        <template v-if="peer">
          <el-avatar
            :size="32"
            :src="peer.avatarUrl"
            class="peer-avatar"
            @click="router.push(userProfilePath(peer.id))"
          >
            {{ peer.name.slice(0, 1) }}
          </el-avatar>
          <span class="name clickable" @click="router.push(userProfilePath(peer.id))">
            {{ peer.name }}
          </span>
        </template>
      </div>
    </template>

    <el-empty v-if="!loading && !peer" description="找不到这个用户" />

    <template v-else>
      <div v-if="linkedPost" class="post-card" @click="router.push(itemDetailPath(linkedPost.id))">
        <el-tag :type="linkedPost.type === 'lost' ? 'danger' : 'success'" size="small">
          {{ linkedPost.type === 'lost' ? '失物' : '招领' }}
        </el-tag>
        <span class="post-title">{{ linkedPost.title }}</span>
        <StatusTag :status="linkedPost.status" :item-type="linkedPost.type" />
      </div>

      <div ref="scroller" class="scroller" @scroll="handleScroll">
        <div v-if="hasMore" class="more">
          <el-button link :loading="loadingMore" @click="loadMore">加载更早的消息</el-button>
        </div>
        <div v-else class="more start">— 这是最早的消息 —</div>

        <div v-for="m in list" :key="m.id" class="row" :class="isMine(m) ? 'mine' : 'theirs'">
          <el-avatar v-if="!isMine(m)" :size="32" :src="peer?.avatarUrl">
            {{ peer?.name.slice(0, 1) }}
          </el-avatar>

          <div class="bubble-wrap">
            <div class="bubble">{{ m.content }}</div>
            <div class="time" :title="formatDateTime(m.createdAt)">
              {{ fromNow(m.createdAt) }}

              <span v-if="isMine(m)">{{ m.isRead ? ' · 已读' : ' · 未读' }}</span>
              <span v-if="m.reminded" class="remind"> · 已提醒</span>
            </div>
          </div>
        </div>
      </div>

      <div class="editor">
        <el-input
          v-model="draft"
          type="textarea"
          :rows="3"
          :maxlength="MESSAGE_CONTENT_MAX"
          show-word-limit
          placeholder="写点什么…"
          @keyup.enter.ctrl="handleSend"
        />

        <div class="editor-foot">
          <el-checkbox v-if="canRemind" v-model="wantRemind"> 短信 / 邮件提醒对方 </el-checkbox>
          <span v-else class="no-remind">对方暂不接收短信 / 邮件提醒</span>

          <el-button type="primary" :loading="sending" @click="handleSend">
            发送（Ctrl + Enter）
          </el-button>
        </div>
      </div>
    </template>
  </el-card>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
}

.head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.name {
  font-weight: 600;
}

.clickable {
  cursor: pointer;
}

.peer-avatar {
  cursor: pointer;
}

.scroller {
  height: 420px;
  overflow-y: auto;
  padding: 8px 4px;
  background: #fafbfc;
  border-radius: 6px;
}

.more {
  text-align: center;
  margin-bottom: 8px;
}

.more.start {
  color: #c0c4cc;
  font-size: 12px;
}

.row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.row.mine {
  flex-direction: row-reverse;
}

.bubble-wrap {
  max-width: 70%;
  display: flex;
  flex-direction: column;
}

.row.mine .bubble-wrap {
  align-items: flex-end;
}

.bubble {
  padding: 8px 12px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #ebeef5;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

.row.mine .bubble {
  background: #ecf5ff;
  border-color: #d9ecff;
}

.time {
  margin-top: 2px;
  font-size: 12px;
  color: #c0c4cc;
}

.remind {
  color: #e6a23c;
}

.editor {
  margin-top: 12px;
}

.editor-foot {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.no-remind {
  font-size: 12px;
  color: #c0c4cc;
}

.post-card {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
}

.post-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
