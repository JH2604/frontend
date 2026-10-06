<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import type { Theme, UserMe } from '@/types/api'
import { changeMyPassword, getMyProfile } from '@/api/user'
import { useUserStore } from '@/stores/user'
import {
  PASSWORD_REGEX,
  PASSWORD_RULE_TEXT,
  ROUTE_LOGIN,
  ROUTE_SETTINGS,
  maskEmail,
  maskPhone,
} from '@/utils/contract'
import { formatDateTime, fromNow } from '@/utils/format'
import { setThemeLocal, syncThemeFromServer } from '@/utils/theme'

defineOptions({ name: 'Settings' })

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const me = ref<UserMe | null>(null)

const themeOptions: { label: string; value: Theme }[] = [
  { label: '明亮', value: 'light' },
  { label: '暗黑', value: 'dark' },
  { label: '跟随系统', value: 'system' },
]

const theme = ref<Theme>('system')

const pwdFormRef = ref<FormInstance>()
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdLoading = ref(false)

const pwdRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    {
      pattern: PASSWORD_REGEX,
      message: PASSWORD_RULE_TEXT,
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (value !== pwdForm.newPassword) callback(new Error('两次输入的新密码不一致'))
        else callback()
      },
      trigger: 'blur',
    },
  ],
}

async function fetchMe() {
  loading.value = true
  try {
    const res = await getMyProfile()
    me.value = res
    theme.value = res.theme
    syncThemeFromServer(res.theme)
  } catch {
    me.value = null
  } finally {
    loading.value = false
  }
}

function handleThemeRadioChange(next: string | number | boolean | undefined) {
  if (next !== 'light' && next !== 'dark' && next !== 'system') return
  setThemeLocal(next)
  theme.value = next
  ElMessage.success('主题已在本机生效（当前后端未提供保存接口）')
}

async function handleChangePassword() {
  const valid = await pwdFormRef.value?.validate().catch(() => false)
  if (!valid) return

  pwdLoading.value = true
  try {
    await changeMyPassword({
      oldPassword: pwdForm.oldPassword,
      newPassword: pwdForm.newPassword,
    })

    ElMessage.success('密码已修改，请重新登录')
    userStore.logout()
    router.push(ROUTE_LOGIN)
  } catch {
  } finally {
    pwdLoading.value = false
  }
}

onMounted(fetchMe)
</script>

<template>
  <div v-loading="loading" class="page">
    <el-page-header content="用户中心" @back="router.back()" />

    <el-card v-if="me">
      <div class="profile">
        <div class="avatar-block">
          <el-avatar :size="96" :src="me.avatarUrl">
            {{ me.name.slice(0, 1) }}
          </el-avatar>
          <div class="hint block-hint">头像保存接口本期未开放</div>
        </div>

        <el-descriptions :column="1" border class="info">
          <el-descriptions-item label="姓名">
            {{ me.name }}
            <span class="hint">（实名，不可修改）</span>
          </el-descriptions-item>
          <el-descriptions-item label="学号">
            {{ me.studentId }}
            <span class="hint">（不可修改）</span>
          </el-descriptions-item>
          <el-descriptions-item label="手机号">
            <span v-if="me.phone" :title="me.phone">{{ maskPhone(me.phone) }}</span>
            <span v-else class="hint">未绑定</span>
          </el-descriptions-item>
          <el-descriptions-item label="邮箱">
            <span v-if="me.email" :title="me.email">{{ maskEmail(me.email) }}</span>
            <span v-else class="hint">未绑定</span>
          </el-descriptions-item>
          <el-descriptions-item label="发布数">{{ me.postCount }} 条</el-descriptions-item>
          <el-descriptions-item label="注册时间">
            <span :title="formatDateTime(me.createdAt)">{{ fromNow(me.createdAt) }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <el-divider />

      <div class="section-title">外观与提醒</div>
      <el-form label-width="120px">
        <el-form-item label="主题">
          <el-radio-group :model-value="theme" @change="handleThemeRadioChange">
            <el-radio-button v-for="o in themeOptions" :key="o.value" :value="o.value">
              {{ o.label }}
            </el-radio-button>
          </el-radio-group>
          <span class="hint">只保存在本机，换设备不会同步</span>
        </el-form-item>

        <el-form-item label="私信提醒">
          <el-switch :model-value="me.allowRemind" disabled />
          <span class="hint">开关保存接口本期未开放</span>
        </el-form-item>
      </el-form>

      <el-divider />

      <div class="section-title">绑定手机号 / 邮箱</div>
      <el-alert
        type="info"
        :closable="false"
        title="绑定接口本期未开放。当前后端没有验证码和联系方式接口。"
        show-icon
      />

      <el-divider />

      <div class="section-title">修改密码</div>
      <el-form
        ref="pwdFormRef"
        :model="pwdForm"
        :rules="pwdRules"
        label-width="120px"
        class="pwd-form"
      >
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="pwdForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="pwdForm.newPassword"
            type="password"
            show-password
            :placeholder="PASSWORD_RULE_TEXT"
          />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="pwdForm.confirmPassword" type="password" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="danger" :loading="pwdLoading" @click="handleChangePassword">
            修改密码
          </el-button>
          <span class="hint">改完所有设备都会下线，需要重新登录</span>
        </el-form-item>
      </el-form>
    </el-card>

    <el-empty v-else-if="!loading" description="加载失败" />

    <div class="route-note">当前页面路由：{{ ROUTE_SETTINGS }}</div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.avatar-block {
  width: 220px;
  flex-shrink: 0;
}

.info {
  flex: 1;
}

.section-title {
  font-weight: 600;
  margin-bottom: 12px;
}

.hint {
  margin-left: 8px;
  font-size: 12px;
  color: var(--color-sub);
}

.block-hint {
  display: block;
  margin: 8px 0 0;
}

.pwd-form {
  max-width: 620px;
}

.route-note {
  text-align: center;
  font-size: 12px;
  color: var(--color-sub);
}
</style>
