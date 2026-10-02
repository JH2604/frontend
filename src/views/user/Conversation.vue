<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { ChatMessage, Conversation } from '@/types/api'
import { getConversation, markRead, sendMessage } from '@/api/message'
import { useUserStore } from '@/stores/user'
import {
  MESSAGE_CONTENT_MAX,
  MESSAGE_PAGE_SIZE_DEFAULT,
  ROUTE_MESSAGES,
  describeRemind,
} from '@/utils/contract'
import { formatDateTime, fromNow } from '@/utils/format'
import { setUnreadTotal } from '@/utils/unread'

// =====================================================================
// 私信聊天页（v1.1 契约 M3 私信记录 + M4 发送私信 + M5 标记已读）
//
// M3 GET /messages/conversations/{peer_id}?before_id&limit&mark_read
// M4 POST /messages
// M5 PUT /messages/read
//
// ⚠️ 三处 v1.1 的关键点，写错了就会出玄学 bug：
//
//   1. **M3 是游标分页，不是页码分页**（`before_id` + `has_more`）。
//      聊天记录必须用游标：用页码的话，翻页期间来了新消息，页码会整体错位，
//      出现"翻页看到重复消息"。C++ 类比：用 `list::iterator` 而不是
//      `vector` 的下标 —— 容器变了，迭代器仍然指向同一条数据。
//
//   2. **M3 的 list 按时间【正序】**（契约原文），和 M2 的倒序相反。
//      所以"更早的消息"在数组**前面**，加载更多是往数组**前面**插入。
//
//   3. **M4 的返回体是嵌套的** `{ message, remind }`，而且
//      **提醒失败不影响私信本身**（契约原文）—— 所以绝不能因为
//      remind.status === 'failed' 就把这次发送当成失败。
// =====================================================================

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

/** 输入框内容 */
const draft = ref('')
/** 是否勾选"短信 / 邮件提醒对方"（默认不勾，契约 M4 的 remind 默认 false） */
const wantRemind = ref(false)

/** 聊天区容器，用来控制滚动 */
const scroller = ref<HTMLElement | null>(null)

const peerId = computed(() => Number(route.params.peerId))
const peer = computed(() => conversation.value?.peer ?? null)
const canRemind = computed(() => conversation.value?.canRemind ?? false)

/**
 * 从帖子详情页跳过来时，地址栏上带着 `?postId=123`。
 *
 * 为什么要带它？契约 M4 的 `post_id` 字段：带上之后对方在消息列表里
 * 能看到"来自帖子 xxx"，知道这条私信是因为哪个帖子来的。
 * 只有**第一条**消息需要带（后面的对话对方已经知道上下文了），
 * 所以发完之后把它清掉。
 */
const postId = ref<number | undefined>(
  route.query.postId ? Number(route.query.postId) : undefined,
)

/** 我发出的消息靠右显示，收到的靠左 */
function isMine(m: ChatMessage): boolean {
  return m.direction === 'sent'
}

/** 滚到底部（看最新消息） */
async function scrollToBottom() {
  await nextTick()
  const el = scroller.value
  if (el) el.scrollTop = el.scrollHeight
}

/** 首次加载：不传 beforeId，拿最新的一批 */
async function fetchConversation() {
  loading.value = true
  try {
    const res = await getConversation(
      peerId.value,
      // mark_read 不传（契约默认 true）：进聊天页就把对方发给我的标为已读
      { limit: MESSAGE_PAGE_SIZE_DEFAULT },
      userStore.userId,
    )
    conversation.value = res
    list.value = res.list
    hasMore.value = res.hasMore

    // M3 默认已经帮我们把对方的消息标成已读了，但返回里没给最新的未读总数，
    // 所以这里再调一次 M5 拿 unread_total，顺便把小红点同步对。
    // （用 peer_id 范围标记是幂等的，重复调用没有副作用。）
    try {
      const marked = await markRead({ peerId: peerId.value })
      setUnreadTotal(marked.unreadTotal)
    } catch {
      // 标已读失败不影响看聊天
    }

    await scrollToBottom()
  } catch {
    // 提示已弹；保证页面不白屏
    conversation.value = null
    list.value = []
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

/**
 * 加载更早的消息（游标分页）。
 *
 * 游标取"当前最早那条的 id"，因为 list 是正序的，[0] 就是最早的一条。
 */
async function loadMore() {
  const earliest = list.value[0]
  if (!earliest || loadingMore.value) return

  loadingMore.value = true
  try {
    const res = await getConversation(
      peerId.value,
      { beforeId: earliest.id, limit: MESSAGE_PAGE_SIZE_DEFAULT },
      userStore.userId,
    )
    // 往前插入，并且按 id 去重 ——
    // 游标分页理论上不会重复，但"去重"这个动作成本极低，
    // 能防住"后端边界算错导致同一条出现两次"这种偶发问题。
    // C++ 类比：往 set 里 insert，重复的自然被吸收。
    const existing = new Set(list.value.map((m) => m.id))
    const older = res.list.filter((m) => !existing.has(m.id))
    list.value = [...older, ...list.value]
    hasMore.value = res.hasMore
  } catch {
    // 提示已弹
  } finally {
    loadingMore.value = false
  }
}

/** 发送私信（M4） */
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
        // 从帖子详情跳过来时带上（只有一条会话的第一句需要）
        postId: postId.value,
        // 没勾就不发这个字段（契约默认 false，少发一个字段）
        remind: wantRemind.value || undefined,
      },
      userStore.userId,
    )

    // ⚠️ 契约原文："提醒失败**不影响私信本身**，私信始终发送成功，接口仍返回 201。"
    //    所以这里无论 remind 是什么结果，都按"发送成功"处理，
    //    只是把提醒的情况用一句提示告诉用户。
    const remindText = describeRemind(res.remind.status, res.remind.reason, res.remind.channel)
    ElMessage.success(remindText)

    // 本地追加，不重新拉整个会话：
    // 因为 M3 是游标分页，重新拉只会拿到"最新 20 条"，
    // 用户之前翻上去看的历史就没了，滚动位置也会跳。
    list.value = [...list.value, res.message]
    draft.value = ''
    wantRemind.value = false
    // 帖子上下文只用一次：发出去之后就把地址栏上的 postId 清掉，
    // 免得后面每条消息都被当成"来自这个帖子"（那会让对方看到一串重复的帖子引用）
    postId.value = undefined
    await scrollToBottom()
  } catch {
    // 提示已弹；保留输入框内容方便重试
  } finally {
    sending.value = false
  }
}

// 从一个人的聊天切到另一个人时，路由参数变了但组件会复用，
// 所以必须 watch 参数重新加载。只靠 onMounted 会看到上一个人的聊天记录。
watch(peerId, (id) => {
  if (id) fetchConversation()
})

onMounted(fetchConversation)
</script>

<template>
  <el-card v-loading="loading" class="chat">
    <template #header>
      <div class="head">
        <el-button link @click="router.push(ROUTE_MESSAGES)">← 返回消息列表</el-button>
        <template v-if="peer">
          <el-avatar :size="32" :src="peer.avatarUrl">{{ peer.name.slice(0, 1) }}</el-avatar>
          <span class="name">{{ peer.name }}</span>
        </template>
      </div>
    </template>

    <el-empty v-if="!loading && !peer" description="找不到这个用户" />

    <template v-else>
      <div ref="scroller" class="scroller">
        <!-- 加载更早的消息（M3 游标分页） -->
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
              <!-- 我发出的消息：is_read 表示"对方读没读"（契约 M2/M3 的说明） -->
              <span v-if="isMine(m)">{{ m.isRead ? ' · 已读' : ' · 未读' }}</span>
              <span v-if="m.reminded" class="remind"> · 已提醒</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
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
          <!-- 提醒开关：契约说由 M3 的 can_remind 决定显不显示。
               对方没绑手机号/邮箱、或关了提醒时，后端会给 can_remind=false，
               这时候【不显示】这个开关（而不是显示了再让后端拒绝）。 -->
          <el-checkbox v-if="canRemind" v-model="wantRemind">
            短信 / 邮件提醒对方
          </el-checkbox>
          <span v-else class="no-remind">对方未绑定联系方式，无法提醒</span>

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
</style>
