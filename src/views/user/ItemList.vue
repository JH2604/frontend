<script setup lang="ts">

import PostTable from '@/components/PostTable.vue'

defineOptions({ name: 'ItemList' })
</script>

<template>

  <el-card>
    <template #header>全部信息</template>
    <PostTable />
  </el-card>
</template>
