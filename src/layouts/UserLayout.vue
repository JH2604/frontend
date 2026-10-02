<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { logoutApi } from '@/api/auth'
import { unreadTotal, refreshUnread } from '@/utils/unread'
import {
  ROUTE_HOME,
  ROUTE_LOGIN,
  ROUTE_MESSAGES,
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
  unreadTotal.value = 0
  router.push(ROUTE_LOGIN)
}

// ===== 未读私信小红点（契约 M1）=====
//
// 契约原文：
//   「`total > 0` 时首页头像右上角显示小红点。
//     前端在进入首页、App 回到前台时调用，或每 30 秒轮询一次；
//     以后可以换成 WebSocket 推送。」
//
// 所以这里做两件事：
//   1. 进来先拉一次
//   2. 每 30 秒轮询一次
//
// ⚠️ 为什么"页面切到后台"要单独处理？
//   浏览器的定时器在后台标签页会被降频（Chrome 大约每分钟才跑一次），
//   所以只靠 setInterval 的话，用户切回前台可能看到的是几十秒前的旧数字。
//   监听 visibilitychange，一切回前台立刻补一次。
let timer: number | undefined

function handleVisible() {
  if (document.visibilityState === 'visible') refreshUnread()
}

onMounted(() => {
  refreshUnread()
  timer = window.setInterval(refreshUnread, 30000)
  document.addEventListener('visibilitychange', handleVisible)
})

// ⚠️ 组件卸载时必须清掉定时器和监听：
//    用户退出登录后 UserLayout 会被销毁，不清的话定时器还在跑，
//    每 30 秒发一次请求（还会带着已失效的令牌），既浪费又会在控制台刷 401 错误。
onUnmounted(() => {
  if (timer !== undefined) window.clearInterval(timer)
  document.removeEventListener('visibilitychange', handleVisible)
})
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
          <!-- el-badge 的 value 为 0 时默认还是显示一个小点，
               所以要配 :hidden 显式藏掉（这是 el-badge 的一个小陷阱） -->
          <el-badge
            :value="unreadTotal"
            :max="99"
            :hidden="unreadTotal === 0"
            class="badge"
          />
        </el-menu-item>
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
           include 是按"组件名"匹配的，所以那几个页面里写了
           defineOptions({ name: 'ItemList' }) / { name: 'MyPosts' } / { name: 'Messages' }。 -->
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

/* 小红点贴着"消息"两个字的右上角。
   不这么调的话 el-badge 会把菜单项的宽度撑开，菜单会跳。 */
.badge {
  margin-left: 6px;
  margin-top: -2px;
}

.username {
  font-size: 14px;
  color: #606266;
}
</style>
