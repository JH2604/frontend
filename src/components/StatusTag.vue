<script setup lang="ts">
import { computed } from 'vue'
import type { ItemStatus, ItemType } from '@/types/api'
import { STATUS_TEXT } from '@/utils/contract'

const props = defineProps<{ status: ItemStatus; itemType?: ItemType }>()

const text = computed(() => STATUS_TEXT[props.itemType ?? 'lost'][props.status])

const tagType = computed(() => (props.status === 'open' ? 'success' : 'info'))
</script>

<template>
  <el-tag :type="tagType">{{ text }}</el-tag>
</template>
