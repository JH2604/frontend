<script setup lang="ts">
import PostTable from '@/components/PostTable.vue'

// keep-alive 的 include 是按组件名匹配的，所以这里显式声明名字。
// 名字必须和 layouts/UserLayout.vue 里的 :include="['ItemList', 'MyPosts']" 一致。
defineOptions({ name: 'ItemList' })
</script>

<template>
  <el-card>
    <template #header>全部信息</template>
    <PostTable />
  </el-card>
</template>
