<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listAdmins } from '@/api/user'
import type { AdminContact } from '@/types/api'
import AvatarBadge from '../components/AvatarBadge.vue'

const router = useRouter()
const admins = ref<AdminContact[]>([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    admins.value = await listAdmins()
  } catch {
    admins.value = []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="m-page">
    <div class="topbar">
      <button class="icon" type="button" @click="router.back()">‹</button>
      <div class="title">联系管理员</div>
      <div class="icon"></div>
    </div>
    <div class="body pad">
      <div v-if="loading" class="empty">加载中…</div>
      <div v-else-if="admins.length === 0" class="empty">暂无管理员</div>
      <div v-for="admin in admins" :key="admin.id" class="card">
        <div class="row">
          <AvatarBadge :name="admin.name" :url="admin.avatarUrl" :user-id="admin.id" :size="48" />
          <div style="flex: 1">
            <b>{{ admin.name }}</b>
            <span class="tag admin">管理员</span>
            <div class="muted">{{ admin.email || '未公开工作邮箱' }}</div>
          </div>
        </div>
        <div class="row" style="margin-top: 12px">
          <a v-if="admin.email" class="btn ghost" :href="`mailto:${admin.email}`">发邮件</a>
          <button
            v-if="admin.canMessage"
            type="button"
            class="btn"
            @click="router.push(`/m/messages/${admin.id}`)"
          >
            私信
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
