<script setup lang="ts">
// =====================================================================
// 用户中心（设置页，契约 U1~U5 全在这一个页面）
// =====================================================================
//
// 【它在哪里】
// router/index.ts:  { path: 'settings', component: Settings }
// 入口：页头菜单的「用户中心」
//
// 【这个页面分成 4 块，分别对应哪个接口】
// ① 基本信息展示    <- U1 GET /users/me
// ② 头像 / 主题 / 提醒开关 <- U2 PATCH /users/me
// ③ 绑定手机号或邮箱 <- U4 POST /verification-codes（发码）
// U5 PUT /users/me/contact（带码提交）
// ④ 修改密码        <- U3 PUT /users/me/password
//
// 【本文件里 5 处"契约要求这么做"的地方（不是可选的美化）】
//
// ① 主题：先本地生效，再异步保存，而且保存失败【不回滚】
// 契约原文："主题切换建议前端先改本地状态并立即生效，再异步调用本接口保存，
// 这样换设备登录时也能保持主题。"
// 所以 handleThemeChange 里第一行是 setThemeLocal(next)（界面立刻变），
// 之后才 await updateMe({ theme })。失败也不回滚 ——
// 界面已经是用户要的样子了，回滚只会让人莫名其妙。
//
// ② 提醒开关：失败要回滚
// 和主题相反。因为开关是个"动作"，没生效就该退回去。
//
// ③ 改密码成功后必须清令牌 + 跳登录页
// 契约："后端吊销该用户在 user_sessions 里的全部会话（所有设备都会下线）"。
// 只弹提示不跳的话，用户以为自己还登录着，下一次点击就 40103 被踢。
//
// ④ 发完验证码要锁住输入框
// 契约："target 必须和 U4 发送验证码时一致"。
// 让用户改了必然失败，不如直接不让改（不给坏入口）。
//
// ⑤ 头像保存用 watch 而不是监听事件
// ImageUploader 是用 defineModel 声明的，父组件直接改值时
// 不保证会触发 update:model-value 事件，所以监听自己这个 ref 最可靠。
//
// 【本文件的语法点】
// reactive({...})                 表单字段（密码表单、联系方式表单）
// ref<FormInstance>()             拿表单实例，用来调 validate() / clearValidate()
// computed(...)                   targetLabel 这种"跟着另一个字段变的文案"
// watch(avatarList, ...)          监听一个 ref，它变了就执行
// window.setInterval / clearInterval  倒计时（配合 onUnmounted 清理）
// 自定义校验 validator            FormRules 里写函数，比如"两次密码要一致"
//
// 【注意这个文件为什么长（514 行）】
// 因为它把 4 个独立功能放在了一个页面。如果觉得难读，
// 就按上面 ①②③④ 四块分开看，每块都是"表单 + 一个接口调用"。

import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import type { Theme, UserMe } from '@/types/api'
import { bindContact, changeMyPassword, getMyProfile, sendVerificationCode, updateMe } from '@/api/user'
import ImageUploader from '@/components/ImageUploader.vue'
import { useUserStore } from '@/stores/user'
import {
  AVATAR_MAX_MB,
  ContactChannel,
  type ContactChannelValue,
  PASSWORD_RULE_TEXT,
  ROUTE_LOGIN,
  ROUTE_SETTINGS,
  UploadUsage,
  VERIFICATION_CODE_LENGTH,
  maskEmail,
  maskPhone,
} from '@/utils/contract'
import { formatDateTime, fromNow } from '@/utils/format'
import { setThemeLocal, syncThemeFromServer } from '@/utils/theme'

// =====================================================================
// 用户中心 / 设置页（v1.1 契约 U1~U5）
//
//   U1 GET   /users/me              我的信息（页面加载时拉一次）
//   U2 PATCH /users/me              改头像 / 主题 / 提醒开关
//   U3 PUT   /users/me/password     改密码（⚠️ 成功后所有会话失效，必须重新登录）
//   U4 POST  /verification-codes    发验证码（channel: sms / email）
//   U5 PUT   /users/me/contact      绑定/修改手机号或邮箱
//
// ⚠️ 两处契约里的"设计要求"，不是可选的美化：
//
//   1. U2 原话："主题切换建议前端先改本地状态并立即生效，再异步调用本接口保存，
//      这样换设备登录时也能保持主题。"
//      → 所以下面 setTheme() 的顺序是：先 setThemeLocal()（界面立刻变），
//        再 await updateMe()。而且**保存失败也不回滚界面** —— 用户看到的
//        主题已经是他要的了，弹个"保存失败"就够了，回滚反而更奇怪。
//
//   2. U3 原话："修改成功后，后端吊销该用户在 user_sessions 里的全部会话
//      （所有设备都会下线），前端清除本地令牌并跳转登录页。"
//      → 所以改完密码**必须**主动 logout + 跳登录页，不能只是弹个成功提示。
//        否则用户以为自己还登录着，下一个请求就会 40103 被踢，体验更差。
//
// ⚠️ 还有一处容易漏：手机号/邮箱是"两步走"（U4 发码 → U5 带码提交），
//    而且 U5 的 target 必须和 U4 完全一致（契约明确要求）。
//    所以下面的 target 输入框在"已发送验证码"之后会被锁住 ——
//    让用户改了就必然失败，不如直接不让他改。
// =====================================================================

defineOptions({ name: 'Settings' })

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const me = ref<UserMe | null>(null)

// ===== 主题 =====
const themeOptions: { label: string; value: Theme }[] = [
  { label: '明亮', value: 'light' },
  { label: '暗黑', value: 'dark' },
  { label: '跟随系统', value: 'system' },
]

const theme = ref<Theme>('system')
const savingTheme = ref(false)

// ===== 头像上传（F1，usage=avatar）=====
// ImageUploader 的 v-model 是 string[]（帖子最多 9 张），
// 头像只有一张，所以取数组第一个元素。
const avatarList = ref<string[]>([])
const savingAvatar = ref(false)

// ===== 提醒开关（U2 的 allow_remind）=====
const allowRemind = ref(true)
const savingRemind = ref(false)

// ===== 改密码（U3）=====
const pwdFormRef = ref<FormInstance>()
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdLoading = ref(false)

const pwdRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    // 规则来自 contract.ts 的 PASSWORD_RULE_TEXT，和注册时同一套
    {
      pattern: /^(?=.*[A-Za-z])(?=.*\d)[\S]{8,32}$/,
      message: PASSWORD_RULE_TEXT,
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    {
      // 自定义校验：两次输入必须一致。
      // C++ 类比：一个 assert(a == b) 式的断言，放在提交前的校验里。
      validator: (_rule, value: string, callback) => {
        if (value !== pwdForm.newPassword) callback(new Error('两次输入的新密码不一致'))
        else callback()
      },
      trigger: 'blur',
    },
  ],
}

// ===== 联系方式（U4 + U5）=====
const contactFormRef = ref<FormInstance>()
const contactForm = reactive({
  channel: ContactChannel.SMS as ContactChannelValue,
  target: '',
  code: '',
})
const codeSent = ref(false)
const sendingCode = ref(false)
/** 发验证码时的倒计时（防止用户狂点；契约里后端也有 60 秒 1 次的限制） */
const countdown = ref(0)
let countdownTimer: number | undefined
const bindingContact = ref(false)

const contactRules: FormRules = {
  target: [{ required: true, message: '请输入手机号或邮箱', trigger: 'blur' }],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
}

/** 当前渠道对应的"目标"叫什么、placeholder 写什么 */
const targetLabel = computed(() => (contactForm.channel === ContactChannel.SMS ? '手机号' : '邮箱'))
const targetPlaceholder = computed(() =>
  contactForm.channel === ContactChannel.SMS ? '11 位手机号' : '例如 zhangsan@example.com',
)

async function fetchMe() {
  loading.value = true
  try {
    const res = await getMyProfile()
    me.value = res
    theme.value = res.theme
    allowRemind.value = res.allowRemind
    // 头像只有一张，塞进数组给 ImageUploader 用
    avatarList.value = res.avatarUrl ? [res.avatarUrl] : []
    // 后端是最权威的主题来源（契约 U2 说换设备登录也要保持），同步一下
    syncThemeFromServer(res.theme)
  } catch {
    me.value = null
  } finally {
    loading.value = false
  }
}

/**
 * 主题 radio 的 change 包装。
 *
 * ⚠️ 参数类型故意收成宽泛类型而不是 `Theme`：
 *    el-radio-group 的 change 事件给出来的是宽泛类型，
 *    在模板里内联写箭头函数会被 TS 判成"隐式 any"（我踩过）。
 *    所以在事件边界收宽泛类型、内部收敛成 Theme —— 认不出来直接忽略。
 *    C++ 类比：在函数入口做一次类型检查（dynamic_cast 失败就丢弃），
 *    而不是让脏类型一路传到深层逻辑里。
 */
function handleThemeRadioChange(next: string | number | boolean | undefined) {
  if (next !== 'light' && next !== 'dark' && next !== 'system') return
  void handleThemeChange(next)
}

/** 主题切换：先本地生效，再异步保存（契约 U2 的要求，见文件头注释） */
async function handleThemeChange(next: Theme) {
  setThemeLocal(next)
  theme.value = next
  savingTheme.value = true
  try {
    await updateMe({ theme: next })
    ElMessage.success('主题已保存')
  } catch {
    // ⚠️ 故意不回滚：界面已经是用户要的样子了，回滚只会让人莫名其妙。
    //    提示已经由拦截器弹过，这里不再重复弹。
  } finally {
    savingTheme.value = false
  }
}

/** 头像上传成功后保存（F1 先拿 URL，再走 U2 存下来） */
async function handleAvatarChange(urls: string[]) {
  const url = urls[0]
  if (!url || url === me.value?.avatarUrl) return

  savingAvatar.value = true
  try {
    const res = await updateMe({ avatarUrl: url })
    me.value = res
    ElMessage.success('头像已更新')
  } catch {
    // 保存失败就把界面退回原来的头像，避免"看着换了其实没存上"
    avatarList.value = me.value?.avatarUrl ? [me.value.avatarUrl] : []
  } finally {
    savingAvatar.value = false
  }
}

// ===== 下面三个 watch 都是"改了才存" =====

// 头像：uploader 上传完成会改 avatarList，这里监听它去调 U2。
// ⚠️ 为什么用 watch 而不是在 uploader 上监听 @update:model-value？
//    因为 ImageUploader 是用 `defineModel` 声明 model 的，
//    这种写法**不保证**会 emit 'update:model-value'（父组件直接改值时不会触发）。
//    监听自己这个 ref 是 100% 可靠的。
//    C++ 类比：不依赖"对方回调我"，而是观察共享状态的变化。
watch(avatarList, (urls) => {
  handleAvatarChange(urls)
})

/**
 * 提醒开关的 change 事件包装。
 * 同上：入口收宽泛类型，内部收敛成 boolean 再往下走。
 */
function handleRemindSwitchChange(v: string | number | boolean | undefined) {
  void handleAllowRemindChange(v === true)
}

/** 提醒开关（U2 的 allow_remind） */
async function handleAllowRemindChange(next: boolean) {
  savingRemind.value = true
  try {
    const res = await updateMe({ allowRemind: next })
    me.value = res
    ElMessage.success(next ? '已开启私信提醒' : '已关闭私信提醒')
  } catch {
    // 失败回滚开关（这个和主题不同：开关是个动作，没生效就该退回去）
    allowRemind.value = !next
  } finally {
    savingRemind.value = false
  }
}

/** 改密码（U3） */
async function handleChangePassword() {
  const valid = await pwdFormRef.value?.validate().catch(() => false)
  if (!valid) return

  pwdLoading.value = true
  try {
    await changeMyPassword({
      oldPassword: pwdForm.oldPassword,
      newPassword: pwdForm.newPassword,
    })

    // ⚠️ 契约：改密码成功后**所有会话失效**（所有设备下线）。
    //    所以必须清本地令牌 + 跳登录页，不能只说"改成功"。
    ElMessage.success('密码已修改，请重新登录')
    userStore.logout()
    router.push(ROUTE_LOGIN)
  } catch {
    // 错误提示已经由 mockFail（假后端）或 request.ts 拦截器（真后端）弹出
  } finally {
    pwdLoading.value = false
  }
}

/** 发验证码（U4） */
async function handleSendCode() {
  const target = contactForm.target.trim()
  if (!target) {
    ElMessage.warning(`请先填写${targetLabel.value}`)
    return
  }

  sendingCode.value = true
  try {
    await sendVerificationCode({ channel: contactForm.channel, target })
    codeSent.value = true
    ElMessage.success(`验证码已发送到${targetLabel.value}（演示环境固定为 123456）`)
    // 60 秒倒计时，和后端的"同一目标 60 秒 1 次"限制对齐
    countdown.value = 60
    countdownTimer = window.setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0 && countdownTimer !== undefined) {
        window.clearInterval(countdownTimer)
        countdownTimer = undefined
      }
    }, 1000)
  } catch {
    // 错误提示已经由 mockFail（假后端）或 request.ts 拦截器（真后端）弹出
  } finally {
    sendingCode.value = false
  }
}

/** 切换渠道要重置已发状态（因为 target 的含义变了） */
function handleChannelChange() {
  contactForm.target = ''
  contactForm.code = ''
  codeSent.value = false
}

/** 绑定 / 修改联系方式（U5） */
async function handleBindContact() {
  const valid = await contactFormRef.value?.validate().catch(() => false)
  if (!valid) return
  if (!codeSent.value) {
    ElMessage.warning('请先获取验证码')
    return
  }

  bindingContact.value = true
  try {
    const res = await bindContact({
      channel: contactForm.channel,
      // ⚠️ 必须和发验证码时的 target 一致（契约明确要求）——
      //    上面锁住输入框就是为了保证这一点
      target: contactForm.target.trim(),
      code: contactForm.code.trim(),
    })
    ElMessage.success('绑定成功')
    // 用返回的最新值刷新展示，不重新拉整个 U1（省一次请求）
    if (me.value) {
      me.value.phone = res.phone
      me.value.email = res.email
    }
    contactForm.code = ''
    codeSent.value = false
  } catch {
    // 错误提示已经由 mockFail（假后端）或 request.ts 拦截器（真后端）弹出
  } finally {
    bindingContact.value = false
  }
}

onMounted(fetchMe)
</script>

<template>
  <div v-loading="loading" class="page">
    <el-page-header content="用户中心" @back="router.back()" />

    <el-card v-if="me">
      <!-- ===== 基本信息（U1 展示） ===== -->
      <div class="profile">
        <div class="avatar-block">
          <ImageUploader
            v-model="avatarList"
            :limit="1"
            :usage="UploadUsage.AVATAR"
            :max-mb="AVATAR_MAX_MB"
          />
          <div v-if="savingAvatar" class="saving">头像保存中…</div>
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

      <!-- ===== 外观 + 提醒开关（U2） ===== -->
      <div class="section-title">外观与提醒</div>
      <el-form label-width="120px">
        <el-form-item label="主题">
          <el-radio-group
            :model-value="theme"
            :disabled="savingTheme"
            @change="handleThemeRadioChange"
          >
            <el-radio-button v-for="o in themeOptions" :key="o.value" :value="o.value">
              {{ o.label }}
            </el-radio-button>
          </el-radio-group>
          <span class="hint">切换立即生效，并会保存到账号上（换设备也保持）</span>
        </el-form-item>

        <el-form-item label="私信提醒">
          <el-switch
            v-model="allowRemind"
            :loading="savingRemind"
            @change="handleRemindSwitchChange"
          />
          <span class="hint">关闭后，别人给你发私信时系统不会用短信 / 邮件提醒你</span>
        </el-form-item>
      </el-form>

      <el-divider />

      <!-- ===== 联系方式（U4 + U5） ===== -->
      <div class="section-title">绑定手机号 / 邮箱</div>
      <el-form
        ref="contactFormRef"
        :model="contactForm"
        :rules="contactRules"
        label-width="120px"
        class="contact-form"
      >
        <el-form-item label="类型">
          <el-radio-group v-model="contactForm.channel" @change="handleChannelChange">
            <el-radio-button :value="ContactChannel.SMS">手机号</el-radio-button>
            <el-radio-button :value="ContactChannel.EMAIL">邮箱</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="targetLabel" prop="target">
          <el-input
            v-model="contactForm.target"
            :placeholder="targetPlaceholder"
            :disabled="codeSent"
            style="width: 280px"
          />
          <el-button
            class="code-btn"
            :loading="sendingCode"
            :disabled="countdown > 0"
            @click="handleSendCode"
          >
            {{ countdown > 0 ? `${countdown} 秒后可重发` : '获取验证码' }}
          </el-button>
          <!-- 说明为什么要锁住输入框 -->
          <span v-if="codeSent" class="hint">
            已发送验证码。修改{{ targetLabel }}需要重新获取验证码
          </span>
        </el-form-item>

        <el-form-item label="验证码" prop="code">
          <el-input
            v-model="contactForm.code"
            :maxlength="VERIFICATION_CODE_LENGTH"
            placeholder="6 位验证码"
            style="width: 160px"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="bindingContact" @click="handleBindContact">
            保存绑定
          </el-button>
        </el-form-item>
      </el-form>

      <el-divider />

      <!-- ===== 修改密码（U3） ===== -->
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

    <!-- 这个页面本身的路径也写上，方便你确认路由 -->
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

.saving {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-sub);
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

.contact-form,
.pwd-form {
  max-width: 620px;
}

.code-btn {
  margin-left: 8px;
}

.route-note {
  text-align: center;
  font-size: 12px;
  color: var(--color-sub);
}
</style>
