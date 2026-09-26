<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const goPublish = () => {
  router.push('/publish')
}

const logout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<template>
  <el-container class="layout">
    <el-header class="header">
      <span class="logo">校园失物招领</span>

      <el-menu mode="horizontal" router :default-active="$route.path" :ellipsis="false" class="menu">
        <el-menu-item index="/">首页</el-menu-item>
        <el-menu-item index="/my-claims">我的认领</el-menu-item>
      </el-menu>

      <span v-if="userStore.isLogin" class="username">{{ userStore.username }}</span>
      <el-button v-if="userStore.isLogin" link @click="logout">退出</el-button>
      <el-button v-else link @click="router.push('/login')">登录</el-button>
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

.username {
  font-size: 14px;
  color: #606266;
}
</style>
