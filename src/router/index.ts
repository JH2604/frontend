import { createRouter, createWebHistory } from 'vue-router'
import UserLayout from '@/layouts/UserLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { isMobileViewport, MOBILE_MEDIA, toDesktopLocation, toMobileLocation } from '@/mobile/device'
import { ROUTE_ADMIN_ITEMS, ROUTE_LOGIN, STORAGE_KEYS } from '@/utils/contract'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: ROUTE_LOGIN,
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },

    {
      path: '/',
      component: UserLayout,
      meta: { requireAuth: true },
      children: [
        {
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

        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/user/Settings.vue'),
        },

        {
          path: 'admins',
          name: 'admins',
          component: () => import('@/views/user/Admins.vue'),
        },
      ],
    },

    {
      path: '/m/login',
      name: 'm-login',
      component: () => import('@/mobile/views/LoginView.vue'),
    },
    {
      path: '/m',
      component: () => import('@/mobile/MobileShell.vue'),
      meta: { requireAuth: true },
      children: [
        {
          path: '',
          name: 'm-home',
          component: () => import('@/mobile/views/HomeView.vue'),
        },
        {
          path: 'items/:id',
          name: 'm-detail',
          component: () => import('@/mobile/views/DetailView.vue'),
        },
        {
          path: 'publish',
          name: 'm-publish',
          component: () => import('@/mobile/views/PublishView.vue'),
        },
        {
          path: 'my-posts',
          name: 'm-my-posts',
          component: () => import('@/mobile/views/MyPostsView.vue'),
        },
        {
          path: 'messages',
          name: 'm-messages',
          component: () => import('@/mobile/views/MessagesView.vue'),
        },
        {
          path: 'messages/:peerId',
          name: 'm-chat',
          component: () => import('@/mobile/views/ChatView.vue'),
        },
        {
          path: 'settings',
          name: 'm-settings',
          component: () => import('@/mobile/views/SettingsView.vue'),
        },
        {
          path: 'admins',
          name: 'm-admins',
          component: () => import('@/mobile/views/AdminsView.vue'),
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
  const phone = isMobileViewport()
  if (phone && to.path !== '/m' && !to.path.startsWith('/m/')) {
    return toMobileLocation(to.fullPath)
  }
  if (!phone && (to.path === '/m' || to.path.startsWith('/m/'))) {
    return toDesktopLocation(to.fullPath)
  }

  const token = localStorage.getItem(STORAGE_KEYS.token)
  const role = localStorage.getItem(STORAGE_KEYS.role)
  const onLogin = to.path === ROUTE_LOGIN || to.path === '/m/login'

  if (onLogin && token) {
    if (phone) return '/m'
    return role === 'admin' ? ROUTE_ADMIN_ITEMS : '/'
  }

  if (to.meta.requireAuth && !token) {
    return { path: phone ? '/m/login' : ROUTE_LOGIN, query: { redirect: to.fullPath } }
  }

  const roles = to.meta.roles as string[] | undefined
  if (roles && !roles.includes(role ?? '')) {
    return phone ? '/m' : '/'
  }

  return true
})

if (typeof window !== 'undefined' && window.matchMedia) {
  const media = window.matchMedia(MOBILE_MEDIA)
  const syncViewport = () => {
    const current = router.currentRoute.value.fullPath
    const next = media.matches ? toMobileLocation(current) : toDesktopLocation(current)
    if (next !== current) void router.replace(next)
  }
  if (media.addEventListener) media.addEventListener('change', syncViewport)
  else media.addListener(syncViewport)
}

export default router
