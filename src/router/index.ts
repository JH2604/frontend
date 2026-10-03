import { createRouter, createWebHistory } from 'vue-router'
import UserLayout from '@/layouts/UserLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { ROUTE_ADMIN_ITEMS, ROUTE_LOGIN, STORAGE_KEYS } from '@/utils/contract'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: ROUTE_LOGIN, // '/login'
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },

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

    {
      path: '/admin',
      component: AdminLayout,
      meta: { requireAuth: true, roles: ['admin'] },
      children: [
        {
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

router.beforeEach((to) => {
  const token = localStorage.getItem(STORAGE_KEYS.token)
  const role = localStorage.getItem(STORAGE_KEYS.role)

  if (to.meta.requireAuth && !token) {
    return { path: ROUTE_LOGIN, query: { redirect: to.fullPath } }
  }

  const roles = to.meta.roles as string[] | undefined
  if (roles && !roles.includes(role ?? '')) {
    return { path: '/' }
  }

  // 情况 3：都没问题，放行
  return true
})

export default router
