import { createRouter, createWebHistory } from 'vue-router'
import UserLayout from '@/layouts/UserLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { ROUTE_ADMIN_ITEMS, ROUTE_LOGIN, STORAGE_KEYS } from '@/utils/contract'

const router = createRouter({
  // 注意：保留 import.meta.env.BASE_URL，这是部署时的路径前缀
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: ROUTE_LOGIN,
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },

    // ===== 用户端 =====
    // meta 写在【父路由】上：vue-router 会把沿途所有匹配记录的 meta 合并，
    // 所以下面每一个子页面都自动带上了 requireAuth: true。
    // 这就是组长要的"没登录的访客打不开首页"：
    // 哪怕直接在地址栏敲 http://localhost:5173/ ，守卫也会先把他送到登录页。
    {
      path: '/',
      component: UserLayout,
      meta: { requireAuth: true },
      children: [
        { path: '', name: 'home', component: () => import('@/views/user/ItemList.vue') },
        {
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
      ],
    },

    // ===== 管理端 =====
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requireAuth: true, roles: ['admin'] },
      children: [
        { path: '', redirect: ROUTE_ADMIN_ITEMS },
        {
          path: 'items',
          name: 'admin-items',
          component: () => import('@/views/admin/ItemManage.vue'),
        },
      ],
    },
  ],
})

// 路由守卫：每次跳页之前先跑一遍，决定"放行 / 改道"
router.beforeEach((to) => {
  // key 名和 stores/user.ts、utils/request.ts 保持同一份来源，
  // 三处只要有一处对不上，就会出现"登录了但进不去"的怪现象
  const token = localStorage.getItem(STORAGE_KEYS.token)
  const role = localStorage.getItem(STORAGE_KEYS.role)

  // 需要登录但没登录 -> 去登录页，并记住原本想去哪
  // （登录成功后 LoginView 会把 redirect 读出来，送他回原来的页面）
  if (to.meta.requireAuth && !token) {
    return { path: ROUTE_LOGIN, query: { redirect: to.fullPath } }
  }

  // 需要特定角色但角色不对 -> 踢回首页
  const roles = to.meta.roles as string[] | undefined
  if (roles && !roles.includes(role ?? '')) {
    return { path: '/' }
  }

  return true
})

export default router
