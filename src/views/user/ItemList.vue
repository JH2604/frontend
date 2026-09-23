<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { Item } from '@/types/api'

const loading = ref(false)
const total = ref(0)
const list = ref<Item[]>([])

// reactive 包一个对象，配合 v-model 用
const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
})

// 假数据：后端接口通了以后，把这里换成 getItemList(query) 就行
async function fetchList() {
  loading.value = true
  try {
    await new Promise((r) => setTimeout(r, 300))

    list.value = [
      {
        id: 1,
        title: '黑色钱包',
        type: 'lost',
        categoryId: 1,
        description: '在图书馆三楼自习时丢失，内有学生卡',
        images: [],
        place: '图书馆三楼',
        happenTime: '2026-09-19 14:00',
        status: 'published',
        userId: 1,
        createdAt: '2026-09-19 15:00',
      },
      {
        id: 2,
        title: '学生卡（李四）',
        type: 'found',
        categoryId: 2,
        description: '在二食堂门口捡到',
        images: [],
        place: '第二食堂',
        happenTime: '2026-09-20 12:00',
        status: 'pending',
        userId: 2,
        createdAt: '2026-09-20 12:30',
      },
    ]
    total.value = list.value.length
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  fetchList()
}

onMounted(fetchList)
</script>

<template>
  <div class="page">
    <el-form inline @submit.prevent="handleSearch">
      <el-form-item>
        <el-input
          v-model="query.keyword"
          placeholder="搜索物品名称"
          clearable
          style="width: 220px"
          @keyup.enter="handleSearch"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="title" label="标题" min-width="180" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="row.type === 'lost' ? 'danger' : 'success'">
            {{ row.type === 'lost' ? '失物' : '招领' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="place" label="地点" width="160" />
      <el-table-column prop="happenTime" label="时间" width="180" />
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button link type="primary" @click="$router.push(`/items/${row.id}`)">
            详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="pager"
      v-model:current-page="query.page"
      v-model:page-size="query.pageSize"
      :total="total"
      layout="total, prev, pager, next"
      @current-change="fetchList"
    />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pager {
  justify-content: flex-end;
}
</style>
