<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Item, ItemStatus } from '@/types/api'
import type { TableColumn } from '@/types/table'
import { getItemList, updateItemStatus } from '@/api/item'
import PageTable from '@/components/PageTable.vue'
import StatusTag from '@/components/StatusTag.vue'

const loading = ref(false)
const total = ref(0)
const list = ref<Item[]>([])

// 审核页只看"待审核"的，所以 status 写死，页面上不放筛选
const query = reactive({
  page: 1,
  pageSize: 10,
  status: 'pending' as ItemStatus,
})

const columns: TableColumn[] = [
  { prop: 'title', label: '标题', minWidth: 180 },
  { label: '类型', width: 100, slot: 'type' },
  { prop: 'place', label: '地点', width: 150 },
  { prop: 'createdAt', label: '提交时间', width: 180 },
  { label: '状态', width: 100, slot: 'status' },
  { label: '操作', width: 170, slot: 'action' },
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

// 通过 / 驳回。改完状态这条就不在"待审核"里了，重新拉一次列表它就消失
async function handleAudit(row: Item, status: ItemStatus) {
  const text = status === 'published' ? '通过' : '驳回'

  try {
    await ElMessageBox.confirm(`确定要${text}「${row.title}」吗？`, '审核确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
  } catch {
    // 用户点了"取消"，直接结束
    return
  }

  await updateItemStatus(row.id, status)
  ElMessage.success(`已${text}`)
  fetchList()
}

onMounted(fetchList)
</script>

<template>
  <el-card>
    <template #header>发布审核（待审核 {{ total }} 条）</template>

    <PageTable
      v-model:page="query.page"
      v-model:pageSize="query.pageSize"
      :columns="columns"
      :data="list"
      :total="total"
      :loading="loading"
      @search="fetchList"
    >
      <template #type="{ row }">
        <el-tag :type="row.type === 'lost' ? 'danger' : 'success'">
          {{ row.type === 'lost' ? '失物' : '招领' }}
        </el-tag>
      </template>

      <template #status="{ row }">
        <StatusTag :status="row.status" />
      </template>

      <template #action="{ row }">
        <el-button link type="success" @click="handleAudit(row, 'published')">通过</el-button>
        <el-button link type="danger" @click="handleAudit(row, 'rejected')">驳回</el-button>
      </template>
    </PageTable>
  </el-card>
</template>
