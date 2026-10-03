<script setup lang="ts">
// =====================================================================
// 首页（"全部信息"）
//
// 【它在哪里】
//   router/index.ts:  { path: '', component: ItemList }   <- 访问 / 时显示本文件
//      └─ UserLayout（外壳：页头 + 菜单）
//           └─ 本文件 ★ 你在这里
//                └─ PostTable（真正干活的那个零件）
//
// 【为什么这个页面只有 12 行】
//   因为它什么都不干 —— 搜索栏、表格、分页、发请求全在 PostTable.vue 里。
//   首页和"我的发布"的唯一区别是传不传 mine 参数，
//   所以差异被抽成"一行标签"，页面本身就成了壳。
//
//   C++ 类比：main() 里只调用一个函数，逻辑都在那个函数里。
//   这不是"偷懒"，而是"改一处、两处生效"。
//
// 【本文件唯一一个语法点】
//   defineOptions({ name: 'ItemList' })
//     给组件起个名字。这里的名字【必须】和 layouts/UserLayout.vue 里
//     keep-alive 的 :include="['ItemList', 'MyPosts', 'Messages']" 完全一致。
//     —— 这个名字决定了"页面会不会被缓存"：
//        写对了：从详情页返回首页，搜索条件和页码都还在
//        写错了：缓存不生效（而且不会报错，只是体验变差，很难查）
//
//     为什么需要手动起名？因为 <script setup> 是匿名的，
//     Vue 默认拿文件名当组件名。文件名恰好是 ItemList.vue，
//     其实不写也能匹配上 —— 但显式写出来更保险，也更明显。
// =====================================================================

import PostTable from '@/components/PostTable.vue'

defineOptions({ name: 'ItemList' })
</script>

<template>
  <!--
    el-card 是 Element Plus 的卡片容器（带边框和标题栏）。
    下面的 <template #header> 是它的"头部插槽" —— 往标题栏里塞内容。

    <PostTable /> 不带 mine 参数：
      PostTable 里的 withDefaults 会给 mine 一个默认值 false，
      于是请求里不带 mine=true，后端就返回【全部】帖子。
      （对比 views/user/MyPosts.vue 里的 <PostTable mine />）
  -->
  <el-card>
    <template #header>全部信息</template>
    <PostTable />
  </el-card>
</template>
