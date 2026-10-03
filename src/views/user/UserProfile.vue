<script setup lang="ts">

import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { UserProfile } from '@/types/api'
import { getUserProfile } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { Role, maskEmail, maskPhone, messageChatPath } from '@/utils/contract'
import { formatDateTime, fromNow } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const profile = ref<UserProfile | null>(null)

const userId = computed(() => Number(route.params.id))

/** 是不是在看自己 */
const isSelf = computed(() => profile.value?.id === userStore.userId)

/** 后端给的联系方式（普通用户视角下是 null，管理员视角下才有） */
const contact = computed(() => {
  const d = profile.value?.detail
  if (!d) return null
  return {
    studentId: d.studentId,
    phone: d.phone,
    email: d.email,
    allowRemind: d.allowRemind,
    createdAt: d.createdAt,
    lastLoginAt: d.lastLoginAt,
  }
})

async function fetchProfile() {
  loading.value = true
  try {
    profile.value = await getUserProfile(userId.value)
  } catch {
    // 提示已由拦截器统一弹过；这里保证不白屏
    profile.value = null
  } finally {
    loading.value = false
  }
}

/** 私信 TA（M4：站内私信是 v1.1 里用户之间唯一的联系方式） */
function handleMessage() {
  if (!profile.value) return
  if (!profile.value.canMessage) {
    ElMessage.warning('不能给自己发私信')
    return
  }
  router.push(messageChatPath(profile.value.id))
}

watch(userId, (id) => {
  if (id) fetchProfile()
})

onMounted(fetchProfile)
</script>

<template>
  <div v-loading="loading" class="page">
    <el-page-header content="用户主页" @back="router.back()" />

    <el-card v-if="profile">
      <div class="head">
        <el-avatar :size="64" :src="profile.avatarUrl">
          {{ profile.name.slice(0, 1) }}
        </el-avatar>

        <div class="who">
          <div class="name-line">
            <span class="name">{{ profile.name }}</span>
            <!-- 管理员身份标出来（U7 联系管理员页也会用到这个概念） -->
            <el-tag v-if="profile.role === Role.ADMIN" type="warning" size="small">管理员</el-tag>
            <el-tag v-else size="small" type="info">学生</el-tag>
            <el-tag v-if="isSelf" size="small" effect="plain">这是你自己</el-tag>
          </div>
          <div class="sub">发布了 {{ profile.postCount }} 条信息</div>
        </div>

        <div class="actions">
          <!-- 私信入口的显示条件用后端给的 canMessage（见 script 里的说明） -->
          <el-button v-if="profile.canMessage" type="primary" @click="handleMessage">
            私信 TA
          </el-button>
          <span v-else-if="isSelf" class="tip">这是你自己的主页</span>
        </div>
      </div>

      <el-divider />

      <template v-if="contact">
        <div class="section-title">详细信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="学号">{{ contact.studentId || '—' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">
            <!-- 契约 U1 说"本人可以看到完整值；前端展示时打码" -->
            <span v-if="contact.phone" :title="contact.phone">{{ maskPhone(contact.phone) }}</span>
            <span v-else>未绑定</span>
          </el-descriptions-item>
          <el-descriptions-item label="邮箱">
            <span v-if="contact.email" :title="contact.email">{{ maskEmail(contact.email) }}</span>
            <span v-else>未绑定</span>
          </el-descriptions-item>
          <el-descriptions-item label="接收私信提醒">
            {{ contact.allowRemind ? '已开启' : '已关闭' }}
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">
            <span :title="formatDateTime(contact.createdAt)">
              {{ contact.createdAt ? fromNow(contact.createdAt) : '—' }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="最近登录">
            <span :title="formatDateTime(contact.lastLoginAt)">
              {{ contact.lastLoginAt ? fromNow(contact.lastLoginAt) : '—' }}
            </span>
          </el-descriptions-item>
        </el-descriptions>
      </template>

      <!-- 普通用户视角：明确说清楚"看不到详细信息"，而不是留一块空白让人以为是 bug -->
      <el-alert
        v-else
        type="info"
        :closable="false"
        show-icon
        title="对方的学号、手机号、邮箱等信息仅管理员可见"
      />
    </el-card>

    <el-empty v-else-if="!loading" description="找不到这个用户" />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.head {
  display: flex;
  align-items: center;
  gap: 16px;
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
  font-size: 20px;
  font-weight: 600;
}

.sub {
  margin-top: 4px;
  color: var(--color-sub);
  font-size: 13px;
}

.tip {
  color: var(--color-sub);
  font-size: 13px;
}

.section-title {
  font-weight: 600;
  margin-bottom: 10px;
}
</style>
