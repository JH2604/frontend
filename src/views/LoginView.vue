<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { login, register } from '@/api/auth'
import { getMyProfile } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { PASSWORD_RULE_TEXT, Role, type RoleValue } from '@/utils/contract'
import { syncThemeFromServer } from '@/utils/theme'
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)\S{8,32}$/
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeTab = ref<'login' | 'register'>('login')

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  studentId: '',
  password: '',
  confirmPassword: '',
  role: Role.STUDENT as RoleValue,
})

const rules = computed<FormRules>(() => ({
  studentId: [
    { required: true, message: '请输入学号', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (value === 'admin' || /^\d+$/.test(value)) callback()
        else callback(new Error('学号必须为数字'))
      },
      trigger: 'blur',
    },
  ],
  password:
    activeTab.value === 'register'
      ? [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { pattern: PASSWORD_REGEX, message: PASSWORD_RULE_TEXT, trigger: 'blur' },
        ]
      : [{ required: true, message: '请输入密码', trigger: 'blur' }],
  confirmPassword:
    activeTab.value === 'register'
      ? [
          { required: true, message: '请再次输入密码', trigger: 'blur' },
          {
            validator: (_rule, value: string, callback) => {
              if (value !== form.password) callback(new Error('两次输入的密码不一致'))
              else callback()
            },
            trigger: 'blur',
          },
        ]
      : [],
}))

function handleTabChange() {
  formRef.value?.clearValidate()
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    if (activeTab.value === 'register') {
      const res = await register({
        studentId: form.studentId,
        password: form.password,
        role: form.role,
      })
      await ElMessageBox.alert(`注册成功，你好, ${res.name}!`, '提示', { type: 'success' })
      form.password = ''
      form.confirmPassword = ''
      activeTab.value = 'login'
      return
    }

    const res = await login({
      studentId: form.studentId,
      password: form.password,
    })
    userStore.setLogin(res)
    try {
      const me = await getMyProfile()
      syncThemeFromServer(me.theme)
    } catch {}
    ElMessage.success(`登录成功，你好, ${res.username}!`)
    const redirect = (route.query.redirect as string) || (res.role === 'admin' ? '/admin' : '/')
    router.push(redirect)
  } catch {
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <el-card class="login-card">
      <h2 class="title">校园失物招领</h2>

      <el-tabs v-model="activeTab" stretch @tab-change="handleTabChange">
        <el-tab-pane label="登录" name="login" />
        <el-tab-pane label="注册" name="register" />
      </el-tabs>

      <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleSubmit">
        <el-form-item prop="studentId">
          <el-input v-model="form.studentId" placeholder="学号" clearable />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码（8~32 位，含字母和数字）"
            show-password
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <el-form-item v-if="activeTab === 'register'" prop="role">
          <el-radio-group v-model="form.role">
            <el-radio :value="Role.STUDENT">学生</el-radio>
            <el-radio :value="Role.ADMIN">管理员</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="activeTab === 'register'" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="再输入一次密码"
            show-password
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <el-form-item>
          <el-button class="submit" type="primary" :loading="loading" @click="handleSubmit">
            {{ activeTab === 'login' ? '登录' : '注册' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.login-card {
  width: 380px;
}

.title {
  margin: 0 0 12px;
  text-align: center;
}

.submit {
  width: 100%;
}
</style>
