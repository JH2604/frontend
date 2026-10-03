<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { AdminContact } from '@/types/api'
import { listAdmins } from '@/api/user'
import { messageChatPath, userProfilePath } from '@/utils/contract'

// =====================================================================
// 联系管理员（v1.1 契约 U7）
//
// U7 GET /users/admins
//
// ⚠️ 契约原文：
//    「联系管理员页按需求保留"发邮件"（mailto: 链接）和"私信"两个入口，
//      这里的 email 是管理员对外公开的工作邮箱。私信调用 M4。」
//
// 所以每个管理员有**两个**入口，而且各自的显示条件不同：
//   - 「发邮件」：只有 email 有值时才显示。没邮箱还给按钮的话，
//     点开的是一个空的 mailto，等于给了一个坏入口。
//   - 「私信」  ：由后端给的 can_message 决定（和 U6 同一个语义）。
//
// 另外契约 U7 的 email 是**公开的**，所以这里**不打码** ——
// 打码了用户就没法复制去发邮件了。这是和 U1/U6 的区别，值得注意：
//   同一份"邮箱"字段，在不同接口里的可见性和用途不一样，
//   不能因为 U1 打了码就到处都打。
// =====================================================================

defineOptions({ name: 'Admins' })

const router = useRouter()

const loading = ref(false)
const admins = ref<AdminContact[]>([])

async function fetchAdmins() {
  loading.value = true
  try {
    admins.value = await listAdmins()
  } catch {
    // 提示已由拦截器统一弹过，这里保证不白屏
    admins.value = []
  } finally {
    loading.value = false
  }
}

/** 发邮件：用 mailto: 直接调起系统邮件客户端（契约要求的"发邮件"入口） */
function handleMail(admin: AdminContact) {
  if (!admin.email) {
    ElMessage.warning('这位管理员没有公开工作邮箱')
    return
  }
  window.location.href = `mailto:${admin.email}`
}

/** 私信：走 M4（跳聊天页） */
function handleMessage(admin: AdminContact) {
  if (!admin.canMessage) {
    ElMessage.warning('暂时无法给这位管理员发私信')
    return
  }
  router.push(messageChatPath(admin.id))
}

/** 看主页（U6） */
function handleProfile(admin: AdminContact) {
  router.push(userProfilePath(admin.id))
}

onMounted(fetchAdmins)
</script>

<template>
  <el-card v-loading="loading">
    <template #header>联系管理员</template>

    <el-empty v-if="admins.length === 0 && !loading" description="暂无管理员信息" />

    <div v-for="admin in admins" :key="admin.id" class="row">
      <el-avatar :size="48" :src="admin.avatarUrl" class="clickable" @click="handleProfile(admin)">
        {{ admin.name.slice(0, 1) }}
      </el-avatar>

      <div class="body">
        <div class="name">{{ admin.name }}</div>
        <!-- 契约 U7 的 email 是管理员对外公开的工作邮箱，所以【不打码】 -->
        <div class="email">
          <span v-if="admin.email">{{ admin.email }}</span>
          <span v-else class="none">未公开工作邮箱</span>
        </div>
      </div>

      <div class="actions">
        <el-button v-if="admin.email" @click="handleMail(admin)">发邮件</el-button>
        <el-button v-if="admin.canMessage" type="primary" @click="handleMessage(admin)">
          私信
        </el-button>
        <el-button link @click="handleProfile(admin)">主页</el-button>
      </div>
    </div>

    <el-alert
      class="tip"
      type="info"
      :closable="false"
      show-icon
      title="没绑定邮箱的管理员只能站内私信联系"
      description="这也是为什么有的管理员只显示「私信」按钮 —— 前端不会给一个点了没反应的入口。"
    />
  </el-card>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 4px;
}

.row + .row {
  border-top: 1px solid var(--color-line);
}

.clickable {
  cursor: pointer;
}

.body {
  flex: 1;
}

.name {
  font-size: 16px;
  font-weight: 600;
}

.email {
  margin-top: 4px;
  color: var(--color-sub);
  font-size: 13px;
}

.none {
  font-style: italic;
}

.tip {
  margin-top: 16px;
}
</style>
