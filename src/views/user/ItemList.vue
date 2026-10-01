<script setup lang="ts">
import { onActivated, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Item } from '@/types/api'
import type { TableColumn } from '@/types/table'
import type { Category } from '@/api/category'
import { getItemList } from '@/api/item'
import { getCategoryList } from '@/api/category'
import PageTable from '@/components/PageTable.vue'
import StatusTag from '@/components/StatusTag.vue'
import { formatDateTime, fromNow } from '@/utils/format'

// keep-alive 的 include 是按组件名匹配的，所以这里显式声明名字。
// 名字必须和 layouts/UserLayout.vue 里的 :include="['ItemList']" 一致。
defineOptions({ name: 'ItemList' })

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
  { label: '时间', width: 180, slot: 'happenTime' },
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

// 被 keep-alive 缓存之后，第二次进入本页不会再触发 onMounted，而是触发 onActivated。
// 这时重新拉一次数据，保证看到的是最新的（比如刚发布完帖子回来），
// 同时搜索条件和页码仍然保留着。
// 第一次激活要跳过，因为那一次 onMounted 已经拉过了。
let activatedOnce = false
onActivated(() => {
  if (activatedOnce) {
    fetchList()
  }
  activatedOnce = true
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

      <!-- 相对时间："3小时前" 比 "2026-09-19 14:00" 更好扫。
           鼠标悬停能看到精确时间（title 属性），不牺牲准确性。 -->
      <template #happenTime="{ row }">
        <span :title="formatDateTime(row.happenTime)">{{ fromNow(row.happenTime) }}</span>
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
