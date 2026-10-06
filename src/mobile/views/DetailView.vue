<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { deleteItem, getItemDetail } from '@/api/item'
import type { Item } from '@/types/api'
import { useUserStore } from '@/stores/user'
import { STATUS_TEXT } from '@/utils/contract'
import { fromNow } from '@/utils/format'
import AvatarBadge from '../components/AvatarBadge.vue'
import { useMobileBridge } from '../context'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const bridge = useMobileBridge()

const detail = ref<Item | null>(null)
const imageIndex = ref(0)
const loading = ref(false)

const statusText = computed(() => {
  if (!detail.value) return ''
  return STATUS_TEXT[detail.value.type][detail.value.status]
})

async function load() {
  loading.value = true
  try {
    detail.value = await getItemDetail(Number(route.params.id))
    imageIndex.value = 0
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
}

function shiftImage(step: number) {
  const images = detail.value?.images ?? []
  if (!images.length) return
  imageIndex.value = (imageIndex.value + step + images.length) % images.length
}

async function remove() {
  if (!detail.value) return
  const askReason = userStore.isAdmin && !detail.value.isMine
  const reason = await bridge.confirm('确定删除这个帖子吗？', { reason: askReason })
  if (reason === null) return
  try {
    await deleteItem(detail.value.id, reason || undefined)
    bridge.toast('已删除')
    router.back()
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
      <div class="title">帖子详情</div>
      <div class="icon"></div>
    </div>
    <div v-if="loading" class="body"><div class="empty">加载中…</div></div>
    <div v-else-if="!detail" class="body"><div class="empty">没有找到这篇帖子</div></div>
    <template v-else>
      <div class="body">
        <div
          v-if="detail.images.length"
          class="img cover-lg"
          @click="shiftImage(1)"
        >
          <img :src="detail.images[imageIndex]" alt="" />
          <span class="img-index">图片 {{ imageIndex + 1 }} / {{ detail.images.length }}</span>
        </div>
        <div class="card" style="border-radius: 0; margin: 0">
          <h3 style="margin-bottom: 8px">
            <span class="tag" :class="detail.type">{{ detail.type === 'lost' ? '失物' : '招领' }}</span>
            {{ detail.title }}
          </h3>
          <p
            style="font-size: 13px; margin-bottom: 8px"
            :style="{ color: detail.status === 'closed' ? 'var(--sub)' : 'var(--found)' }"
          >
            ● {{ statusText }}
          </p>
          <p style="line-height: 1.7; margin-bottom: 12px">{{ detail.content }}</p>
          <div class="muted" style="margin-bottom: 4px">📍 {{ detail.location.name }}</div>
          <div class="img map-box">地图位置预览</div>
          <div class="muted">🕒 发布于 {{ fromNow(detail.createdAt) }}</div>
        </div>
        <button
          type="button"
          class="card row"
          style="border-radius: 0; margin: 8px 0; width: 100%"
          @click="bridge.showUser(detail.author.id, detail.id)"
        >
          <AvatarBadge
            :name="detail.author.name"
            :url="detail.author.avatarUrl"
            :user-id="detail.author.id"
            :size="40"
          />
          <div style="flex: 1; text-align: left">
            <b>{{ detail.author.name }}</b>
            <span v-if="detail.author.role === 'admin'" class="tag admin">管理员</span>
            <div class="muted">点击头像查看发帖人信息</div>
          </div>
          <span v-if="detail.canDelete" class="btn sm danger" @click.stop="remove">删除帖子</span>
        </button>
      </div>
      <div v-if="!detail.isMine" class="bottom-bar">
        <button
          type="button"
          class="btn"
          @click="router.push(`/m/messages/${detail.author.id}?postId=${detail.id}`)"
        >
          私信发帖人
        </button>
      </div>
    </template>
  </div>
</template>
