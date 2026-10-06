<script setup lang="ts">
import { onActivated, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { MessageBox, MessageBrief } from '@/types/api'
import { getMessageList, markRead } from '@/api/message'
import UserProfileDialog from '@/components/UserProfileDialog.vue'
import { useUserStore } from '@/stores/user'
import { MESSAGE_PAGE_SIZE_DEFAULT, itemDetailPath, messageChatPath } from '@/utils/contract'
import { formatDateTime, fromNow } from '@/utils/format'
import { refreshUnread, setUnreadTotal } from '@/utils/unread'

defineOptions({ name: 'Messages' })

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const list = ref<MessageBrief[]>([])
const total = ref(0)

const profileOpen = ref(false)
const profileUserId = ref<number | null>(null)

function handleOpenProfile(peerId: number) {
  profileUserId.value = peerId
  profileOpen.value = true
}

const query = reactive({
  page: 1,
  pageSize: MESSAGE_PAGE_SIZE_DEFAULT,
  box: 'all' as MessageBox,
  onlyUnread: false,
})

const boxOptions: { label: string; value: MessageBox }[] = [
  { label: '全部', value: 'all' },
  { label: '我收到的', value: 'received' },
  { label: '我发出的', value: 'sent' },
]

async function fetchList() {
  loading.value = true
  try {
    const res = await getMessageList(
      {
        page: query.page,
        pageSize: query.pageSize,
        box: query.box,
        isRead: query.onlyUnread ? false : undefined,
      },
      userStore.userId,
    )
    list.value = res.list
    total.value = res.total
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  fetchList()
}

function handleReset() {
  query.box = 'all'
  query.onlyUnread = false
  handleSearch()
}

async function handleOpen(row: MessageBrief) {
  if (row.direction === 'received' && !row.isRead) {
    try {
      const res = await markRead({ ids: [row.id] })

      setUnreadTotal(res.unreadTotal)
      row.isRead = true
    } catch {}
  }
  router.push(messageChatPath(row.peer.id))
}

const marking = ref(false)
async function handleMarkAllRead() {
  marking.value = true
  try {
    const res = await markRead({ all: true })
    setUnreadTotal(res.unreadTotal)
    ElMessage.success(res.updated > 0 ? `已把 ${res.updated} 条标为已读` : '没有未读消息')
    await fetchList()
  } catch {
  } finally {
    marking.value = false
  }
}

function directionText(row: MessageBrief): string {
  return row.direction === 'sent' ? '我 → ' : ''
}

onMounted(fetchList)

let activatedOnce = false
onActivated(() => {
  if (activatedOnce) fetchList()
  activatedOnce = true
})

onMounted(refreshUnread)
</script>

<template>
  <el-card>
    <template #header>
      <div class="head">
        <span>我的消息（共 {{ total }} 条）</span>
        <el-button :loading="marking" @click="handleMarkAllRead">全部标为已读</el-button>
      </div>
    </template>

    <div class="filters">
      <el-radio-group v-model="query.box" @change="handleSearch">
        <el-radio-button v-for="o in boxOptions" :key="o.value" :value="o.value">
          {{ o.label }}
        </el-radio-button>
      </el-radio-group>

      <el-checkbox v-model="query.onlyUnread" @change="handleSearch">只看未读</el-checkbox>

      <el-button link @click="handleReset">重置</el-button>
    </div>

    <div v-loading="loading" class="list">
      <el-empty v-if="list.length === 0 && !loading" description="还没有消息" />

      <div
        v-for="row in list"
        :key="row.id"
        class="item"
        :class="{ unread: row.direction === 'received' && !row.isRead }"
        @click="handleOpen(row)"
      >
        <el-avatar
          :size="40"
          :src="row.peer.avatarUrl"
          class="peer-avatar"
          @click.stop="handleOpenProfile(row.peer.id)"
        >
          {{ row.peer.name.slice(0, 1) }}
        </el-avatar>

        <div class="body">
          <div class="meta">
            <span class="peer">{{ directionText(row) }}{{ row.peer.name }}</span>

            <span v-if="row.direction === 'received' && !row.isRead" class="dot" />

            <span v-if="row.reminded" class="remind">已提醒</span>
            <span class="time" :title="formatDateTime(row.createdAt)">
              {{ fromNow(row.createdAt) }}
            </span>
          </div>

          <div class="content">{{ row.content }}</div>

          <div v-if="row.post" class="post" @click.stop="router.push(itemDetailPath(row.post.id))">
            来自帖子：{{ row.post.title }}
          </div>
        </div>
      </div>
    </div>

    <el-pagination
      v-if="total > query.pageSize"
      v-model:current-page="query.page"
      class="pager"
      layout="prev, pager, next"
      :page-size="query.pageSize"
      :total="total"
      @current-change="fetchList"
    />

    <UserProfileDialog v-model="profileOpen" :user-id="profileUserId" />
  </el-card>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filters {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.list {
  min-height: 120px;
}

.item {
  display: flex;
  gap: 12px;
  padding: 12px 8px;
  border-radius: 6px;
  cursor: pointer;
}

.item:hover {
  background: #f5f7fa;
}

.item.unread {
  background: #f0f7ff;
}

.item + .item {
  border-top: 1px solid #f0f2f5;
}

.peer-avatar {
  cursor: pointer;
  flex-shrink: 0;
}

.body {
  flex: 1;
  min-width: 0;
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.peer {
  font-weight: 600;
  font-size: 14px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f56c6c;
  display: inline-block;
}

.remind {
  font-size: 12px;
  color: #e6a23c;
}

.time {
  margin-left: auto;
  color: #c0c4cc;
  font-size: 12px;
}

.content {
  margin-top: 4px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post {
  margin-top: 4px;
  font-size: 12px;
  color: #409eff;
}

.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
