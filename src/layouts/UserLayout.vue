<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'

const router = useRouter()

const goPublish = () => {
  router.push('/publish')
}
</script>

<template>
  <el-container class="layout">
    <el-header class="header">
      <span class="logo">校园失物招领</span>

      <el-menu mode="horizontal" router :default-active="$route.path" :ellipsis="false" class="menu">
        <el-menu-item index="/">首页</el-menu-item>
      </el-menu>

      <el-button type="primary" @click="goPublish">发布失物</el-button>
    </el-header>

    <el-main>
      <RouterView />
    </el-main>
  </el-container>
</template>

<style scoped>
.layout {
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid var(--el-border-color);
}

.logo {
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
}

.menu {
  flex: 1;
  border-bottom: none;
}
</style>
