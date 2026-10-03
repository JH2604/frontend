<script setup lang="ts">

import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { login, register } from '@/api/auth'
import { useUserStore } from '@/stores/user'
import { Role, type RoleValue } from '@/utils/contract'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeTab = ref<'login' | 'register'>('login')

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  // 契约（文档 A1/A2）里登录凭证是学号，不是用户名
  studentId: '',
  password: '',
  confirmPassword: '',
  // 只有注册时用得上。不选就按学生注册
  role: Role.STUDENT as RoleValue,
})

const rules: FormRules = {
  studentId: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, message: '密码至少 8 位', trigger: 'blur' },
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
    // USE_MOCK 开着的时候，api 层内部走假数据；关掉就走真后端，这一页不用改
    const params = {
      studentId: form.studentId,
      password: form.password,
      role: form.role,
    }
    const res = activeTab.value === 'register' ? await register(params) : await login(params)

    userStore.setLogin(res)
    ElMessage.success(activeTab.value === 'register' ? '注册成功，已自动登录' : '登录成功')

    // 之前在守卫里记下的 redirect，登录完送回去
    const redirect = (route.query.redirect as string) || (res.role === 'admin' ? '/admin' : '/')
    router.push(redirect)
  } catch {
    // 错误提示已经在 src/utils/request.ts 的响应拦截器里统一弹过了，这里不重复弹
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
