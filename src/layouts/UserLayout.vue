<script setup lang="ts">
// =====================================================================
// 用户端"外壳"（页头 + 菜单 + 一个插座）
//
// 【它在哪里】
//   router/index.ts 里：
//     { path: '/', component: UserLayout, children: [首页, 详情, 消息, ...] }
//                                    ^^^^^^^^^^^ 本文件
//
//   所以访问 /items/1 时，页面上其实是：
//     UserLayout（页头 + 菜单，一直在）
//        └─ ItemDetail.vue（插座里的内容，随地址变化）
//
// 【为什么要有"外壳"这个文件】
//   页头和菜单在 9 个页面里长得一模一样。
//   如果每个页面各写一遍：改一次菜单要改 9 个文件，而且必然漏掉一个。
//   抽成外壳 = 写一次，所有子页面共用。
//   C++ 类比：把重复代码抽成一个函数，参数不同而已。
//
// 【这个文件里有 4 个语法点，都是前端高频写法】
//   ① onMounted / onUnmounted —— 生命周期钩子（组件"出生/销毁"时执行）
//   ② <RouterView v-slot="{ Component }"> + <component :is> —— 动态组件
//   ③ <keep-alive> —— 让页面"别被销毁"（保住搜索条件和滚动位置）
//   ④ 模板里用 $route（不用先声明）—— Vue 内置的快捷方式
// =====================================================================

import { onMounted, onUnmounted } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { logoutApi } from '@/api/auth'
import { unreadTotal, refreshUnread } from '@/utils/unread'
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

// useRouter()：拿到"导航器"，用来跳页（router.push）
//
// ⚠️ 别和 useRoute() 搞混：
//     useRouter() -> 路由器本身（用来"跳"）      router.push('/x')
//     useRoute()  -> 当前这条路由的信息（用来"读"）route.params.id
//   一个动作、一个数据，名字只差一个字母，很多人在这上面栽过。
const router = useRouter()

// useUserStore()：拿到全局登录态（见 stores/user.ts）
const userStore = useUserStore()

// 箭头函数：`const f = () => { ... }` 等价于 `function f() { ... }`
// 项目里统一用箭头函数写"小的、一次性的函数"。
const goPublish = () => {
  router.push(ROUTE_PUBLISH)
}

/** 点自己的头像 / 用户名 -> 自己的用户主页（U6） */
const goMyProfile = () => {
  // 早退（guard clause）：没拿到 id 就直接返回，别往下走。
  // 这样下面就不用担心 userId 是 0 的情况了。
  if (!userStore.userId) return
  router.push(userProfilePath(userStore.userId))
}

const logout = async () => {
  // `.catch(() => undefined)` 的意思是"出错了也不要紧，吞掉这个错误继续走"。
  // 为什么？因为退出登录这件事，不管后端响不响应，本地都必须退干净。
  // 如果这里不 catch，后端一报错就会中断，用户就"退不出去"了。
  await logoutApi().catch(() => undefined)
  userStore.logout()
  unreadTotal.value = 0 // 顺手把小红点清零
  router.push(ROUTE_LOGIN)
}

// =====================================================================
// 未读私信小红点（契约 M1）
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
//
// 【前端名词】
//   轮询（polling） 定时反复去问后端"有变化吗"
//   WebSocket      后端主动推给前端的通道（不用反复问，本项目暂时没做）
// =====================================================================

// `let` 而不是 `const`：因为要反复赋值。
// 类型 `number | undefined` 是因为"定时器句柄"在没启动时就是 undefined。
// ⚠️ 浏览器里 setInterval 返回数字；Node.js 里返回对象 ——
//    用 window.setInterval 明确指定浏览器版本，类型才对得上。
let timer: number | undefined

function handleVisible() {
  // 只在"切回前台"时刷新；切到后台时什么都不做
  if (document.visibilityState === 'visible') refreshUnread()
}

// ---------- 语法点 ①：生命周期钩子 ----------
//
// 组件从"被创建"到"被销毁"有几个固定的时间点，Vue 会在这些点上回调你：
//   onMounted   组件已经出现在页面上（DOM 就绪）—— 适合"拉初始数据"
//   onUnmounted 组件即将被销毁 —— 适合"清理资源"
//
// ⚠️ 为什么初始数据要放 onMounted，不能直接写在 setup 顶层？
//    因为 setup 执行时 DOM 还没出来，有些操作（比如操作 DOM、量尺寸）会失败。
//    纯发请求其实写哪都行，但放 onMounted 是团队约定，好读。
onMounted(() => {
  refreshUnread()
  timer = window.setInterval(refreshUnread, 30000)
  document.addEventListener('visibilitychange', handleVisible)
})

// ⚠️ 组件卸载时必须清掉定时器和监听，否则【内存泄漏】：
//    用户退出登录后 UserLayout 会被销毁，但那个定时器还在跑，
//    每 30 秒发一次请求（还带着已失效的令牌），既浪费又会在控制台刷 401 错误。
//    C++ 类比：对象析构时要释放它持有的资源（RAII 的"析构"那一半）。
//
//    规则：onMounted 里 add 了什么，onUnmounted 里就 remove 什么。
onUnmounted(() => {
  if (timer !== undefined) window.clearInterval(timer)
  document.removeEventListener('visibilitychange', handleVisible)
})
</script>

<template>
  <!--
    el-container / el-header / el-main 是 Element Plus 的布局组件：
      el-container 外层容器
        el-header  顶部条（固定高度）
        el-main    主体区（自动占满剩余高度）

    class="layout" 只是给 CSS 用的钩子，没别的含义。
  -->
  <el-container class="layout">
    <el-header class="header">
      <span class="logo">校园失物招领</span>

      <!--
        el-menu：菜单组件。这里 4 个属性各有用途：

          mode="horizontal"        横向排列（不写就是纵向侧边栏）
          router                   关键！它让菜单项点击时【自动跳页】，
                                   跳的地址就是下面 :index 的值。
                                   不加的话点了没反应，得自己写 @click。
          :default-active="$route.path"
                                   高亮哪一项。$route 是 Vue 内置的"当前路由"，
                                   【模板里可以直接用，不用先声明】。
                                   注意前面有冒号 = 它是表达式，不是字符串。
          :ellipsis="false"        不让菜单自动折叠成"..."（默认会折叠，丑）

        ⚠️ :index 必须是完整路径（'/my-posts'），不能写名字（'my-posts'），
           因为 router 模式是拿它直接当 URL 用的。
      -->
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
          <!--
            el-badge 是"角标"（小红点/数字）。

            ⚠️ 一个坑：value 为 0 时它默认还是显示一个小点，
               所以要额外用 :hidden 显式藏掉。
               （这是 el-badge 的设计，很多人第一次都会被它坑到。）

            :max="99" 意思是"超过 99 就显示 99+"。
          -->
          <el-badge
            :value="unreadTotal"
            :max="99"
            :hidden="unreadTotal === 0"
            class="badge"
          />
        </el-menu-item>
        <el-menu-item :index="ROUTE_ADMINS">联系管理员</el-menu-item>
        <el-menu-item :index="ROUTE_SETTINGS">用户中心</el-menu-item>
      </el-menu>

      <!--
        v-if / v-else：条件渲染（条件不成立就【销毁】这个元素）。
        这里表示"登录了显示用户名和退出，没登录显示登录按钮"。

        el-avatar 里的 {{ userStore.username.slice(0, 1) }}
        是在取用户名的第一个字当头像文字（没有头像图片时的兜底）。

        slice(0, 1)：取下标 0 开始、长度 1 的一段，也就是第一个字符。
        C++ 类比：substr(0, 1)，但 JS 的字符串是不可变的，永远返回新串。
      -->
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
      <!--
        ============ 语法点 ②③：动态组件 + keep-alive ============

        如果只写 <RouterView />，那插座里的内容每次切换都会被"销毁再重建"。
        后果：从详情页返回列表页，搜索条件清空了、页码回到第 1 页、
              滚动位置也丢了 —— 体验很差。

        所以这里用「作用域插槽」的写法，把插进来的组件拿到手：

          v-slot="{ Component }"
            意思是"把 RouterView 内部准备好的变量解构出来"，
            Component 就是要渲染的那个页面组件（一个变量，不是标签）。
            这是"作用域插槽"语法，和 props 的区别是：
              props 往下传【数据】，插槽往下传【模板片段/变量】。

          <component :is="Component" />
            :is 是【动态组件】—— 渲染哪个组件由变量决定。
            所以这里没有写死任何页面名。

          <keep-alive :include="[...]">
            把匹配的组件"留在内存里不销毁"。
            include 是按【组件名】匹配的，所以那几个页面里写了
              defineOptions({ name: 'ItemList' })
            名字必须和这里写的字符串一模一样，否则缓存不生效（而且不报错！）。

        ⚠️ include 只列了 3 个页面，是故意的：
           首页/我的发布/消息列表 —— 这三个"列表页"值得保住状态。
           详情页、聊天页不缓存，因为它们每次都该拿最新数据。
        -->
      <RouterView v-slot="{ Component }">
        <keep-alive :include="['ItemList', 'MyPosts', 'Messages']">
          <component :is="Component" />
        </keep-alive>
      </RouterView>
    </el-main>
  </el-container>
</template>

<style scoped>
/* =====================================================================
   样式部分：CSS 基础只有几条要记
     display: flex        一种"排列子元素"的方式（比传统 float 好用）
     align-items: center  竖着居中
     gap: 16px            子元素之间留 16px 空隙
     border-bottom        下边框（画那条分隔线）
     var(--el-border-color)  用变量取颜色，换主题时自动跟着变
   ===================================================================== */

.layout {
  /* min-height: 100vh —— 至少占满一屏高度（vh = viewport height，1vh = 屏幕高的 1%）
     不写的话，内容少时页脚会跑到屏幕中间。 */
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
  /* nowrap：不换行（不然窗口变窄时"校园失物招领"会被折成两行） */
  white-space: nowrap;
}

.menu {
  /* flex: 1 —— 占据剩余所有宽度，把后面的用户名/按钮挤到最右边。
     这是 flex 布局里最常用的一招。 */
  flex: 1;
  border-bottom: none;
}

/* 小红点贴着"消息"两个字的右上角。
   不这么调的话 el-badge 会把菜单项的宽度撑开，菜单会跳。 */
.badge {
  margin-left: 6px;
  margin-top: -2px;
}

.username-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* cursor: pointer —— 鼠标移上去变成"小手"，暗示这里可以点。
   不加的话用户不知道头像能点。 */
.user-avatar {
  cursor: pointer;
}

.username {
  font-size: 14px;
  color: #606266;
}
</style>
