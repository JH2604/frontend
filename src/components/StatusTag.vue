<script setup lang="ts">

import { computed } from 'vue'
import type { ItemStatus, ItemType } from '@/types/api'
import { STATUS_TEXT } from '@/utils/contract'

const props = defineProps<{ status: ItemStatus; itemType?: ItemType }>()

const text = computed(() => STATUS_TEXT[props.itemType ?? 'lost'][props.status])

// 进行中=绿色（还有戏），已完结=灰色（不用再看了）
const tagType = computed(() => (props.status === 'open' ? 'success' : 'info'))
</script>

<template>
  <el-tag :type="tagType">{{ text }}</el-tag>
</template>
