<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Item, ItemStatus } from '@/types/api'
import type { TableColumn } from '@/types/table'
import type { Category } from '@/api/category'
import { deleteItem, getItemList, updateItemStatus } from '@/api/item'
import { getCategoryList } from '@/api/category'
import PageTable from '@/components/PageTable.vue'
import StatusTag from '@/components/StatusTag.vue'
import { formatDateTime, fromNow } from '@/utils/format'

const router = useRouter()

const loading = ref(false)
const total = ref(0)
const list = ref<Item[]>([])
const categories = ref<Category[]>([])

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  categoryId: undefined as number | undefined,
  status: undefined as ItemStatus | undefined,
})

// 状态下拉的选项。和 StatusTag 里那份文案保持一致
const statusOptions: { label: string; value: ItemStatus }[] = [
  { label: '待审核', value: 'pending' },
  { label: '已发布', value: 'published' },
  { label: '已驳回', value: 'rejected' },
  { label: '已关闭', value: 'closed' },
]

const columns: TableColumn[] = [
  { prop: 'id', label: 'ID', width: 70 },
  { prop: 'title', label: '标题', minWidth: 180 },
  { label: '类型', width: 90, slot: 'type' },
  { prop: 'place', label: '地点', width: 140 },
  { label: '提交时间', width: 175, slot: 'createdAt' },
  { label: '状态', width: 100, slot: 'status' },
  { label: '操作', width: 230, slot: 'action' },
]

async function fetchList() {
  loading.value = true
  try {
    const res = await getItemList(query)
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function fetchCategories() {
  categories.value = await getCategoryList()
}

function handleSearch() {
  query.page = 1
  fetchList()
}

// 管理员强制改状态：恢复发布 / 关闭
async function handleStatus(row: Item, status: ItemStatus) {
  const text = status === 'published' ? '恢复发布' : '关闭'

  try {
    await ElMessageBox.confirm(`确定要${text}「${row.title}」吗？`, '操作确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  await updateItemStatus(row.id, status)
  ElMessage.success(`已${text}`)
  fetchList()
}

async function handleDelete(row: Item) {
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

onMounted(() => {
  fetchCategories()
  fetchList()
})
</script>

<template>
  <el-card>
    <template #header>物品管理（共 {{ total }} 条）</template>

    <PageTable
      v-model:page="query.page"
      v-model:pageSize="query.pageSize"
      :columns="columns"
      :data="list"
      :total="total"
      :loading="loading"
      @search="fetchList"
    >
      <template #search>
        <el-form-item>
          <el-input
            v-model="query.keyword"
            placeholder="搜索物品名称"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item>
          <el-select
            v-model="query.categoryId"
            placeholder="全部分类"
            clearable
            style="width: 150px"
            @change="handleSearch"
          >
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-select
            v-model="query.status"
            placeholder="全部状态"
            clearable
            style="width: 150px"
            @change="handleSearch"
          >
            <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
        </el-form-item>
      </template>

      <template #createdAt="{ row }">
        <span :title="formatDateTime(row.createdAt)">{{ fromNow(row.createdAt) }}</span>
      </template>

      <template #type="{ row }">
        <el-tag :type="row.type === 'lost' ? 'danger' : 'success'">
          {{ row.type === 'lost' ? '失物' : '招领' }}
        </el-tag>
      </template>

      <template #status="{ row }">
        <StatusTag :status="row.status" />
      </template>

      <template #action="{ row }">
        <el-button link type="primary" @click="router.push(`/items/${row.id}`)">详情</el-button>
        <el-button
          v-if="row.status !== 'published'"
          link
          type="success"
          @click="handleStatus(row, 'published')"
        >
          恢复发布
        </el-button>
        <el-button
          v-if="row.status !== 'closed'"
          link
          type="warning"
          @click="handleStatus(row, 'closed')"
        >
          关闭
        </el-button>
        <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
      </template>
    </PageTable>
  </el-card>
</template>
