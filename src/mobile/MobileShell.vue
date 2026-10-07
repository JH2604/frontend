<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { logoutApi } from '@/api/auth'
import { getMyProfile, getUserProfile } from '@/api/user'
import type { UserMe, UserProfile } from '@/types/api'
import { useUserStore } from '@/stores/user'
import { formatDateTime, fromNow } from '@/utils/format'
import { resolvedTheme, setThemeLocal } from '@/utils/theme'
import { unreadTotal, useUnreadPolling } from '@/utils/unread'
import AvatarBadge from './components/AvatarBadge.vue'
import { mobileBridgeKey, type MobileConfirmOptions } from './context'
import './mobile.css'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const profile = ref<UserMe | null>(null)
const drawerOpen = ref(false)
const toastText = ref('')
let toastTimer = 0

const userOpen = ref(false)
const userLoading = ref(false)
const userCard = ref<UserProfile | null>(null)
const userPostId = ref<number | undefined>()

const confirmOpen = ref(false)
const confirmText = ref('')
const confirmReason = ref(false)
const confirmOkText = ref('确定')
const confirmDanger = ref(true)
const reasonText = ref('')
let confirmResolve: ((value: string | null) => void) | null = null

const darkOn = computed(() => resolvedTheme.value === 'dark')

useUnreadPolling()

function toast(text: string) {
  toastText.value = text
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastText.value = ''
  }, 1800)
}

async function reloadProfile() {
  try {
    profile.value = await getMyProfile()
  } catch {
    profile.value = null
  }
}

function closeDrawer() {
  drawerOpen.value = false
}

function openDrawer() {
  drawerOpen.value = true
}

function finishConfirm(value: string | null) {
  confirmOpen.value = false
  const resolve = confirmResolve
  confirmResolve = null
  resolve?.(value)
}

function confirm(text: string, options: MobileConfirmOptions = {}) {
  confirmText.value = text
  confirmReason.value = options.reason === true
  confirmOkText.value = options.okText ?? '确定删除'
  confirmDanger.value = options.danger !== false
  reasonText.value = ''
  confirmOpen.value = true
  return new Promise<string | null>((resolve) => {
    confirmResolve = resolve
  })
}

async function showUser(userId: number, postId?: number) {
  userPostId.value = postId
  userCard.value = null
  userOpen.value = true
  userLoading.value = true
  try {
    userCard.value = await getUserProfile(userId)
  } catch {
    userOpen.value = false
  } finally {
    userLoading.value = false
  }
}

function toggleTheme() {
  setThemeLocal(darkOn.value ? 'light' : 'dark')
}

async function logout() {
  closeDrawer()
  try {
    await logoutApi()
  } catch {
    // 本地登录态仍要清掉
  }
  userStore.logout()
  unreadTotal.value = 0
  router.replace('/m/login')
}

function go(path: string) {
  closeDrawer()
  router.push(path)
}

function messageUser() {
  if (!userCard.value?.canMessage) return
  const id = userCard.value.id
  const postId = userPostId.value
  userOpen.value = false
  router.push(postId ? `/m/messages/${id}?postId=${postId}` : `/m/messages/${id}`)
}

provide(mobileBridgeKey, {
  toast,
  openDrawer,
  closeDrawer,
  showUser,
  confirm,
  profile: () => profile.value,
  reloadProfile,
})

function onTouchStart(event: TouchEvent) {
  if (route.name !== 'm-home') return
  const touch = event.changedTouches[0]
  if (!touch || touch.clientX > 24) return
  const startX = touch.clientX
  const startY = touch.clientY
  const end = (ev: TouchEvent) => {
    const last = ev.changedTouches[0]
    if (last && last.clientX - startX > 60 && Math.abs(last.clientY - startY) < 80) openDrawer()
    window.removeEventListener('touchend', end)
  }
  window.addEventListener('touchend', end)
}

onMounted(reloadProfile)
</script>

<template>
  <div class="m-app" :class="{ dark: darkOn }" @touchstart.passive="onTouchStart">
    <RouterView />

    <template v-if="drawerOpen">
      <div class="mask" @click="closeDrawer"></div>
      <aside class="drawer">
        <div class="head">
          <AvatarBadge
            :name="profile?.name || userStore.username"
            :url="profile?.avatarUrl"
            :user-id="profile?.id || userStore.userId"
            :size="64"
          />
          <h3 style="margin-top: 10px">
            {{ profile?.name || userStore.username }}
            <span v-if="userStore.isAdmin" class="tag admin">管理员</span>
          </h3>
        </div>
        <div class="menu">
          <button type="button" @click="go('/m/my-posts')">
            📝 <span class="grow" style="text-align: left">我发布的帖子</span>
          </button>
          <button type="button" @click="go('/m/messages')">
            💬 <span class="grow" style="text-align: left">我的消息</span>
            <span v-if="unreadTotal > 0" class="tag" style="background: var(--lost)">{{
              unreadTotal
            }}</span>
          </button>
          <button type="button" @click="go('/m/settings')">
            ⚙️ <span class="grow" style="text-align: left">设置</span>
          </button>
        </div>
        <div class="foot">
          <div class="row" style="margin-bottom: 14px">
            <span class="grow">🌙 暗色主题</span>
            <button type="button" class="switch" :class="{ on: darkOn }" @click="toggleTheme"></button>
          </div>
          <button type="button" class="btn ghost" @click="logout">退出登录</button>
        </div>
      </aside>
    </template>

    <template v-if="userOpen">
      <div class="mask modal-mask" @click="userOpen = false"></div>
      <div class="modal">
        <div v-if="userLoading" class="empty">加载中…</div>
        <template v-else-if="userCard">
          <div style="text-align: center">
            <AvatarBadge
              :name="userCard.name"
              :url="userCard.avatarUrl"
              :user-id="userCard.id"
              :size="72"
            />
            <h3 style="margin: 10px 0 4px">{{ userCard.name }}</h3>
            <span class="muted">
              {{ userCard.role === 'admin' ? '管理员' : '学生' }} · 发布了
              {{ userCard.postCount }} 个帖子
            </span>
          </div>
          <div style="margin: 14px 0">
            <template v-if="userCard.detail">
              <p class="muted" style="font-size: 12px; margin-bottom: 4px">管理员可见的全部信息</p>
              <div class="kv"><span>学号</span><span>{{ userCard.detail.studentId || '—' }}</span></div>
              <div class="kv"><span>手机号</span><span>{{ userCard.detail.phone || '未绑定' }}</span></div>
              <div class="kv"><span>邮箱</span><span>{{ userCard.detail.email || '未绑定' }}</span></div>
              <div class="kv">
                <span>私信提醒</span>
                <span>{{ userCard.detail.allowRemind ? '已开启' : '已关闭' }}</span>
              </div>
              <div class="kv">
                <span>注册时间</span>
                <span>{{ formatDateTime(userCard.detail.createdAt, 'date') || '—' }}</span>
              </div>
              <div class="kv">
                <span>最近登录</span>
                <span>{{ userCard.detail.lastLoginAt ? fromNow(userCard.detail.lastLoginAt) : '—' }}</span>
              </div>
            </template>
            <p v-else class="notice" style="text-align: center">为保护隐私，仅支持站内私信联系</p>
          </div>
          <button v-if="userCard.canMessage" type="button" class="btn" @click="messageUser">私信</button>
          <button type="button" class="btn ghost" style="margin-top: 8px" @click="userOpen = false">
            关闭
          </button>
        </template>
      </div>
    </template>

    <template v-if="confirmOpen">
      <div class="mask modal-mask" @click="finishConfirm(null)"></div>
      <div class="modal">
        <h3 style="margin-bottom: 10px">{{ confirmText }}</h3>
        <div v-if="confirmReason" class="field">
          <span>删除原因（选填，将以私信通知发帖人）</span>
          <input v-model="reasonText" placeholder="如：内容与失物招领无关" />
        </div>
        <div class="row" style="margin-top: 12px">
          <button type="button" class="btn ghost" @click="finishConfirm(null)">取消</button>
          <button
            type="button"
            class="btn"
            :class="{ danger: confirmDanger }"
            @click="finishConfirm(reasonText.trim())"
          >
            {{ confirmOkText }}
          </button>
        </div>
      </div>
    </template>

    <div v-if="toastText" class="toast">{{ toastText }}</div>
  </div>
</template>
