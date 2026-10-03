<script setup lang="ts">

import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Item, ItemStatus, UserProfile } from '@/types/api'
import { deleteItem, getItemDetail, updateItemStatus } from '@/api/item'
import { getUserProfile } from '@/api/user'
import StatusTag from '@/components/StatusTag.vue'
import { ROUTE_HOME, STATUS_TEXT, messageChatPath } from '@/utils/contract'
import { formatDateTime, fromNow } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const detail = ref<Item | null>(null)

const authorProfile = ref<UserProfile | null>(null)
const profileLoading = ref(false)

/** U6 查发帖人的联系能力（拿到 canMessage / canRemind） */
async function fetchAuthorProfile(authorId: number) {
  profileLoading.value = true
  try {
    authorProfile.value = await getUserProfile(authorId)
  } catch {
    // 查不到就当"不能私信"（fail-closed）：提示已经由拦截器弹过了，
    // 这里静默降级，绝不让"查用户失败"把整个详情页搞崩。
    authorProfile.value = null
  } finally {
    profileLoading.value = false
  }
}

const targetStatus = computed<ItemStatus>(() => (detail.value?.status === 'open' ? 'closed' : 'open'))

const actionText = computed(() => {
  if (!detail.value) return ''
  const { type } = detail.value
  return STATUS_TEXT[type][targetStatus.value]
})

async function fetchDetail() {
  loading.value = true
  try {
    detail.value = await getItemDetail(Number(route.params.id))
    // 详情拿到之后再查发帖人的联系能力（不需要等它，界面先出来）
    fetchAuthorProfile(detail.value.author.id)
  } catch (err) {
    // 后端返回 40400（资源不存在）时走到这个分支。
    // 关键点：绝不能白屏 —— 把 detail 置成 null，
    // 下面的模板就会渲染"没有找到这条信息"那张空状态卡片。
    detail.value = null
    authorProfile.value = null
    ElMessage.error(err instanceof Error ? err.message : '这条信息不存在或已被删除')
  } finally {
    loading.value = false
  }
}

function handleMessage() {
  if (!detail.value) return
  router.push({
    path: messageChatPath(detail.value.author.id),
    query: { postId: String(detail.value.id) },
  })
}

async function handleToggleStatus() {
  if (!detail.value) return
  const target = targetStatus.value
  const text = actionText.value

  try {
    await ElMessageBox.confirm(`确定把「${detail.value.title}」标记为${text}吗？`, '确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
  } catch {
    // 点了取消，什么都不做
    return
  }

  try {
    await updateItemStatus(detail.value.id, target)
    ElMessage.success(`已标记为${text}`)
    // P5 只返回三个字段，所以必须重新拉详情（见上面第 2 点的说明）
    fetchDetail()
  } catch {
    // 错误提示已经在 utils/request.ts 的拦截器里统一弹过了
  }
}

async function handleDelete() {
  if (!detail.value) return

  try {
    await ElMessageBox.confirm(
      `确定要删除「${detail.value.title}」吗？删掉就找不回来了。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try{
    await deleteItem(detail.value.id)
    ElMessage.success('已删除')
    router.push(ROUTE_HOME)
  } catch{
    // 错误提示已经在 utils/request.ts 的拦截器里统一弹过了，此处省略弹错误。
  }
}

onMounted(fetchDetail)
</script>

<template>
  <div v-loading="loading" class="detail">
    <el-page-header content="信息详情" @back="router.back()" />

    <el-card v-if="detail">
      <div class="head">
        <h2 class="title">{{ detail.title }}</h2>
        <div class="tags">
          <el-tag :type="detail.type === 'lost' ? 'danger' : 'success'">
            {{ detail.type === 'lost' ? '失物' : '招领' }}
          </el-tag>
          <StatusTag :status="detail.status" :item-type="detail.type" />
        </div>
      </div>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="地点">{{ detail.location.name || '—' }}</el-descriptions-item>

        <el-descriptions-item label="丢失/拾到时间">
          <span :title="formatDateTime(detail.eventTime)">
            {{ detail.eventTime ? fromNow(detail.eventTime) : '未填写' }}
          </span>
        </el-descriptions-item>

        <el-descriptions-item label="发布时间">
          <span :title="formatDateTime(detail.createdAt)">{{ fromNow(detail.createdAt) }}</span>
        </el-descriptions-item>

        <el-descriptions-item label="发布人">{{ detail.author.name }}</el-descriptions-item>
        <el-descriptions-item label="编号">{{ detail.id }}</el-descriptions-item>

        <el-descriptions-item label="完结时间">
          <span v-if="detail.closedAt" :title="formatDateTime(detail.closedAt)">
            {{ fromNow(detail.closedAt) }}
          </span>
          <span v-else>—</span>
        </el-descriptions-item>

        <el-descriptions-item label="描述" :span="2">
          <div class="content">{{ detail.content }}</div>
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="detail.images.length > 0" class="images">
        <el-image
          v-for="(url, index) in detail.images"
          :key="url + index"
          :src="url"
          :preview-src-list="detail.images"
          :initial-index="index"
          fit="cover"
          class="image"
        />
      </div>

      <div class="actions">

        <el-button
          v-if="authorProfile?.canMessage && !detail.isMine"
          :loading="profileLoading"
          @click="handleMessage"
        >
          私信 TA
        </el-button>

        <el-button
          v-if="detail.canChangeStatus"
          :type="detail.status === 'open' ? 'primary' : 'default'"
          @click="handleToggleStatus"
        >
          {{ detail.status === 'open' ? `标记为${actionText}` : '撤回为进行中' }}
        </el-button>
        <el-button v-if="detail.canDelete" type="danger" plain @click="handleDelete">
          删除
        </el-button>
      </div>
    </el-card>

    <el-empty v-else-if="!loading" description="没有找到这条信息" />
  </div>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.title {
  margin: 0;
}

.tags {
  display: flex;
  gap: 8px;
}

.content {
  white-space: pre-wrap;
  word-break: break-word;
}

.images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.image {
  width: 120px;
  height: 120px;
  border-radius: 8px;
}

.actions {
  margin-top: 16px;
  text-align: right;
}
</style>
