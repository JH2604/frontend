<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { UserProfile } from '@/types/api'
import { getUserProfile } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { Role, messageChatPath } from '@/utils/contract'
import { formatDateTime, fromNow } from '@/utils/format'

const props = defineProps<{
  userId: number | null

  postId?: number
}>()

const open = defineModel<boolean>({ default: false })

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const profile = ref<UserProfile | null>(null)

const detail = computed(() => profile.value?.detail ?? null)

const isSelf = computed(() => !!profile.value && profile.value.id === userStore.userId)

async function fetchProfile() {
  if (!props.userId) {
    profile.value = null
    return
  }
  loading.value = true

  profile.value = null
  try {
    profile.value = await getUserProfile(props.userId)
  } catch {
    profile.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => [open.value, props.userId] as const,
  ([isOpen, id]) => {
    if (isOpen && id) fetchProfile()
  },
)

function handleMessage() {
  if (!profile.value || !profile.value.canMessage) return
  router.push({
    path: messageChatPath(profile.value.id),

    query: props.postId ? { postId: String(props.postId) } : {},
  })
  open.value = false
}
</script>

<template>
  <el-dialog v-model="open" title="用户信息" width="480px">
    <div v-loading="loading" class="body">
      <template v-if="profile">
        <div class="head">
          <el-avatar :size="56" :src="profile.avatarUrl">
            {{ profile.name.slice(0, 1) }}
          </el-avatar>
          <div class="who">
            <div class="name-line">
              <span class="name">{{ profile.name }}</span>
              <el-tag v-if="profile.role === Role.ADMIN" type="warning" size="small">管理员</el-tag>
              <el-tag v-else type="info" size="small">学生</el-tag>
              <el-tag v-if="isSelf" size="small" effect="plain">这是你自己</el-tag>
            </div>
            <div class="sub">发布了 {{ profile.postCount }} 条信息</div>
          </div>
        </div>

        <template v-if="detail">
          <el-divider />
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="学号">{{ detail.studentId || '—' }}</el-descriptions-item>

            <el-descriptions-item label="手机号">{{
              detail.phone || '未绑定'
            }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ detail.email || '未绑定' }}</el-descriptions-item>
            <el-descriptions-item label="私信提醒">
              {{ detail.allowRemind ? '已开启' : '已关闭' }}
            </el-descriptions-item>
            <el-descriptions-item label="注册时间">
              <span :title="formatDateTime(detail.createdAt)">
                {{ detail.createdAt ? fromNow(detail.createdAt) : '—' }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="最近登录">
              <span :title="formatDateTime(detail.lastLoginAt)">
                {{ detail.lastLoginAt ? fromNow(detail.lastLoginAt) : '—' }}
              </span>
            </el-descriptions-item>
          </el-descriptions>
        </template>

        <el-alert
          v-else
          class="privacy"
          type="info"
          :closable="false"
          show-icon
          title="为保护隐私，仅支持站内私信联系"
        />
      </template>

      <el-empty v-else-if="!loading" description="找不到这个用户" />
    </div>

    <template #footer>
      <el-button @click="open = false">关闭</el-button>

      <el-button v-if="profile?.canMessage" type="primary" @click="handleMessage">
        私信 TA
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.body {
  min-height: 80px;
}

.head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.who {
  flex: 1;
}

.name-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name {
  font-size: 18px;
  font-weight: 600;
}

.sub {
  margin-top: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.privacy {
  margin-top: 16px;
}
</style>
