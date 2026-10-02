<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ItemBrief, ItemStatus, ItemType } from '@/types/api'
import type { TableColumn } from '@/types/table'
import { deleteItem, getItemList } from '@/api/item'
import PageTable from '@/components/PageTable.vue'
import StatusTag from '@/components/StatusTag.vue'
import { PAGE_SIZE_DEFAULT, itemDetailPath } from '@/utils/contract'
import { formatDateTime, fromNow } from '@/utils/format'

const router = useRouter()

const loading = ref(false)
const total = ref(0)
const list = ref<ItemBrief[]>([])

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
  { label: '发布人', width: 110, slot: 'author' },
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

// 管理员能做的只有删除（文档 P4：本人或管理员可删）。
//
// 这里【故意不放】"关闭 / 恢复发布"按钮：
// 契约 P5 写明改状态只有发帖人本人能做，管理员点了后端一定返回 40300 无权限。
// 放了就是给自己挖坑，验收演示时当众报错更难看。
async function handleDelete(row: ItemBrief) {
  try {
    await ElMessageBox.confirm(`确定要删除「${row.title}」吗？删掉就找不回来了。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  await deleteItem(row.id)
  ElMessage.success('已删除')
  fetchList()
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

      <template #author="{ row }">
        {{ row.author?.name || '未知用户' }}
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
  </el-card>
</template>
