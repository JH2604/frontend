<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { logoutApi } from '@/api/auth'
import { unreadTotal, useUnreadPolling } from '@/utils/unread'
import {
  ROUTE_ADMINS,
  ROUTE_HOME,
  ROUTE_LOGIN,
  ROUTE_MESSAGES,
  ROUTE_MY_POSTS,
  ROUTE_PUBLISH,
  ROUTE_SETTINGS,
  userProfilePath,
} from '@/utils/contract'

const router = useRouter()

const userStore = useUserStore()

const goPublish = () => {
  router.push(ROUTE_PUBLISH)
}

const goMyProfile = () => {
  if (!userStore.userId) return
  router.push(userProfilePath(userStore.userId))
}

const logout = async () => {
  await logoutApi().catch(() => undefined)
  userStore.logout()
  unreadTotal.value = 0
  router.push(ROUTE_LOGIN)
}

useUnreadPolling()
</script>

<template>
  <el-container class="layout">
    <el-header class="header">
      <span class="logo">校园失物招领</span>

      <el-menu
        mode="horizontal"
        router
        :default-active="$route.path"
        :ellipsis="false"
        class="menu"
      >
        <el-menu-item :index="ROUTE_HOME">首页</el-menu-item>
        <el-menu-item :index="ROUTE_MY_POSTS">我的发布</el-menu-item>
        <el-menu-item :index="ROUTE_MESSAGES">
          消息

          <el-badge :value="unreadTotal" :max="99" :hidden="unreadTotal === 0" class="badge" />
        </el-menu-item>
        <el-menu-item :index="ROUTE_ADMINS">联系管理员</el-menu-item>
        <el-menu-item :index="ROUTE_SETTINGS">用户中心</el-menu-item>
      </el-menu>

      <span v-if="userStore.isLogin" class="username-wrap">
        <el-avatar :size="28" class="user-avatar" @click="goMyProfile">
          {{ userStore.username.slice(0, 1) }}
        </el-avatar>
        <el-button link @click="goMyProfile">{{ userStore.username }}</el-button>
      </span>
      <el-button v-if="userStore.isLogin" link @click="logout">退出</el-button>
      <el-button v-else link @click="router.push(ROUTE_LOGIN)">登录</el-button>
      <el-button type="primary" @click="goPublish">发布信息</el-button>
    </el-header>

    <el-main>
      <RouterView v-slot="{ Component }">
        <keep-alive :include="['ItemList', 'MyPosts', 'Messages']">
          <component :is="Component" />
        </keep-alive>
      </RouterView>
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

.badge {
  margin-left: 6px;
  margin-top: -2px;
}

.username-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.user-avatar {
  cursor: pointer;
}

.username {
  font-size: 14px;
  color: #606266;
}
</style>
