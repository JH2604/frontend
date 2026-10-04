<script setup lang="ts">

import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ItemBrief, ItemStatus, ItemType } from '@/types/api'
import type { TableColumn } from '@/types/table'
import { deleteItem, getItemList } from '@/api/item'
import PageTable from '@/components/PageTable.vue'
import StatusTag from '@/components/StatusTag.vue'
import UserProfileDialog from '@/components/UserProfileDialog.vue'
import { PAGE_SIZE_DEFAULT, itemDetailPath } from '@/utils/contract'
import { formatDateTime, fromNow } from '@/utils/format'

const router = useRouter()

const loading = ref(false)
const total = ref(0)
const list = ref<ItemBrief[]>([])

// ===== 发帖人信息弹窗（U6）=====
// 管理端点"发布人"可以看到学号、手机号、邮箱等完整信息 ——
// 因为 U6 的返回由后端按角色决定（管理员才有 detail），前端只管渲染。
const profileOpen = ref(false)
const profileUserId = ref<number | null>(null)
const profilePostId = ref<number | undefined>(undefined)

/** 点发布人 -> 打开资料弹窗 */
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
})

const typeOptions: { label: string; value: ItemType | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '失物', value: 'lost' },
  { label: '招领', value: 'found' },
]

const statusOptions: { label: string; value: ItemStatus | 'all' }[] = [
  { label: '全部状态', value: 'all' },
  { label: '进行中', value: 'open' },
  { label: '已完成', value: 'closed' },
]

const columns: TableColumn[] = [
  { prop: 'id', label: 'ID', width: 70 },
  { prop: 'title', label: '标题', minWidth: 180 },
  { label: '类型', width: 90, slot: 'type' },
  { label: '地点', width: 150, slot: 'location' },
  { label: '发布人', width: 140, slot: 'author' },
  { label: '发布时间', width: 170, slot: 'createdAt' },
  { label: '状态', width: 100, slot: 'status' },
  { label: '操作', width: 130, slot: 'action' },
]

async function fetchList() {
  loading.value = true
  try {
    const res = await getItemList({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword,
      type: query.type,
      status: query.status,
    })
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
  query.keyword = ''
  query.type = 'all'
  query.status = 'all'
  handleSearch()
}

/**
 * 删除帖子（P4）。
 *
 * 管理端删的都是【别人的】帖子，所以用带原因输入的 prompt：
 * 契约 P4 写了 reason 的用途是"后端以该管理员身份给发帖人发一条站内私信说明"，
 * 填了原因，发帖人就知道自己为什么被删，不至于莫名其妙。
 *
 * 写法与 views/user/ItemDetail.vue 的 handleDelete() 保持一致
 * （那边是"删自己的用 confirm、管理员删别人的用 prompt"）。
 */
async function handleDelete(row: ItemBrief) {
  const id = row.id
  const title = row.title
  let reason: string | undefined

  try {
    const { value } = await ElMessageBox.prompt(
      `确定要删除「${title}」吗？删掉就找不回来了。\n\n你可以填写删除理由（可选），它会通过站内私信告知发帖人。`,
      '删除确认',
      {
        inputPlaceholder: '此处输入删除理由（可选，最多 200 字）',
        inputValidator: (value) =>
          value && value.length > 200 ? '删除理由不能超过 200 个字符' : true,
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    )
    // 只填了空格等于没填 —— trim 之后是空串就不传这个字段
    const trimmed = (value ?? '').trim()
    reason = trimmed || undefined
  } catch {
    // 点了取消
    return
  }

  try {
    await deleteItem(id, reason)
    ElMessage.success('已删除')
    // 删掉当前页最后一条时页码可能超出范围，简单处理：回到第 1 页
    if (list.value.length === 1 && query.page > 1) query.page -= 1
    fetchList()
  } catch {
    // 错误提示已经在 utils/request.ts 的拦截器里统一弹过了
  }
}

onMounted(fetchList)
</script>

<template>
  <el-card>
    <template #header>帖子管理（共 {{ total }} 条）</template>

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
        发布人：头像 + 姓名，点一下打开资料弹窗（U6）。
        ⚠️ 外层行没有点击事件，所以这里不需要 @click.stop；
           但如果以后给行加了点击，记得补上 .stop，否则会同时触发两件事。
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
        <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
      </template>
    </PageTable>

    <!-- 发帖人信息弹窗（U6）。管理端能看到完整信息，由后端按角色决定 -->
    <UserProfileDialog v-model="profileOpen" :user-id="profileUserId" :post-id="profilePostId" />
  </el-card>
</template>

<style scoped>
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
