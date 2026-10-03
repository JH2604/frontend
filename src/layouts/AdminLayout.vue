<script setup lang="ts">
// =====================================================================
// 管理端"外壳"（左侧菜单 + 页头）
// =====================================================================
//
// 【它在哪里】
// router/index.ts 里 path: '/admin'，meta: { requireAuth: true, roles: ['admin'] }
// 所以只有 role === 'admin' 的人能进（守卫拦的）。
// 它下面的子页面是 views/admin/ItemManage.vue。
//
// 【它和 UserLayout 的关系】
// 两个平级的"外壳"，长得不一样：
// UserLayout   顶部横向菜单（用户端）
// AdminLayout  左侧竖向菜单（管理端）
//
// 为什么分成两个而不是一个加参数？
// 因为两者的菜单项、布局、权限要求都不同，硬合并会出现
// "到处判断现在是不是管理端"的代码，反而更难懂。
// C++ 类比：一个函数里塞满 if (isAdmin) 分支，不如拆成两个函数。
//
// 【为什么菜单只有一项】
// 组长 10/02 的四条决定里去掉了"先审核后发布"和"分类"，
// 所以管理端只剩「帖子管理」一个入口了
// （原来有 发布审核 / 认领审核 / 物品管理 三个页面）。
//
// 【本文件的语法点】
// el-container / el-aside / el-header / el-main
// Element Plus 的布局组件：外层容器 / 侧边栏 / 顶栏 / 主体区
// el-menu router :default-active="$route.path"
// 菜单组件。router 属性让它点击时自动跳页（跳 :index 的地址）；
// $route.path 是 Vue 内置的"当前路径"，用来决定高亮哪一项
// （模板里可以直接用 $route，不用先声明）
// v-for + :key
// 按 menus 数组循环生成菜单项，:key 必须唯一
// defineProps 那种不在本文件 —— 这里是外壳，不需要外部传参
//
// 【前端名词】
// 外壳 / 布局（layout） 包住所有页面的框架（页头、菜单、侧边栏）
// RouterView            路由"插座"，子页面渲染在这里
// =====================================================================

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
