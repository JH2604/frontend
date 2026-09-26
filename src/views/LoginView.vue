<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeTab = ref<'login' | 'register'>('login')

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

// 切换登录 / 注册时，清掉上一次的红字
function handleTabChange() {
  formRef.value?.clearValidate()
}

async function handleSubmit() {
  // 校验通过返回 true，不通过会 reject，这里 catch 成 false
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  // 注册时才检查两次密码是否一致
  if (activeTab.value === 'register' && form.password !== form.confirmPassword) {
    ElMessage.error('两次输入的密码不一致')
    return
  }

  loading.value = true
  try {
    // TODO 后端接口通了以后，把这块换成：
    // const res = activeTab.value === 'register' ? await register(form) : await login(form)
    await new Promise((r) => setTimeout(r, 300))
    const res = {
      token: 'mock-token-' + Date.now(),
      role: (form.username === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
      username: form.username,
    }

    userStore.setLogin(res)
    ElMessage.success(activeTab.value === 'register' ? '注册成功，已自动登录' : '登录成功')

    // 之前在守卫里记下的 redirect，登录完送回去
    const redirect = (route.query.redirect as string) || (res.role === 'admin' ? '/admin' : '/')
    router.push(redirect)
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
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" clearable />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码（至少 6 位）"
            show-password
            @keyup.enter="handleSubmit"
          />
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

      <p class="tip">
        现在是 Mock：登录时用户名填 admin 会以管理员身份进入管理端，其他用户名进用户端。注册会直接自动登录。
      </p>
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

.tip {
  margin: 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}
</style>
