<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getItemList } from '@/api/item'
import type { ItemBrief, ItemType } from '@/types/api'
import { PAGE_SIZE_DEFAULT } from '@/utils/contract'
import { unreadTotal } from '@/utils/unread'
import AvatarBadge from '../components/AvatarBadge.vue'
import PostCard from '../components/PostCard.vue'
import { useMobileBridge } from '../context'

const router = useRouter()
const bridge = useMobileBridge()

const tab = ref<'all' | ItemType>('all')
const keyword = ref('')
const appliedKeyword = ref('')
const list = ref<ItemBrief[]>([])
const page = ref(1)
const total = ref(0)
const loading = ref(false)

const me = () => bridge.profile()

async function load(reset: boolean) {
  if (loading.value) return
  if (!reset && list.value.length >= total.value && total.value > 0) return
  loading.value = true
  const nextPage = reset ? 1 : page.value + 1
  try {
    const res = await getItemList({
      page: nextPage,
      pageSize: PAGE_SIZE_DEFAULT,
      type: tab.value,
      keyword: appliedKeyword.value,
      order: 'desc',
    })
    page.value = res.page
    total.value = res.total
    list.value = reset ? res.list : list.value.concat(res.list)
  } catch {
    if (reset) list.value = []
  } finally {
    loading.value = false
  }
}

function search() {
  appliedKeyword.value = keyword.value.trim()
  load(true)
}

function onScroll(event: Event) {
  const el = event.target as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) load(false)
}

function openTab(next: 'all' | ItemType) {
  tab.value = next
  load(true)
}

onMounted(() => load(true))
</script>

<template>
  <div class="m-page">
    <div class="topbar">
      <button class="icon" type="button" @click="bridge.openDrawer()">
        <AvatarBadge
          :name="me()?.name"
          :url="me()?.avatarUrl"
          :user-id="me()?.id"
          :size="32"
          :dot="unreadTotal > 0"
        />
      </button>
      <div class="title">失物招领</div>
      <div class="icon"></div>
    </div>
    <div style="background: var(--card); padding: 8px 12px 0">
      <div class="row">
        <input v-model="keyword" placeholder="搜索物品、地点…" @keyup.enter="search" />
        <button class="btn sm" type="button" @click="search">搜索</button>
      </div>
    </div>
    <div class="tabs">
      <button type="button" :class="{ on: tab === 'all' }" @click="openTab('all')">全部</button>
      <button type="button" :class="{ on: tab === 'lost' }" @click="openTab('lost')">失物</button>
      <button type="button" :class="{ on: tab === 'found' }" @click="openTab('found')">招领</button>
    </div>
    <div class="body pad" @scroll.passive="onScroll">
      <PostCard
        v-for="item in list"
        :key="item.id"
        :item="item"
        @open="router.push(`/m/items/${item.id}`)"
        @user="bridge.showUser(item.author.id, item.id)"
      />
      <div v-if="!loading && list.length === 0" class="empty">
        {{ appliedKeyword ? '没有找到相关帖子' : '还没有帖子' }}
      </div>
      <div v-if="loading" class="muted" style="text-align: center; padding: 12px">加载中…</div>
    </div>
    <button class="fab" type="button" @click="router.push('/m/publish')">＋</button>
  </div>
</template>
