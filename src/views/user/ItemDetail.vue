<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Item, ItemStatus } from '@/types/api'
import { deleteItem, getItemDetail, updateItemStatus } from '@/api/item'
import StatusTag from '@/components/StatusTag.vue'
import { ROUTE_HOME, STATUS_TEXT } from '@/utils/contract'
import { formatDateTime, fromNow } from '@/utils/format'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const detail = ref<Item | null>(null)

/**
 * 当前状态下"这个按钮按下去会变成什么"。
 *
 * v1.1 明确写了状态是**双向**的：
 *   closed → 标记已找到 / 已认领
 *   open   → 撤回为进行中（比如误点）
 * 所以不用布尔值，直接存目标状态。
 *
 * C++ 类比：用 `enum class Status` 而不是 `bool closed` ——
 * 布尔值表达不了"两个方向"，加一个方向就得重构。
 */
const targetStatus = computed<ItemStatus>(() => (detail.value?.status === 'open' ? 'closed' : 'open'))

/**
 * 按钮上的文案，随"帖子类型 + 目标状态"变。
 *
 * 文案来自 contract.ts 的 STATUS_TEXT（v1.1 第 1.7 节规定的说法）：
 *   locked/open  失物=未找到，招领=待认领
 *   closed       失物=已找到，招领=已认领
 */
const actionText = computed(() => {
  if (!detail.value) return ''
  const { type } = detail.value
  return STATUS_TEXT[type][targetStatus.value]
})

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

/**
 * 改状态（文档 P5）。
 *
 * 两处按 v1.1 改过：
 *   1. 判断条件从 isMine 改成 canChangeStatus。
 *      契约第 7 章权限表："修改他人帖子的状态 → 管理员也 ✗"，
 *      所以 canChangeStatus 目前等价于 isMine；但用后端给的这个字段更稳
 *      （万一以后放开"管理员也能改"，用 isMine 就漏了）。
 *   2. 改完必须重新拉一次详情。
 *      因为 v1.1 的 P5 **只返回** { id, status, closed_at }，
 *      不再返回完整帖子。想更新页面上的状态标签/按钮文案，
 *      就得再调一次 P2。以前的代码也是这么做的，这里保持不变。
 */
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

        <!-- 已完结时显示"什么时候完结的"（v1.1 新增的 closed_at）。
             进行中是 null，就显示一个短横，不留空白。 -->
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
        <!-- 改状态按钮（P5）。
             判断用后端给的 canChangeStatus，不用 isMine（原因见 script 里的注释）。
             文案随"帖子类型 + 目标状态"变：
               进行中 → 「标记为已找到」/「标记为已认领」
               已完结 → 「撤回为进行中」 -->
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
