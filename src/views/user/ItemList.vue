<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Item } from '@/types/api'
import type { TableColumn } from '@/types/table'
import type { Category } from '@/api/category'
import { getItemList } from '@/api/item'
import { getCategoryList } from '@/api/category'
import PageTable from '@/components/PageTable.vue'
import StatusTag from '@/components/StatusTag.vue'

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
})

// 一份列描述，PageTable 照着画表格
const columns: TableColumn[] = [
  { prop: 'title', label: '标题', minWidth: 180 },
  { label: '类型', width: 100, slot: 'type' },
  { prop: 'place', label: '地点', width: 160 },
  { prop: 'happenTime', label: '时间', width: 180 },
  { label: '状态', width: 100, slot: 'status' },
  { label: '操作', width: 100, slot: 'action' },
]

// 数据从 api 层来。现在 USE_MOCK = true 走假数据，
// 后端好了以后把 src/mock/index.ts 里的 USE_MOCK 改成 false 就行，这一页不用动
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

onMounted(() => {
  fetchCategories()
  fetchList()
})
</script>

<template>
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
        <el-button type="primary" @click="handleSearch">搜索</el-button>
      </el-form-item>
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
    </template>
  </PageTable>
</template>
