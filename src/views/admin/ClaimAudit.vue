<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Claim, ClaimStatus } from '@/types/api'
import type { TableColumn } from '@/types/table'
import { auditClaim, getClaimList } from '@/api/claim'
import PageTable from '@/components/PageTable.vue'

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

const STATUS_MAP: Record<ClaimStatus, { text: string; type: 'warning' | 'success' | 'danger' }> = {
  pending: { text: '待审核', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
}

const columns: TableColumn[] = [
  { prop: 'id', label: 'ID', width: 70 },
  { prop: 'itemTitle', label: '物品', minWidth: 150 },
  { prop: 'username', label: '申请人', width: 110 },
  { prop: 'contact', label: '联系方式', width: 140 },
  { prop: 'message', label: '说明', minWidth: 180 },
  { prop: 'createdAt', label: '提交时间', width: 175 },
  { label: '状态', width: 100, slot: 'status' },
  { label: '操作', width: 140, slot: 'action' },
]

async function fetchList() {
  loading.value = true
  try {
    const res = await getClaimList(query)
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

async function handleAudit(row: Claim, status: ClaimStatus) {
  const text = status === 'approved' ? '通过' : '驳回'

  try {
    await ElMessageBox.confirm(`确定要${text}「${row.username}」对「${row.itemTitle}」的认领吗？`, '认领审核', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  await auditClaim(row.id, status)
  ElMessage.success(`已${text}`)
  fetchList()
}

onMounted(fetchList)
</script>

<template>
  <el-card>
    <template #header>认领审核（共 {{ total }} 条）</template>

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

      <template #status="{ row }">
        <el-tag :type="STATUS_MAP[row.status as ClaimStatus]?.type ?? 'info'">
          {{ STATUS_MAP[row.status as ClaimStatus]?.text ?? row.status }}
        </el-tag>
      </template>

      <template #action="{ row }">
        <el-button
          v-if="row.status === 'pending'"
          link
          type="success"
          @click="handleAudit(row, 'approved')"
        >
          通过
        </el-button>
        <el-button
          v-if="row.status === 'pending'"
          link
          type="danger"
          @click="handleAudit(row, 'rejected')"
        >
          驳回
        </el-button>
        <span v-if="row.status !== 'pending'" class="done">已处理</span>
      </template>
    </PageTable>
  </el-card>
</template>

<style scoped>
.done {
  color: #909399;
  font-size: 13px;
}
</style>
