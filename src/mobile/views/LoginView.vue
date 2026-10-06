<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login, register } from '@/api/auth'
import { useUserStore } from '@/stores/user'
import {
  PASSWORD_REGEX,
  PASSWORD_RULE_TEXT,
  Role,
  STUDENT_ID_RULE_TEXT,
  isValidStudentId,
  type RoleValue,
} from '@/utils/contract'
import { resolvedTheme } from '@/utils/theme'
import '../mobile.css'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const mode = ref<'login' | 'register'>('login')
const studentId = ref('')
const password = ref('')
const confirmPassword = ref('')
const role = ref<RoleValue>(Role.STUDENT)
const toastText = ref('')
const loading = ref(false)
let toastTimer = 0

function toast(text: string) {
  toastText.value = text
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastText.value = ''
  }, 1800)
}

async function submit() {
  if (!isValidStudentId(studentId.value.trim())) {
    toast(STUDENT_ID_RULE_TEXT)
    return
  }
  if (mode.value === 'register') {
    if (!PASSWORD_REGEX.test(password.value)) {
      toast(PASSWORD_RULE_TEXT)
      return
    }
    if (password.value !== confirmPassword.value) {
      toast('两次输入的密码不一致')
      return
    }
  } else if (!password.value.trim()) {
    toast('请输入密码')
    return
  }

  loading.value = true
  try {
    if (mode.value === 'register') {
      const res = await register({
        studentId: studentId.value.trim(),
        password: password.value,
        role: role.value,
      })
      mode.value = 'login'
      password.value = ''
      confirmPassword.value = ''
      toast(`注册成功，你好，${res.name}`)
      return
    }
    const res = await login({
      studentId: studentId.value.trim(),
      password: password.value,
    })
    userStore.setLogin(res)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/m'
    router.replace(redirect.startsWith('/m') ? redirect : '/m')
  } catch {
    // 失败提示由请求拦截器弹出
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="m-app" :class="{ dark: resolvedTheme === 'dark' }">
    <div class="m-page">
      <div class="body pad" style="display: flex; flex-direction: column; justify-content: center">
        <div class="hero">
          <div class="mark">🔍</div>
          <h2 style="margin-top: 8px">失物招领</h2>
          <p class="muted" style="margin-top: 4px">实名制校园失物招领平台</p>
        </div>
        <div class="tabs" style="border-radius: 10px; margin-bottom: 18px">
          <button type="button" :class="{ on: mode === 'login' }" @click="mode = 'login'">登录</button>
          <button type="button" :class="{ on: mode === 'register' }" @click="mode = 'register'">
            注册
          </button>
        </div>
        <div class="field">
          <span>学号</span>
          <input v-model="studentId" placeholder="请输入学号" />
        </div>
        <div class="field">
          <span>密码</span>
          <input
            v-model="password"
            type="password"
            :placeholder="mode === 'register' ? PASSWORD_RULE_TEXT : '请输入密码'"
          />
        </div>
        <template v-if="mode === 'register'">
          <div class="field">
            <span>确认密码</span>
            <input v-model="confirmPassword" type="password" placeholder="再次输入密码" />
          </div>
          <div class="field">
            <span>注册角色</span>
            <div class="seg">
              <button
                type="button"
                :class="{ on: role === Role.STUDENT }"
                @click="role = Role.STUDENT"
              >
                学生
              </button>
              <button type="button" :class="{ on: role === Role.ADMIN }" @click="role = Role.ADMIN">
                管理员
              </button>
            </div>
          </div>
          <p class="muted" style="margin-bottom: 14px">无需填写姓名，系统将根据学号自动匹配实名信息。</p>
        </template>
        <button type="button" class="btn" :disabled="loading" @click="submit">
          {{ mode === 'register' ? '注册' : '登录' }}
        </button>
      </div>
    </div>
    <div v-if="toastText" class="toast">{{ toastText }}</div>
  </div>
</template>
