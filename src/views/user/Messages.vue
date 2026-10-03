<script setup lang="ts">

import { onActivated, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { MessageBox, MessageBrief } from '@/types/api'
import { getMessageList, markRead } from '@/api/message'
import { useUserStore } from '@/stores/user'
import {
  MESSAGE_PAGE_SIZE_DEFAULT,
  itemDetailPath,
  messageChatPath,
  userProfilePath,
} from '@/utils/contract'
import { formatDateTime, fromNow } from '@/utils/format'
import { refreshUnread, setUnreadTotal } from '@/utils/unread'

defineOptions({ name: 'Messages' })

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const list = ref<MessageBrief[]>([])
const total = ref(0)

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
    // 提示已经在 utils/request.ts 的拦截器里统一弹过，这里只保证不白屏
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

/** 点一条消息：如果是收到的，先标已读，再跳到聊天页 */
async function handleOpen(row: MessageBrief) {
  // 只有"我收到的"消息才谈得上"我把它标为已读"
  if (row.direction === 'received' && !row.isRead) {
    try {
      const res = await markRead({ ids: [row.id] })
      // M5 的返回里带最新的未读数，直接用它更新小红点，不用再调 M1
      setUnreadTotal(res.unreadTotal)
      row.isRead = true
    } catch {
      // 标记失败不影响"跳过去看聊天"这件事，所以这里吞掉错误继续走
    }
  }
  router.push(messageChatPath(row.peer.id))
}

/** 一键全部已读（契约 M5 的第三种用法 { all: true }） */
const marking = ref(false)
async function handleMarkAllRead() {
  marking.value = true
  try {
    const res = await markRead({ all: true })
    setUnreadTotal(res.unreadTotal)
    ElMessage.success(res.updated > 0 ? `已把 ${res.updated} 条标为已读` : '没有未读消息')
    await fetchList()
  } catch {
    // 提示已弹
  } finally {
    marking.value = false
  }
}

/** 只保留"作者"两个字以内的展示，避免长名字撑破布局 */
function directionText(row: MessageBrief): string {
  return row.direction === 'sent' ? '我 → ' : ''
}

onMounted(fetchList)

// 被 keep-alive 缓存后第二次进来走 onActivated（和 PostTable 同一套写法）
let activatedOnce = false
onActivated(() => {
  if (activatedOnce) fetchList()
  activatedOnce = true
})

// 顺便刷新一下未读小红点（进入这个页面时它会变）
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
          @click.stop="router.push(userProfilePath(row.peer.id))"
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

          <!-- 关联帖子（从帖子详情发起的私信才有） -->
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

/* 未读整行加一点点底色，配合左侧的圆点，一眼能扫出来 */
.item.unread {
  background: #f0f7ff;
}

.item + .item {
  border-top: 1px solid #f0f2f5;
}

/* 头像是可点的（进用户主页 U6），给个手型让这个交互被发现 */
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
