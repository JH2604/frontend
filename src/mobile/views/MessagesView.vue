<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getMessageList, markRead } from '@/api/message'
import type { MessageBrief, MessageBox } from '@/types/api'
import { PAGE_SIZE_DEFAULT } from '@/utils/contract'
import { fromNow } from '@/utils/format'
import { setUnreadTotal } from '@/utils/unread'
import AvatarBadge from '../components/AvatarBadge.vue'
import { useMobileBridge } from '../context'

const router = useRouter()
const bridge = useMobileBridge()

const box = ref<MessageBox>('all')
const list = ref<MessageBrief[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await getMessageList({ page: 1, pageSize: PAGE_SIZE_DEFAULT, box: box.value })
    list.value = res.list
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function setBox(next: MessageBox) {
  box.value = next
  load()
}

function open(row: MessageBrief) {
  const query = row.post ? `?postId=${row.post.id}` : ''
  router.push(`/m/messages/${row.peer.id}${query}`)
}

async function readAll() {
  try {
    const res = await markRead({ all: true })
    setUnreadTotal(res.unreadTotal)
    list.value.forEach((row) => {
      if (row.direction === 'received') row.isRead = true
    })
    bridge.toast('已全部标记为已读')
  } catch {
    // 失败提示由请求拦截器弹出
  }
}

onMounted(load)
</script>

<template>
  <div class="m-page">
    <div class="topbar">
      <button class="icon" type="button" @click="router.back()">‹</button>
      <div class="title">我的消息</div>
      <div class="icon">
        <button type="button" style="font-size: 12px; color: var(--primary)" @click="readAll">
          全部已读
        </button>
      </div>
    </div>
    <div class="tabs">
      <button type="button" :class="{ on: box === 'all' }" @click="setBox('all')">全部</button>
      <button type="button" :class="{ on: box === 'received' }" @click="setBox('received')">
        我收到的
      </button>
      <button type="button" :class="{ on: box === 'sent' }" @click="setBox('sent')">我发出的</button>
    </div>
    <div class="body">
      <button v-for="row in list" :key="row.id" type="button" class="list-item" @click="open(row)">
        <AvatarBadge
          :name="row.peer.name"
          :url="row.peer.avatarUrl"
          :user-id="row.peer.id"
          :size="42"
          :dot="row.direction === 'received' && !row.isRead"
        />
        <div class="grow">
          <div class="meta">
            <b style="color: var(--text); font-size: 14px">
              {{ row.direction === 'sent' ? '我 → ' : '' }}{{ row.peer.name }}
            </b>
            <span class="grow"></span>
            {{ fromNow(row.createdAt) }}
          </div>
          <div class="muted" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 3px">
            {{ row.post ? `[${row.post.title}] ` : '' }}{{ row.content }}
          </div>
        </div>
        <span class="right" :style="{ fontSize: '11px', color: row.isRead ? 'var(--sub)' : 'var(--lost)' }">
          {{ row.isRead ? '已读' : '未读' }}<template v-if="row.reminded"><br />已提醒</template>
        </span>
      </button>
      <div v-if="!loading && list.length === 0" class="empty">暂无消息</div>
    </div>
  </div>
</template>
