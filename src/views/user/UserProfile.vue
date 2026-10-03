<script setup lang="ts">
// =====================================================================
// 用户主页（契约 U6 查看发帖人信息）
// =====================================================================
//
// 【它在哪里】
// router/index.ts:  { path: 'users/:id', component: UserProfile }
// 进入方式（点各种头像）：
// UserLayout 页头的自己头像   -> /users/{自己的id}
// Messages.vue 消息列表的头像  -> /users/{对方id}
// Conversation.vue 聊天页头像  -> /users/{对方id}
// Admins.vue 管理员头像        -> /users/{管理员id}
//
// 【这个页面最核心的一句话（契约原文）】
// "同一个接口按查看者角色返回不同字段，【由后端控制，不靠前端隐藏】"
//
// 具体表现：
// 普通用户查看别人 -> 后端返回 detail: null，页面上只显示姓名/头像/发帖数
// 管理员查看别人   -> 后端返回 detail（含学号/手机号/邮箱/最近登录），
// 页面多渲染一块"详细信息"
// 查看自己         -> 能看到自己的信息，但 can_message 是 false（不能私信自己）
//
// ⚠️ 所以本文件里那块详细信息用的是 v-if="contact"（contact 由 detail 算出来），
// 绝对【不能】写成 v-if="userStore.isAdmin"。
// 为什么？因为一旦写成"前端判断角色"，后端规则一变（比如管理员也不能看），
// 前端就会渲染出一堆后端根本没返回的字段（全空），
// 甚至暴露出"这里本来有个学号字段"这种信息。
// C++ 类比：不要用编译期的 #ifdef 去模拟运行期的权限检查。
//
// 【本文件的语法点】
// computed(() => Number(route.params.id))  动态参数转数字
// watch(userId, ...)   从一个人的主页跳到另一个人的主页时，
// 组件会被复用，必须 watch 才能重新加载
// （只靠 onMounted 会看到上一个人的资料）
// computed(() => {...})  contact：把 profile.detail 整理成好用的形状
// v-if / v-else          detail 有没有值，决定渲染哪一块
// maskPhone / maskEmail  打码（来自 contract.ts）—— 注意是【展示时】打码，
// 数据本身是完整值（契约 U1 的说明）

import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { UserProfile } from '@/types/api'
import { getUserProfile } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { Role, maskEmail, maskPhone, messageChatPath } from '@/utils/contract'
import { formatDateTime, fromNow } from '@/utils/format'

// =====================================================================
// 用户主页（v1.1 契约 U6 查看发帖人信息）
//
// U6 GET /users/{user_id}
//
// ⚠️ 这个页面的核心是理解契约的一句话：
//    「同一个接口按查看者角色返回不同字段，**由后端控制，不靠前端隐藏**」
//
//    所以我们的做法是：**只渲染后端给了的字段**。
//    普通用户调用时后端把 `detail` 置成 `null`，我们就不渲染那块；
//    管理员调用时 `detail` 有值，就渲染学号/手机/邮箱等。
//
//    绝不能写成 `v-if="userStore.isAdmin"` 来决定显不显示 —— 那等于
//    "前端替后端做权限判断"，一旦后端规则变了（比如管理员也不能看），
//    前端就会显示出一堆后端根本没返回的字段（全空），甚至在界面上
//    暴露出"这里本来有个学号字段"这种信息。
//    C++ 类比：不要用编译期的 #ifdef 去模拟运行期的权限检查。
// =====================================================================

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
  // ⚠️ 用后端给的 canMessage，不用自己判断"是不是自己"。
  //    契约 U6 明确说 can_message 的含义里包含"不能私信自己"。
  if (!profile.value.canMessage) {
    ElMessage.warning('不能给自己发私信')
    return
  }
  router.push(messageChatPath(profile.value.id))
}

// 从一个人的主页跳到另一个人的主页时，路由参数变了但组件会复用，
// 所以必须 watch（只靠 onMounted 会看到上一个人的资料）
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

      <!-- 只有后端返回了 detail 才渲染这块。
           普通用户查看别人时 detail 是 null，这里就什么都不显示。 -->
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
