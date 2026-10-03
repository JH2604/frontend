<script setup lang="ts">
// =====================================================================
// 根组件（整个应用的"树根"）
//
// 【它在哪里】
//   index.html  ← 只有一个空的 <div id="app">
//      └─ main.ts 把 App.vue 挂到那个 div 上
//           └─ App.vue（本文件）★ 你在这里
//                └─ <RouterView /> 是个"插座"
//                     └─ router/index.ts 决定往插座里插哪个页面
//                          ├─ UserLayout.vue（用户端外壳）
//                          │    ├─ ItemList.vue（首页）
//                          │    ├─ ItemDetail.vue（详情）
//                          │    └─ ...
//                          └─ AdminLayout.vue（管理端外壳）
//                               └─ ItemManage.vue（帖子管理）
//
// 【为什么只有 5 行】
//   它什么都不干，只放一个"插座"。真正的页面在外壳和 views 里。
//   这是很常见的设计：根组件尽量空，方便以后加全局的东西
//   （比如全局的 loading 遮罩、全局弹窗）。
//
// 【语法说明】
//   <script setup> 里是空的 —— 因为这里确实没有逻辑要写。
//   空着是正常的，不是为了"占位"。
//
// 【前端名词】
//   组件（Component）：一个 .vue 文件就是一块可以复用的界面。
//   根组件：被 main.ts 直接挂载的那个，整棵树从它开始。
// =====================================================================
</script>

<template>
  <!--
    RouterView：路由"插座"。
    它的行为完全由地址栏决定：
      地址是 /            -> 往这里插 ItemList.vue
      地址是 /items/1     -> 往这里插 ItemDetail.vue
      地址是 /messages/2  -> 往这里插 Conversation.vue
    所以你在这个文件里看不到任何页面名字 —— 那是 router/index.ts 的事。

    ⚠️ 注意是 <RouterView /> 不是 <router-view>：
    两者都能用，但本项目统一用大驼峰写法（和 import 进来的组件名一致）。
  -->
  <RouterView />
</template>
