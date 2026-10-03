<script setup lang="ts">
import { useRouter } from 'vue-router'
import PostTable from '@/components/PostTable.vue'
import {ROUTE_PUBLISH} from '@/utils/contract'

defineOptions({ name: 'MyPosts' })

const router = useRouter()
</script>

<template>
  <el-card>
    <template #header>
      <div class="head">
        <span>我的发布</span>
        <el-button type="primary" @click="router.push(ROUTE_PUBLISH)">+ 发布</el-button>
      </div>
    </template>

    <PostTable mine />
  </el-card>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
