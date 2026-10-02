<script setup lang="ts">
import PostTable from '@/components/PostTable.vue'

// 和 ItemList.vue 的区别只有 mine 这一个属性：
// 传了 mine，PostTable 就会在请求里带上 mine=true，
// 后端只返回当前登录用户自己发布的帖子（文档 P1）。
defineOptions({ name: 'MyPosts' })
</script>

<template>
  <el-card>
    <template #header>我的发布</template>
    <PostTable mine />
  </el-card>
</template>
