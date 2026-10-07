<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { deleteItem, getItemList, updateItemStatus } from '@/api/item'
import type { ItemBrief, ItemStatus } from '@/types/api'
import { PAGE_SIZE_DEFAULT, STATUS_TEXT, nextStatus } from '@/utils/contract'
import PostCard from '../components/PostCard.vue'
import { useMobileBridge } from '../context'

const router = useRouter()
const bridge = useMobileBridge()

const order = ref<'desc' | 'asc'>('desc')
const status = ref<'all' | ItemStatus>('all')
const list = ref<ItemBrief[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await getItemList({
      page: 1,
      pageSize: PAGE_SIZE_DEFAULT,
      mine: true,
      order: order.value,
      status: status.value,
    })
    list.value = res.list
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

async function changeStatus(item: ItemBrief) {
  const target = nextStatus(item.status)
  const label = STATUS_TEXT[item.type][target]
  const ok = await bridge.confirm(`确定把这个帖子标记为"${label}"吗？`, {
    okText: '确定',
    danger: false,
  })
  if (ok === null) return
  try {
    const res = await updateItemStatus(item.id, target)
    item.status = res.status
    item.closedAt = res.closedAt
    if (status.value !== 'all' && item.status !== status.value) {
      list.value = list.value.filter((row) => row.id !== item.id)
    }
    bridge.toast(`已标记为${label}`)
  } catch {
    // 失败提示由请求拦截器弹出
  }
}

async function remove(item: ItemBrief) {
  const ok = await bridge.confirm('确定删除这个帖子吗？')
  if (ok === null) return
  try {
    await deleteItem(item.id)
    list.value = list.value.filter((row) => row.id !== item.id)
    bridge.toast('已删除')
  } catch {
    // 失败提示由请求拦截器弹出
  }
}

function setOrder(next: 'desc' | 'asc') {
  order.value = next
  load()
}

function setStatus(next: 'all' | ItemStatus) {
  status.value = next
  load()
}

onMounted(load)
</script>

<template>
  <div class="m-page">
    <div class="topbar">
      <button class="icon" type="button" @click="router.back()">‹</button>
      <div class="title">我发布的帖子</div>
      <div class="icon">
        <button type="button" style="font-size: 14px; color: var(--primary)" @click="router.push('/m/publish')">
          + 发布
        </button>
      </div>
    </div>
    <div class="tabs">
      <button type="button" :class="{ on: order === 'desc' }" @click="setOrder('desc')">最新在前</button>
      <button type="button" :class="{ on: order === 'asc' }" @click="setOrder('asc')">最早在前</button>
    </div>
    <div class="pad" style="padding-bottom: 0">
      <div class="seg sm">
        <button type="button" :class="{ on: status === 'all' }" @click="setStatus('all')">全部状态</button>
        <button type="button" :class="{ on: status === 'open' }" @click="setStatus('open')">进行中</button>
        <button type="button" :class="{ on: status === 'closed' }" @click="setStatus('closed')">
          已完结
        </button>
      </div>
    </div>
    <div class="body pad">
      <PostCard
        v-for="item in list"
        :key="item.id"
        :item="item"
        mine
        @open="router.push(`/m/items/${item.id}`)"
        @user="bridge.showUser(item.author.id, item.id)"
        @status="changeStatus(item)"
        @remove="remove(item)"
      />
      <div v-if="!loading && list.length === 0" class="empty">没有符合条件的帖子</div>
      <div v-if="loading" class="muted" style="text-align: center">加载中…</div>
    </div>
  </div>
</template>
