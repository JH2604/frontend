<script setup lang="ts">
import { computed } from 'vue'
import type { ItemStatus, ItemType } from '@/types/api'

const props = defineProps<{ status: ItemStatus; itemType?: ItemType }>()

// 状态 -> 中文文案，只在这里维护一份。
//
// 契约里的 closed 有两种说法：
//   失物（lost）被找到了 -> "已找回"
//   招领（found）被领走了 -> "已认领"
// 所以文案要带上帖子类型一起判断，不能写死。
const text = computed(() => {
  if (props.status === 'open') return '进行中'
  return props.itemType === 'found' ? '已认领' : '已找回'
})

// 进行中=绿色（还有戏），已完成=灰色（不用再看了）
const tagType = computed(() => (props.status === 'open' ? 'success' : 'info'))
</script>

<template>
  <el-tag :type="tagType">{{ text }}</el-tag>
</template>
