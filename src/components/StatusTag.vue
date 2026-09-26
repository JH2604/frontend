<script setup lang="ts">
import type { ItemStatus } from '@/types/api'

defineProps<{ status: ItemStatus }>()

// 状态 -> 中文文案 + 标签颜色，只在这里维护一份
const STATUS_MAP: Record<ItemStatus, { text: string; type: 'success' | 'info' | 'warning' | 'danger' }> = {
  pending: { text: '待审核', type: 'warning' },
  published: { text: '已发布', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  closed: { text: '已关闭', type: 'info' },
}
</script>

<template>
  <el-tag :type="STATUS_MAP[status]?.type ?? 'info'">
    {{ STATUS_MAP[status]?.text ?? status }}
  </el-tag>
</template>
