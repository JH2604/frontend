<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { UserProfile } from '@/types/api'
import { getUserProfile } from '@/api/user'
import { Role, messageChatPath } from '@/utils/contract'
import { formatDateTime, fromNow } from '@/utils/format'

// =====================================================================
// 发帖人信息弹窗（契约 U6，任务卡 T11）
//
// 【它在哪里】
//   被 4 处复用（点帖子/消息/管理端里的头像或姓名时弹出）：
//     views/user/ItemDetail.vue      详情页的"发布人"那一格
//     components/PostTable.vue       列表里的"发布人"列
//     views/user/Messages.vue        消息列表的头像
//     views/admin/ItemManage.vue     管理端列表的"发布人"列
//         ↓ 本组件内部调用
//     api/user.ts 的 getUserProfile()（U6）
//
// 【这个组件最核心的一件事（契约原文）】
//   "同一个接口按查看者角色返回不同字段，【由后端控制，不靠前端隐藏】"
//
//   所以下面"详细信息"那一块用的是 v-if="detail"，
//   而不是 v-if="userStore.isAdmin"。
//
//   ⚠️ 为什么不能写 isAdmin？因为那样就变成"前端替后端做权限判断"了：
//      后端规则一变（比如以后管理员也不能看），前端仍会渲染出一堆
//      后端根本没返回的字段（全是空值），甚至暴露出"这里本来有个学号字段"。
//      正确做法：后端给什么就渲染什么，不给就不渲染。
//
// 【父子通信】
//   props：userId（看谁）、postId（可选，从帖子详情打开时带上，私信要带 post_id）
//   v-model：控制弹窗显示与否（defineModel）
// =====================================================================

const props = defineProps<{
  /** 要查看的用户 id。为 null 时不请求（弹窗还没确定看谁） */
  userId: number | null
  /** 从帖子详情打开时带上，点"私信"时作为 post_id 传给后端 */
  postId?: number
}>()

/** defineModel：父组件写 v-model="open"，这里就能双向同步 */
const open = defineModel<boolean>({ default: false })

const router = useRouter()

const loading = ref(false)
const profile = ref<UserProfile | null>(null)

/** 后端给了 detail 才说明"这次可以看到敏感信息"（管理员视角） */
const detail = computed(() => profile.value?.detail ?? null)

/** 是不是在看自己 */
const isSelf = computed(() => profile.value?.id === props.userId && !!props.userId)

async function fetchProfile() {
  if (!props.userId) {
    profile.value = null
    return
  }
  loading.value = true
  // ⚠️ 先清空上一个人的数据再请求。
  //    否则连续打开两个人的弹窗时，会先闪一下上一个人的信息。
  profile.value = null
  try {
    profile.value = await getUserProfile(props.userId)
  } catch {
    // 提示已由拦截器统一弹过；这里保证弹窗不炸
    profile.value = null
  } finally {
    loading.value = false
  }
}

// 弹窗打开时才去请求（而不是一进页面就把所有人的资料都拉一遍）。
// immediate: false 是默认值 —— 组件刚创建时 open 是 false，不该发请求。
watch(
  () => [open.value, props.userId] as const,
  ([isOpen, id]) => {
    if (isOpen && id) fetchProfile()
  },
)

/** 私信 TA：跳到聊天页，把帖子上下文一并带上 */
function handleMessage() {
  if (!profile.value || !profile.value.canMessage) return
  router.push({
    path: messageChatPath(profile.value.id),
    // 只有从帖子详情打开时才带 postId（PostTable/管理端打开时没有）
    query: props.postId ? { postId: String(props.postId) } : {},
  })
  open.value = false
}
</script>

<template>
  <el-dialog v-model="open" title="用户信息" width="480px">
    <div v-loading="loading" class="body">
      <template v-if="profile">
        <!-- ===== 公开区：所有人（含普通用户）都能看到 ===== -->
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

        <!--
          ===== 管理员才看得到的详情 =====
          ⚠️ 判断依据是"后端给没给 detail"，不是"我是不是管理员"。
        -->
        <template v-if="detail">
          <el-divider />
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="学号">{{ detail.studentId || '—' }}</el-descriptions-item>
            <!-- 管理员视角下按契约给的是【完整值】，这里不打码 -->
            <el-descriptions-item label="手机号">{{ detail.phone || '未绑定' }}</el-descriptions-item>
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

        <!-- 普通用户视角：说清"看不到详情"的原因，而不是留一块空白让人以为坏了 -->
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
      <!-- 私信入口：能不能私信由后端给的 canMessage 决定（含"不能私信自己"） -->
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
