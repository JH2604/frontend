<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Item } from '@/types/api'
import { deleteItem, getItemDetail, updateItemStatus } from '@/api/item'
import StatusTag from '@/components/StatusTag.vue'
import { ROUTE_HOME } from '@/utils/contract'
import { formatDateTime, fromNow } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const detail = ref<Item | null>(null)

async function fetchDetail() {
  loading.value = true
  try {
    detail.value = await getItemDetail(Number(route.params.id))
  } catch (err) {
    // 后端返回 40400（资源不存在）时走到这个分支。
    // 关键点：绝不能白屏 —— 把 detail 置成 null，
    // 下面的模板就会渲染"没有找到这条信息"那张空状态卡片。
    detail.value = null
    ElMessage.error(err instanceof Error ? err.message : '这条信息不存在或已被删除')
  } finally {
    loading.value = false
  }
}

// 标记已找回 / 已认领（文档 P5）。
// 契约里写明【只有发帖人本人】能改，所以按钮上带了 isMine 判断。
async function handleClose() {
  if (!detail.value) return
  const text = detail.value.type === 'found' ? '已认领' : '已找回'

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

  await updateItemStatus(detail.value.id, 'closed')
  ElMessage.success(`已标记为${text}`)
  // 改完重新拉一次详情，页面上的状态标签才会跟着变
  fetchDetail()
}

// 删除（文档 P4，本人或管理员）。
// 能不能删是后端算好的（返回里的 can_delete），前端只管照着显示。
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

  await deleteItem(detail.value.id)
  ElMessage.success('已删除')
  router.push(ROUTE_HOME)
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
        <el-descriptions-item label="评论数">{{ detail.commentCount }}</el-descriptions-item>

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
          v-if="detail.isMine && detail.status === 'open'"
          type="primary"
          @click="handleClose"
        >
          标记为{{ detail.type === 'found' ? '已认领' : '已找回' }}
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
