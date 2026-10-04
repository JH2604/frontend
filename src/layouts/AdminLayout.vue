<script setup lang="ts">

import { RouterView, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { logoutApi } from '@/api/auth'
import { unreadTotal, useUnreadPolling } from '@/utils/unread'
import { ROUTE_ADMIN_ITEMS, ROUTE_HOME, ROUTE_LOGIN, ROUTE_MESSAGES } from '@/utils/contract'

const router = useRouter()
const userStore = useUserStore()

// 管理端菜单。
// 「消息」跳的是【用户端外壳下】的消息页（/messages）——
// 用户端路由只要求"已登录"，没有限制必须是学生，
// 所以管理员点过去能正常打开、能看学生发来的私信并回复（T17 的目标）。
// 路由常量统一从 contract.ts 取，不在页面里写死字符串。
const menus = [
  { path: ROUTE_ADMIN_ITEMS, title: '帖子管理' },
  { path: ROUTE_MESSAGES, title: '消息' },
]

// 未读私信小红点（契约 M1）。
// 和用户端外壳共用同一个函数、同一份状态，
// 所以这里看到的数字和用户端是一致的。
useUnreadPolling()

const logout = async () => {
  await logoutApi().catch(() => undefined)
  userStore.logout()
  unreadTotal.value = 0 // 退出时顺手清零，避免下个账号看到残留数字
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
          <!--
            只有「消息」这一项挂未读数字。
            el-badge 的 value 为 0 时默认仍显示一个小点，
            所以必须配 :hidden 显式藏掉（这是 el-badge 的一个坑）。
          -->
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
          <!-- 返回用户端首页：管理员也需要以普通用户身份浏览帖子 -->
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

/* 未读数字跟在菜单文字后面，不要把它挤到单独一行 */
.badge {
  margin-left: 8px;
  margin-top: -2px;
}
</style>
