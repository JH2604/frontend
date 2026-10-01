<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Claim, ClaimStatus } from '@/types/api'
import type { TableColumn } from '@/types/table'
import { getMyClaims } from '@/api/claim'
import PageTable from '@/components/PageTable.vue'
import { formatDateTime, fromNow } from '@/utils/format'

const router = useRouter()

const loading = ref(false)
const total = ref(0)
const list = ref<Claim[]>([])

const query = reactive({
  page: 1,
  pageSize: 10,
  status: undefined as ClaimStatus | undefined,
})

const statusOptions: { label: string; value: ClaimStatus }[] = [
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
]

// 认领状态 -> 文案 + 颜色。和物品状态的写法一样，只是值不同
const STATUS_MAP: Record<ClaimStatus, { text: string; type: 'warning' | 'success' | 'danger' }> = {
  pending: { text: '待审核', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
}

const columns: TableColumn[] = [
  { prop: 'itemTitle', label: '物品', minWidth: 160 },
  { prop: 'contact', label: '联系方式', width: 140 },
  { prop: 'message', label: '说明', minWidth: 180 },
  { label: '提交时间', width: 175, slot: 'createdAt' },
  { label: '状态', width: 100, slot: 'status' },
  { label: '操作', width: 100, slot: 'action' },
]

async function fetchList() {
  loading.value = true
  try {
    const res = await getMyClaims(query)
    list.value = res.list
    total.value = res.total
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
  <el-card>
    <template #header>我的认领申请（共 {{ total }} 条）</template>

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
      </template>

      <template #createdAt="{ row }">
        <span :title="formatDateTime(row.createdAt)">{{ fromNow(row.createdAt) }}</span>
      </template>

      <template #status="{ row }">
        <el-tag :type="STATUS_MAP[row.status as ClaimStatus]?.type ?? 'info'">
          {{ STATUS_MAP[row.status as ClaimStatus]?.text ?? row.status }}
        </el-tag>
      </template>

      <template #action="{ row }">
        <el-button link type="primary" @click="router.push(`/items/${row.itemId}`)">
          查看物品
        </el-button>
      </template>
    </PageTable>
  </el-card>
</template>
