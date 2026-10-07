<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getItemDetail } from '@/api/item'
import { getConversation, markRead, sendMessage } from '@/api/message'
import type { ChatMessage, Item } from '@/types/api'
import { useUserStore } from '@/stores/user'
import { MESSAGE_CONTENT_MAX, describeRemind } from '@/utils/contract'
import { setUnreadTotal } from '@/utils/unread'
import AvatarBadge from '../components/AvatarBadge.vue'
import { useMobileBridge } from '../context'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const bridge = useMobileBridge()

const peerId = computed(() => Number(route.params.peerId))
const postId = computed(() => {
  const raw = route.query.postId
  const value = Array.isArray(raw) ? raw[0] : raw
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : undefined
})

const peerName = ref('私信')
const peerAvatar = ref('')
const canRemind = ref(false)
const messages = ref<ChatMessage[]>([])
const post = ref<Item | null>(null)
const draft = ref('')
const remind = ref(true)
const sending = ref(false)
const scroller = ref<HTMLElement | null>(null)

async function load() {
  try {
    const res = await getConversation(peerId.value, { limit: 50 })
    peerName.value = res.peer.name
    peerAvatar.value = res.peer.avatarUrl
    canRemind.value = res.canRemind
    messages.value = res.list
    const read = await markRead({ peerId: peerId.value })
    setUnreadTotal(read.unreadTotal)
  } catch {
    messages.value = []
  }
  if (postId.value) {
    try {
      post.value = await getItemDetail(postId.value)
    } catch {
      post.value = null
    }
  } else {
    post.value = null
  }
  await nextTick()
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
}

async function send() {
  const content = draft.value.trim()
  if (!content || sending.value) return
  sending.value = true
  try {
    const res = await sendMessage({
      receiverId: peerId.value,
      content: content.slice(0, MESSAGE_CONTENT_MAX),
      postId: postId.value,
      remind: canRemind.value && remind.value,
    })
    messages.value.push(res.message)
    draft.value = ''
    bridge.toast(describeRemind(res.remind.status, res.remind.reason, res.remind.channel))
    await nextTick()
    if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
  } catch {
    // 失败提示由请求拦截器弹出
  } finally {
    sending.value = false
  }
}

watch(() => route.fullPath, load, { immediate: true })
</script>

<template>
  <div class="m-page">
    <div class="topbar">
      <button class="icon" type="button" @click="router.back()">‹</button>
      <div class="title">{{ peerName }}</div>
      <div class="icon"></div>
    </div>
    <div v-if="post" class="pad" style="padding-bottom: 0">
      <button
        type="button"
        class="card row"
        style="margin: 0; width: 100%"
        @click="router.push(`/m/items/${post.id}`)"
      >
        <div class="img" style="width: 40px; height: 40px">
          <img v-if="post.images[0]" :src="post.images[0]" alt="" />
        </div>
        <div style="text-align: left">
          <div class="muted" style="font-size: 12px">来自帖子</div>
          <b style="font-size: 14px">{{ post.title }}</b>
        </div>
      </button>
    </div>
    <div id="chatBody" ref="scroller" class="body pad">
      <div
        v-for="item in messages"
        :key="item.id"
        class="bubble-row"
        :class="{ me: item.direction === 'sent' }"
      >
        <AvatarBadge
          :name="item.direction === 'sent' ? bridge.profile()?.name : peerName"
          :url="item.direction === 'sent' ? bridge.profile()?.avatarUrl : peerAvatar"
          :user-id="item.direction === 'sent' ? userStore.userId : peerId"
          :size="32"
        />
        <div class="bubble">{{ item.content }}</div>
        <span v-if="item.direction === 'sent'" class="read">
          {{ item.isRead ? '已读' : '未读' }}{{ item.reminded ? ' · 已提醒' : '' }}
        </span>
      </div>
      <div v-if="messages.length === 0" class="empty">打个招呼吧</div>
    </div>
    <div class="composer">
      <label v-if="canRemind" class="remind">
        <input v-model="remind" type="checkbox" />
        同时通过短信 / 邮件提醒对方查看
      </label>
      <div v-else class="remind">对方未开启提醒，只能等待对方登录后查看</div>
      <div class="row">
        <input v-model="draft" placeholder="发消息…" @keyup.enter="send" />
        <button type="button" class="btn sm" :disabled="sending" @click="send">发送</button>
      </div>
    </div>
  </div>
</template>
