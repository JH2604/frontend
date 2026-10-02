<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { logoutApi } from '@/api/auth'
import {
  ROUTE_HOME,
  ROUTE_LOGIN,
  ROUTE_MY_POSTS,
  ROUTE_PUBLISH,
} from '@/utils/contract'

const router = useRouter()
const userStore = useUserStore()

const goPublish = () => {
  router.push(ROUTE_PUBLISH)
}

const logout = async () => {
  // 先请后端把这次会话吊销掉（文档 A3）；失败也无所谓，本地一定要退干净
  await logoutApi().catch(() => undefined)
  userStore.logout()
  router.push(ROUTE_LOGIN)
}
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
      </el-menu>

      <span v-if="userStore.isLogin" class="username">{{ userStore.username }}</span>
      <el-button v-if="userStore.isLogin" link @click="logout">退出</el-button>
      <el-button v-else link @click="router.push(ROUTE_LOGIN)">登录</el-button>
      <el-button type="primary" @click="goPublish">发布信息</el-button>
    </el-header>

    <el-main>
      <!-- keep-alive 会把匹配到的页面组件留在内存里不销毁。
           效果：从详情页返回列表时，搜索条件、页码、滚动位置都还在。
           不加这个的话，每次返回列表都会重新加载并跳回第 1 页。
           include 是按"组件名"匹配的，所以那两个页面里写了
           defineOptions({ name: 'ItemList' }) / { name: 'MyPosts' }。 -->
      <RouterView v-slot="{ Component }">
        <keep-alive :include="['ItemList', 'MyPosts']">
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

.username {
  font-size: 14px;
  color: #606266;
}
</style>
