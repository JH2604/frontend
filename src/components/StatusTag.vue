<script setup lang="ts">
import { computed } from 'vue'
import type { ItemStatus, ItemType } from '@/types/api'
import { STATUS_TEXT } from '@/utils/contract'

const props = defineProps<{ status: ItemStatus; itemType?: ItemType }>()

// 状态 -> 中文文案，只在这里维护一份（常量来自 contract.ts 的 STATUS_TEXT）。
//
// ⚠️ 这一段在 2026-10-02 的 v1.1 文档里被【明确规定】了，
//    以前我们俩人都写成了含糊的"进行中 / 已找回 / 已认领"：
//
//    v1.0 只写：open 进行中，closed 已找回 / 已认领
//    v1.1 第 1.7 节写清楚：
//      open   失物帖显示"未找到"，招领帖显示"待认领"
//      closed 失物帖显示"已找到"，招领帖显示"已认领"
//
//    为什么这个区别有意义？
//      对失物帖（我丢了东西），说"进行中"等于没说 —— 失主关心的是"还没找到"；
//      对招领帖（我捡到东西），说"未找到"就更奇怪了 —— 捡到的人在等失主来认领。
//      同一个状态、两种说法，所以文案必须带上帖子类型一起判断。
//
// itemType 没传时按失物（lost）兜底，和 ItemType 的默认值保持一致。
const text = computed(() => STATUS_TEXT[props.itemType ?? 'lost'][props.status])

// 进行中=绿色（还有戏），已完结=灰色（不用再看了）
const tagType = computed(() => (props.status === 'open' ? 'success' : 'info'))
</script>

<template>
  <el-tag :type="tagType">{{ text }}</el-tag>
</template>
