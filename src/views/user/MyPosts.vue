<script setup lang="ts">
// =====================================================================
// 我的发布
//
// 【它在哪里】
//   router/index.ts:  { path: 'my-posts', component: MyPosts }
//      └─ UserLayout（外壳）
//           └─ 本文件 ★ 你在这里
//                └─ PostTable（同一个零件）
//
// 【这个文件是"组件复用"的最小范例，值得单独看一眼】
//
//   首页 ItemList.vue 写的是：   PostTable
//   本文件写的是：               PostTable mine
//
//   两个页面（同一张表格、同一套搜索、同一套分页），
//   区别只有一个参数 —— 所以只写一遍，用参数区分。
//
//   C++ 类比：
//     不是写两个 90% 相同的函数，而是写一个带默认参数的函数：
//       void show(bool mine = false)
//     调用点：show();        // 全部
//             show(true);    // 只看我发布的
//
// 【那个 mine 参数一路走到哪去了】
//   本文件 <PostTable mine />
//     -> PostTable.vue 的 defineProps 收到 props.mine = true
//        -> 它调 getItemList({ ..., mine: props.mine })
//           -> api/item.ts 的 toQueryParams 里：if (params.mine) q.mine = true
//              -> 请求变成 GET /posts?mine=true
//                 -> 后端只返回当前用户发布的帖子
//
//   一路全是"参数往下传"，没有任何一层去猜。
//   这就是"数据流是单向的"的意思：父 -> 子 -> 接口 -> 后端。
//
// 【defineOptions({ name }) 的作用同上一个文件】
//   必须和 UserLayout 里 keep-alive 的 :include 里的字符串一致，否则不缓存。
// =====================================================================

import PostTable from '@/components/PostTable.vue'

defineOptions({ name: 'MyPosts' })
</script>

<template>
  <el-card>
    <template #header>我的发布</template>
    <!--
      mine 没写值 = 传了 true（HTML 布尔属性的简写）。
      等价于 :mine="true"。如果写成 :mine="false" 那就和首页一样了。
    -->
    <PostTable mine />
  </el-card>
</template>
