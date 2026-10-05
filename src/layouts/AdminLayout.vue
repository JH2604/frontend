<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { logoutApi } from '@/api/auth'
import { unreadTotal, useUnreadPolling } from '@/utils/unread'
import { ROUTE_ADMIN_ITEMS, ROUTE_HOME, ROUTE_LOGIN, ROUTE_MESSAGES } from '@/utils/contract'

const router = useRouter()
const userStore = useUserStore()

const menus = [
  { path: ROUTE_ADMIN_ITEMS, title: '帖子管理' },
  { path: ROUTE_MESSAGES, title: '消息' },
]

useUnreadPolling()

const logout = async () => {
  await logoutApi().catch(() => undefined)
  userStore.logout()
  unreadTotal.value = 0
  router.push(ROUTE_LOGIN)
}
</script>

<template>
  <el-container class="layout">
    <el-aside width="200px" class="aside">
      <div class="logo">管理后台</div>
      <el-menu router :default-active="$route.path">
        <el-menu-item v-for="m in menus" :key="m.path" :index="m.path">
          {{ m.title }}

          <el-badge
            v-if="m.path === ROUTE_MESSAGES"
            :value="unreadTotal"
            :max="99"
            :hidden="unreadTotal === 0"
            class="badge"
          />
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <span>校园失物招领 · 管理端</span>
        <div class="header-right">
          <el-button link @click="router.push(ROUTE_HOME)">返回用户端</el-button>
          <el-button link type="danger" @click="logout">退出登录</el-button>
        </div>
      </el-header>
      <el-main>
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout {
  min-height: 100vh;
}

.aside {
  border-right: 1px solid var(--el-border-color);
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.badge {
  margin-left: 8px;
  margin-top: -2px;
}
</style>
