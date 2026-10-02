<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { logoutApi } from '@/api/auth'
import { ROUTE_ADMIN_ITEMS, ROUTE_LOGIN } from '@/utils/contract'

const router = useRouter()
const userStore = useUserStore()

// 组长 10/02 的四条决定里去掉了"先审核后发布"和"分类"，
// 所以管理端只剩一个入口了（原来有 发布审核 / 认领审核 / 物品管理 三个）。
const menus = [{ path: ROUTE_ADMIN_ITEMS, title: '帖子管理' }]

const logout = async () => {
  await logoutApi().catch(() => undefined)
  userStore.logout()
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
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <span>校园失物招领 · 管理端</span>
        <el-button link type="danger" @click="logout">退出登录</el-button>
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
</style>
