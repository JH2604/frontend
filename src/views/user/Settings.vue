<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import type { Theme, UserMe } from '@/types/api'
import { uploadFile } from '@/api/file'
import { bindContact, changeMyPassword, getMyProfile, sendVerificationCode, updateMe } from '@/api/user'
import { useUserStore } from '@/stores/user'
import {
  AVATAR_MAX_MB,
  ContactChannel,
  EMAIL_REGEX,
  PASSWORD_REGEX,
  PASSWORD_RULE_TEXT,
  ROUTE_LOGIN,
  ROUTE_SETTINGS,
  VERIFICATION_CODE_LENGTH,
  maskEmail,
  maskPhone,
} from '@/utils/contract'
import { formatDateTime, fromNow } from '@/utils/format'
import { setThemeLocal, themePreference } from '@/utils/theme'

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

const theme = ref<Theme>(themePreference.value)

const avatarInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)

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
}

const emailForm = reactive({ target: '', code: '' })
const codeSending = ref(false)
const binding = ref(false)
const countdown = ref(0)
const sentTarget = ref('')
let countdownTimer: ReturnType<typeof setInterval> | undefined

function clearCountdown() {
  if (!countdownTimer) return
  clearInterval(countdownTimer)
  countdownTimer = undefined
}

function startCountdown(seconds: number) {
  clearCountdown()
  countdown.value = seconds
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearCountdown()
  }, 1000)
}

async function handleSendEmailCode() {
  const target = emailForm.target.trim()
  if (!EMAIL_REGEX.test(target)) {
    ElMessage.warning('请输入正确的邮箱')
    return
  }

  codeSending.value = true
  try {
    await sendVerificationCode({ channel: ContactChannel.EMAIL, target })
    sentTarget.value = target
    startCountdown(60)
    ElMessage.success('验证码已发送，10 分钟内有效')
  } catch {
    // 提示已由拦截器弹出
  } finally {
    codeSending.value = false
  }
}

async function handleBindEmail() {
  const target = emailForm.target.trim()
  const code = emailForm.code.trim()
  if (!EMAIL_REGEX.test(target)) {
    ElMessage.warning('请输入正确的邮箱')
    return
  }
  if (!new RegExp(`^\\d{${VERIFICATION_CODE_LENGTH}}$`).test(code)) {
    ElMessage.warning(`请输入 ${VERIFICATION_CODE_LENGTH} 位验证码`)
    return
  }
  if (sentTarget.value && target !== sentTarget.value) {
    ElMessage.warning('邮箱已修改，请重新获取验证码')
    return
  }

  binding.value = true
  try {
    await bindContact({ channel: ContactChannel.EMAIL, target, code })
    ElMessage.success('邮箱已绑定')
    emailForm.code = ''
    sentTarget.value = ''
    await fetchMe()
  } catch {
    // 提示已由拦截器弹出
  } finally {
    binding.value = false
  }
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

async function onAvatar(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    ElMessage.warning('只支持 JPEG / PNG / WebP')
    return
  }
  if (file.size > AVATAR_MAX_MB * 1024 * 1024) {
    ElMessage.warning(`头像不能超过 ${AVATAR_MAX_MB}MB`)
    return
  }
  avatarUploading.value = true
  try {
    const uploaded = await uploadFile(file, 'avatar')
    me.value = await updateMe({ avatarUrl: uploaded.url })
    ElMessage.success('头像已更新')
  } catch {
    // 提示已由拦截器弹出
  } finally {
    avatarUploading.value = false
  }
}

onMounted(fetchMe)
onUnmounted(clearCountdown)
</script>

<template>
  <div v-loading="loading" class="page">
    <el-page-header content="用户中心" @back="router.back()" />

    <el-card v-if="me">
      <div class="profile">
        <div class="avatar-block">
          <button type="button" class="avatar-btn" :disabled="avatarUploading" @click="avatarInput?.click()">
            <el-avatar :size="96" :src="me.avatarUrl">
              {{ me.name.slice(0, 1) }}
            </el-avatar>
          </button>
          <div class="hint block-hint">点击更换头像</div>
          <input
            ref="avatarInput"
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            @change="onAvatar"
          />
        </div>

        <el-descriptions :column="1" border class="info">
          <el-descriptions-item label="姓名">
            {{ me.name }}
            <span class="hint">不可修改</span>
          </el-descriptions-item>
          <el-descriptions-item label="学号">
            {{ me.studentId }}
            <span class="hint">不可修改</span>
          </el-descriptions-item>
          <el-descriptions-item label="手机号">
            <span v-if="me.phone" :title="me.phone">{{ maskPhone(me.phone) }}</span>
            <span v-else class="hint">未绑定</span>
            <span class="hint">短信验证码当前版本暂不支持（审批太麻烦啦）</span>
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
        </el-form-item>

        <el-form-item label="私信提醒">
          <el-switch :model-value="me.allowRemind" disabled />
          <span class="hint">
            当前是 {{ me.allowRemind ? '开启' : '关闭' }}
          </span>
        </el-form-item>
      </el-form>

      <el-divider />

      <div class="section-title">绑定邮箱</div>
      <el-form label-width="120px" class="pwd-form" @submit.prevent>
        <el-form-item label="邮箱">
          <div class="bind-row">
            <el-input v-model="emailForm.target" placeholder="新的邮箱地址" clearable />
            <el-button
              :disabled="countdown > 0"
              :loading="codeSending"
              @click="handleSendEmailCode"
            >
              {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="验证码">
          <el-input
            v-model="emailForm.code"
            :maxlength="VERIFICATION_CODE_LENGTH"
            placeholder="6 位验证码"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="binding" @click="handleBindEmail">
            {{ me.email ? '修改邮箱' : '绑定邮箱' }}
          </el-button>
          <span class="hint">验证码 10 分钟内有效，60 秒后可以重发</span>
        </el-form-item>
      </el-form>

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
          <span class="hint">修改密码后所有设备均下线，需重新登录</span>
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

.avatar-btn {
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
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

.bind-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.route-note {
  text-align: center;
  font-size: 12px;
  color: var(--color-sub);
}
</style>
