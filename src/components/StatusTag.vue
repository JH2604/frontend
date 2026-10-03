<script setup lang="ts">
//
// =====================================================================
// 状态标签（本项目里最小的"组件"范例，适合第一次学组件时看）
// =====================================================================
//
// 【它在哪里】
// components/ 里的东西都是"零件"——不是页面，是被页面拼装使用的。
// 用它的地方：
// components/PostTable.vue        列表里每一行的"状态"列
// views/user/ItemDetail.vue       详情页标题旁边
// views/admin/ItemManage.vue      管理端列表
//
// 【组件是什么】
// 一个 .vue 文件 = 一块可以复用的界面。
// 写一次，到处 StatusTag 用。
// C++ 类比：把一段重复逻辑抽成一个函数，调用点只传参数。
//
// 【父子组件怎么传数据（本文件是最好的例子）】
// 子组件（本文件）：用 defineProps 声明"我需要什么参数"
// const props = defineProps<{ status: ItemStatus; itemType?: ItemType }>()
// 父组件：写标签时把值传进来
// StatusTag :status="detail.status" :item-type="detail.type"
//
// 三个细节：
// 1. 类型里的问号表示【可选】参数（itemType 可以不传）
// 2. 模板里写 :item-type（短横线），脚本里是 props.itemType（驼峰）
// —— HTML 属性名不区分大小写，所以约定用短横线，Vue 自动转驼峰
// 3. props 是【只读】的，子组件不能改它（改了 Vue 会警告）
// —— 想改就得 emit 事件让父组件去改，这叫"单向数据流"
//
// 【本文件里的语法点】
// computed(...)   计算属性：由 props 算出来的值，props 变了它自动重算
// 在 script 里要写 .value，在模板里不用写
// el-tag          Element Plus 的标签组件，type 决定颜色
// STATUS_TEXT     从 utils/contract.ts 导进来的文案表（跨文件共享常量）
//

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
