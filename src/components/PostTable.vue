<script setup lang="ts">

import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ItemBrief, ItemStatus, ItemType } from '@/types/api'
import type { TableColumn } from '@/types/table'
import { deleteItem, getItemList, updateItemStatus } from '@/api/item'
import PageTable from '@/components/PageTable.vue'
import StatusTag from '@/components/StatusTag.vue'
import UserProfileDialog from '@/components/UserProfileDialog.vue'
import {
  PAGE_SIZE_DEFAULT,
  itemDetailPath,
  nextStatus,
  statusActionText,
} from '@/utils/contract'
import { formatDateTime, fromNow } from '@/utils/format'
const props = withDefaults(defineProps<{ mine?: boolean }>(), { mine: false })

const router = useRouter()

const loading = ref(false)
const total = ref(0)
const list = ref<ItemBrief[]>([])

// ===== 发帖人信息弹窗（T11 / 契约 U6）=====
// 列表里每一行都有发布人，点了弹出对应那位的资料。
// 用两个 ref 记录"当前在看谁、从哪个帖子点的"，
// 弹窗复用同一个实例（不用给每行都创建一个弹窗）。
const profileOpen = ref(false)
const profileUserId = ref<number | null>(null)
const profilePostId = ref<number | undefined>(undefined)

function handleOpenProfile(row: ItemBrief) {
  profileUserId.value = row.author?.id ?? null
  profilePostId.value = row.id
  profileOpen.value = true
}

const query = reactive({
  page: 1,
  pageSize: PAGE_SIZE_DEFAULT,
  keyword: '',
  type: 'all' as ItemType | 'all',
  status: 'all' as ItemStatus | 'all',
  order: 'desc' as 'asc' | 'desc',
})

const typeOptions: { label: string; value: ItemType | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '失物', value: 'lost' },
  { label: '招领', value: 'found' },
]

const statusOptions: { label: string; value: ItemStatus | 'all' }[] = [
  { label: '全部状态', value: 'all' },
  { label: '进行中', value: 'open' },
  { label: '已完结', value: 'closed' },
]

const columns = computed<TableColumn[]>(() => [
  { prop: 'title', label: '标题', minWidth: 180 },
  { label: '类型', width: 90, slot: 'type' },
  { label: '地点', width: 150, slot: 'location' },
  { label: '发布人', width: 140, slot: 'author' },
  { label: '发布时间', width: 170, slot: 'createdAt' },
  { label: '状态', width: 100, slot: 'status' },
  { label: '操作', width: props.mine ? 280 : 90, slot: 'action' },
])

async function fetchList() {
  loading.value = true
  try {
    const res = await getItemList({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword,
      type: query.type,
      status: query.status,
      order: query.order,
      // mine 为 true 时后端只返回"我发布的"（文档 P1 的 mine 参数）
      mine: props.mine,
    })
    list.value = res.list
    total.value = res.total
  } catch {
    // 错误提示已经在 utils/request.ts 的拦截器里统一弹过了。
    // 这里只负责"别让页面白屏"：失败就把列表清空。
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
  query.keyword = ''
  query.type = 'all'
  query.status = 'all'
  query.order = 'desc'
  handleSearch()
}
async function handleToggleStatus(row: ItemBrief)
{
  const next =nextStatus(row.status)
  const actionText = statusActionText(row.type, row.status)
  try {
    await ElMessageBox.confirm(`确定把「${row.title}」${actionText}吗？`, '确认',{
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消',
    })
  } catch{
    return
  }
  try {
    const res = await updateItemStatus(row.id, next)
    row.status = res.status
    row.closedAt = res.closedAt
    ElMessage.success(`已${actionText}`)
    if (query.status !== 'all') fetchList()
  } catch {
    // 错误提示已经在 utils/request.ts 的拦截器里统一弹
  }
}

async function handleDeleteRow(row: ItemBrief) {
  try {
    await ElMessageBox.confirm(
      `确定要删除「${row.title}」吗？删掉就找不回来了。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await deleteItem(row.id)
    ElMessage.success('已删除')
    if (list.value.length === 1 && query.page > 1) query.page -= 1
    fetchList()
  } catch {
    // 错误提示已经由拦截器弹出
  }
}

onMounted(fetchList)

let activatedOnce = false
onActivated(() => {
  if (activatedOnce) fetchList()
  activatedOnce = true
})
</script>

<template>
  <PageTable
    v-model:page="query.page"
    v-model:page-size="query.pageSize"
    :columns="columns"
    :data="list"
    :total="total"
    :loading="loading"
    @search="fetchList"
  >
    <template #search>
      <el-form-item label="关键词">
        <el-input
          v-model="query.keyword"
          placeholder="搜标题 / 正文 / 地点"
          clearable
          style="width: 200px"
          @keyup.enter="handleSearch"
        />
      </el-form-item>

      <el-form-item label="类型">
        <el-radio-group v-model="query.type" @change="handleSearch">
          <el-radio-button v-for="o in typeOptions" :key="o.value" :value="o.value">
            {{ o.label }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="状态">
        <el-select v-model="query.status" style="width: 130px" @change="handleSearch">
          <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>

      <el-form-item v-if="props.mine" label="排序">
        <el-select v-model="query.order" style="width: 140px" @change="handleSearch">
          <el-option label="最新在前" value="desc" />
          <el-option label="最早在前" value="asc" />
        </el-select>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </template>

    <template #type="{ row }">
      <el-tag :type="row.type === 'lost' ? 'danger' : 'success'">
        {{ row.type === 'lost' ? '失物' : '招领' }}
      </el-tag>
    </template>

    <template #location="{ row }">
      {{ row.location?.name || '—' }}
    </template>

    <!--
      发布人：头像 + 姓名，点一下弹出资料（U6 / T11）。
      ⚠️ 这里不用 @click.stop —— 因为整行本来就没有点击事件。
         如果以后给行加了"点击进详情"，这句就要补上 .stop，
         否则点头像会同时"弹资料"和"进详情"两件事。
    -->
    <template #author="{ row }">
      <span class="author" @click="handleOpenProfile(row)">
        <el-avatar :size="24" :src="row.author?.avatarUrl">
          {{ (row.author?.name || '?').slice(0, 1) }}
        </el-avatar>
        <span class="author-name">{{ row.author?.name || '未知用户' }}</span>
      </span>
    </template>

    <template #createdAt="{ row }">
      <span :title="formatDateTime(row.createdAt)">{{ fromNow(row.createdAt) }}</span>
    </template>

    <template #status="{ row }">
      <StatusTag :status="row.status" :item-type="row.type" />
    </template>

    <template #action="{ row }">
      <el-button link type="primary" @click="router.push(itemDetailPath(row.id))">详情</el-button>
      <template v-if="props.mine">
        <el-button link type="primary" @click="handleToggleStatus(row)">
          {{ statusActionText(row.type, row.status) }}
        </el-button>
        <el-button link type="danger" @click="handleDeleteRow(row)">删除</el-button>
      </template>
    </template>
  </PageTable>

  <!-- 发帖人信息弹窗（U6）。整张表共用一个实例 -->
  <UserProfileDialog v-model="profileOpen" :user-id="profileUserId" :post-id="profilePostId" />
</template>

<style scoped>
/* 发布人可点（弹资料），给个手型和悬停变色让这个交互被发现 */
.author {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.author-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author:hover .author-name {
  color: var(--el-color-primary);
}
</style>
