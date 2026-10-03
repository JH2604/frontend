// =====================================================================
// 路由表（地址栏路径 → 显示哪个页面）
//
// 【它在哪里】
//   main.ts 里 app.use(router) 装上它
//      └─ App.vue 的 <RouterView /> 是"插座"，本文件决定插什么
//
// 【一句话解释路由】
//   传统网站：点链接 → 浏览器向后端要一个新 HTML 页面 → 整页刷新
//   单页应用：点链接 → JS 换掉插座里的组件 → 【不刷新页面】（所以叫 SPA）
//   代价是"地址栏和页面对应关系"得我们自己维护，就是这个文件。
//
// 【整体结构：两层嵌套】
//   /                    UserLayout（用户端外壳：页头 + 菜单）
//     /                  首页
//     /items/:id         详情
//     /my-posts          我的发布
//     /publish           发布
//     /messages          消息列表
//     /messages/:peerId  和某人的聊天
//     /users/:id         用户主页
//     /settings          用户中心
//     /admins            联系管理员
//   /admin               AdminLayout（管理端外壳：左侧菜单）
//     /admin/items       帖子管理
//
// 【三条最重要的规则，先记住再读代码】
//   1. children 里的 path 不要以 / 开头
//      { path: 'items/:id' }  ✅   拼接后是 /items/:id
//      { path: '/items/:id' } ❌   会被当成"绝对路径"，父级前缀失效
//   2. :id 这种叫"动态参数"，用 route.params.id 取
//      地址 /items/1 和 /items/2 都匹配 items/:id 这一条路由
//   3. component 用 () => import(...) 这种写法叫"懒加载"
//      意思是"进了这个页面才去下载这个页面的代码"，首屏更快
//
// 【前端名词】
//   路由（route）      一条"路径 → 组件"的对应规则
//   路由表（routes）    所有规则的集合
//   守卫（guard）       beforeEach 这种"跳页前的检查站"
//   懒加载（lazy）      () => import(...)，用到才下载
//   重定向（redirect）  访问 A 自动跳到 B
// =====================================================================

import { createRouter, createWebHistory } from 'vue-router'
import UserLayout from '@/layouts/UserLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { ROUTE_ADMIN_ITEMS, ROUTE_LOGIN, STORAGE_KEYS } from '@/utils/contract'

const router = createRouter({
  // createWebHistory：地址栏长这样  /items/1        （推荐，好看）
  // createWebHashHistory：地址栏长这样  /#/items/1   （不用配服务器，但有 #）
  // BASE_URL 是部署时的路径前缀，开发时就是 '/'，不用管它。
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: ROUTE_LOGIN, // '/login'
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },

    // ===== 用户端 =====
    // ⚠️ meta 写在【父路由】上：vue-router 会把沿途所有匹配记录的 meta 合并，
    //    所以下面每一个子页面都【自动继承】了 requireAuth: true。
    //    这就是组长要的"没登录的访客打不开首页"：
    //    哪怕直接在地址栏敲 http://localhost:5173/ ，守卫也会先把他送到登录页。
    //    （如果写在每个子路由上，将来加一个页面忘了写，就漏了一个后门。）
    {
      path: '/',
      component: UserLayout,
      meta: { requireAuth: true },
      children: [
        {
          // path: '' 表示"父路径本身"，也就是访问 '/' 时显示它
          path: '',
          name: 'home',
          component: () => import('@/views/user/ItemList.vue'),
        },
        {
          // :id 是动态参数。地址 /items/1、/items/999 都进这里，
          // 页面里用 route.params.id 取到那个数字（是字符串，注意转换）。
          path: 'items/:id',
          name: 'item-detail',
          component: () => import('@/views/user/ItemDetail.vue'),
        },
        {
          path: 'my-posts',
          name: 'my-posts',
          component: () => import('@/views/user/MyPosts.vue'),
        },
        {
          path: 'publish',
          name: 'publish',
          component: () => import('@/views/user/Publish.vue'),
        },
        // 消息中心（v1.1 契约 M1~M5）
        {
          path: 'messages',
          name: 'messages',
          component: () => import('@/views/user/Messages.vue'),
        },
        {
          path: 'messages/:peerId',
          name: 'conversation',
          component: () => import('@/views/user/Conversation.vue'),
        },
        // 用户主页（U6 查看发帖人信息）。
        // 点帖子/消息/管理员列表里的头像都会进这里。
        {
          path: 'users/:id',
          name: 'user-profile',
          component: () => import('@/views/user/UserProfile.vue'),
        },
        // 用户中心（U1 展示 + U2 改资料 + U3 改密码 + U4/U5 绑联系方式）
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/user/Settings.vue'),
        },
        // 联系管理员（U7）
        {
          path: 'admins',
          name: 'admins',
          component: () => import('@/views/user/Admins.vue'),
        },
      ],
    },

    // ===== 管理端 =====
    // 和用户端是两套外壳（AdminLayout 是左侧菜单那种布局）。
    // meta.roles 让守卫多检查一条：只有 admin 能进。
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requireAuth: true, roles: ['admin'] },
      children: [
        {
          // redirect：访问 /admin 时自动跳到 /admin/items
          // （不然 /admin 自己没有页面，会白屏）
          path: '',
          redirect: ROUTE_ADMIN_ITEMS,
        },
        {
          path: 'items',
          name: 'admin-items',
          component: () => import('@/views/admin/ItemManage.vue'),
        },
      ],
    },
  ],
})

// =====================================================================
// 路由守卫：每次跳页之前先跑一遍，决定"放行 / 改道"
//
// 【它在哪里】
//   用户点任何链接、地址栏输入任何路径、router.push() 任何路径
//   → 都会先经过这里 → 才真正切换页面
//
// 【返回值决定行为】
//   return true            放行，正常跳过去
//   return { path: '/login' }  改道，跳到别处
//   return false           取消这次跳转（留在原地）
//
// 【为什么必须用 localStorage 而不是 Pinia store】
//   守卫在应用启动时就会跑，那时 Pinia 可能还没初始化好。
//   localStorage 是浏览器的"本地硬盘"，随时能读，最稳。
//   ⚠️ 所以 key 名必须和 stores/user.ts、utils/request.ts 完全一致 ——
//      三处只要有一处拼错，就会出现"明明登录了却被踢回登录页"这种玄学 bug。
//      这就是为什么 key 名统一放在 contract.ts 的 STORAGE_KEYS 里。
//
// 【前端名词】
//   守卫（guard）  跳页前的检查站
//   重定向         把用户"送"到另一个页面，同时记下他本来想去哪
// =====================================================================
router.beforeEach((to) => {
  const token = localStorage.getItem(STORAGE_KEYS.token)
  const role = localStorage.getItem(STORAGE_KEYS.role)

  // 情况 1：这个页面需要登录，但没有令牌 -> 去登录页
  //   query: { redirect: to.fullPath } 是记下"他本来想去哪"，
  //   登录成功后 LoginView.vue 会把它读出来，把人送回原来的页面。
  //   不加这个的话，用户点"发布"被弹到登录页，登录完却出现在首页，很烦。
  if (to.meta.requireAuth && !token) {
    return { path: ROUTE_LOGIN, query: { redirect: to.fullPath } }
  }

  // 情况 2：这个页面要求特定角色，但当前角色不对 -> 踢回首页
  //   roles 是 meta.roles（上面管理端写的 ['admin']）
  //   roles.includes(role ?? '')：role 是 null 时用空串，避免 null 参与比较
  const roles = to.meta.roles as string[] | undefined
  if (roles && !roles.includes(role ?? '')) {
    return { path: '/' }
  }

  // 情况 3：都没问题，放行
  return true
})

export default router
