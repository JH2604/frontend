import { createRouter, createWebHistory } from 'vue-router'
import UserLayout from '@/layouts/UserLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'

const router = createRouter({
  // 注意：保留 import.meta.env.BASE_URL，这是部署时的路径前缀
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },

    // ===== 用户端 =====
    {
      path: '/',
      component: UserLayout,
      children: [
        { path: '', name: 'home', component: () => import('@/views/user/ItemList.vue') },
        { path: 'items/:id', name: 'item-detail', component: () => import('@/views/user/ItemDetail.vue') },
        {
          path: 'publish',
          name: 'publish',
          component: () => import('@/views/user/Publish.vue'),
          meta: { requireAuth: true },
        },
      ],
    },

    // ===== 管理端 =====
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requireAuth: true, roles: ['admin'] },
      children: [
        { path: '', redirect: '/admin/audit' },
        { path: 'audit', name: 'admin-audit', component: () => import('@/views/admin/AuditList.vue') },
        { path: 'items', name: 'admin-items', component: () => import('@/views/admin/ItemManage.vue') },
      ],
    },
  ],
})

// 路由守卫：进页面前先查有没有登录、角色对不对
router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  // 需要登录但没登录 -> 去登录页，并记住原本想去哪
  if (to.meta.requireAuth && !token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // 需要特定角色但角色不对 -> 踢回首页
  const roles = to.meta.roles as string[] | undefined
  if (roles && !roles.includes(role ?? '')) {
    return { path: '/' }
  }

  return true
})

export default router
