<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { uploadFile } from '@/api/file'
import { bindContact, changeMyPassword, getMyProfile, sendVerificationCode } from '@/api/user'
import type { UserMe } from '@/types/api'
import { useUserStore } from '@/stores/user'
import {
  AVATAR_MAX_MB,
  ContactChannel,
  EMAIL_REGEX,
  PASSWORD_REGEX,
  PASSWORD_RULE_TEXT,
  VERIFICATION_CODE_LENGTH,
  maskEmail,
  maskPhone,
  type ContactChannelValue,
} from '@/utils/contract'
import { unreadTotal } from '@/utils/unread'
import AvatarBadge from '../components/AvatarBadge.vue'
import { useMobileBridge } from '../context'

const router = useRouter()
const userStore = useUserStore()
const bridge = useMobileBridge()

const me = ref<UserMe | null>(null)
const sheet = ref<'none' | 'bind' | 'password'>('none')
const channel = ref<ContactChannelValue>(ContactChannel.EMAIL)
const target = ref('')
const code = ref('')
const countdown = ref(0)
const sentTarget = ref('')
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const avatarInput = ref<HTMLInputElement | null>(null)
let timer = 0

async function load() {
  try {
    me.value = await getMyProfile()
    await bridge.reloadProfile()
  } catch {
    me.value = null
  }
}

function openBind(next: ContactChannelValue) {
  channel.value = next
  target.value = ''
  code.value = ''
  sentTarget.value = ''
  sheet.value = 'bind'
}

function clearTimer() {
  if (!timer) return
  window.clearInterval(timer)
  timer = 0
}

async function sendCode() {
  const value = target.value.trim()
  if (channel.value === ContactChannel.EMAIL && !EMAIL_REGEX.test(value)) {
    bridge.toast('请输入正确的邮箱')
    return
  }
  if (channel.value === ContactChannel.SMS && !/^1\d{10}$/.test(value)) {
    bridge.toast('请输入 11 位手机号')
    return
  }
  try {
    await sendVerificationCode({ channel: channel.value, target: value })
    sentTarget.value = value
    countdown.value = 60
    clearTimer()
    timer = window.setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0) clearTimer()
    }, 1000)
    bridge.toast(channel.value === ContactChannel.SMS ? '验证码已通过短信发送' : '验证码已发送到邮箱')
  } catch {
    // 失败提示由请求拦截器弹出
  }
}

async function confirmBind() {
  const value = target.value.trim()
  if (sentTarget.value && value !== sentTarget.value) {
    bridge.toast(channel.value === ContactChannel.SMS ? '手机号已修改，请重新获取验证码' : '邮箱已修改，请重新获取验证码')
    return
  }
  if (!new RegExp(`^\\d{${VERIFICATION_CODE_LENGTH}}$`).test(code.value.trim())) {
    bridge.toast(`请输入 ${VERIFICATION_CODE_LENGTH} 位验证码`)
    return
  }
  try {
    await bindContact({ channel: channel.value, target: value, code: code.value.trim() })
    sheet.value = 'none'
    bridge.toast('绑定成功')
    await load()
  } catch {
    // 失败提示由请求拦截器弹出
  }
}

async function confirmPasswordChange() {
  if (!oldPassword.value) {
    bridge.toast('请输入原密码')
    return
  }
  if (!PASSWORD_REGEX.test(newPassword.value)) {
    bridge.toast(PASSWORD_RULE_TEXT)
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    bridge.toast('两次输入的新密码不一致')
    return
  }
  try {
    await changeMyPassword({ oldPassword: oldPassword.value, newPassword: newPassword.value })
    bridge.toast('密码已修改，请重新登录')
    userStore.logout()
    unreadTotal.value = 0
    router.replace('/m/login')
  } catch {
    // 失败提示由请求拦截器弹出
  }
}

async function onAvatar(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    bridge.toast('只支持 JPEG / PNG / WebP')
    return
  }
  if (file.size > AVATAR_MAX_MB * 1024 * 1024) {
    bridge.toast(`头像不能超过 ${AVATAR_MAX_MB}MB`)
    return
  }
  try {
    await uploadFile(file, 'avatar')
    bridge.toast('图片已上传，账号头像还不能更新')
  } catch {
    // 失败提示由请求拦截器弹出
  }
}

onMounted(load)
onUnmounted(clearTimer)
</script>

<template>
  <div class="m-page">
    <div class="topbar">
      <button class="icon" type="button" @click="router.back()">‹</button>
      <div class="title">设置</div>
      <div class="icon"></div>
    </div>
    <div v-if="me" class="body">
      <button type="button" class="list-item" @click="avatarInput?.click()">
        <AvatarBadge :name="me.name" :url="me.avatarUrl" :user-id="me.id" :size="56" />
        <div class="grow">
          <b style="font-size: 17px">{{ me.name }}</b>
          <div class="muted">点击更换头像</div>
        </div>
        <span class="right">›</span>
      </button>
      <input
        ref="avatarInput"
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        @change="onAvatar"
      />
      <div style="height: 10px"></div>
      <div class="list-item">
        <div class="grow">姓名</div>
        <span class="right">{{ me.name }}（实名，不可修改）</span>
      </div>
      <div class="list-item">
        <div class="grow">学号</div>
        <span class="right">{{ me.studentId }}</span>
      </div>
      <button type="button" class="list-item" @click="openBind(ContactChannel.SMS)">
        <div class="grow">手机号</div>
        <span class="right">{{ me.phone ? maskPhone(me.phone) : '未绑定' }} ›</span>
      </button>
      <button type="button" class="list-item" @click="openBind(ContactChannel.EMAIL)">
        <div class="grow">邮箱</div>
        <span class="right">{{ me.email ? maskEmail(me.email) : '未绑定' }} ›</span>
      </button>
      <div class="list-item">
        <div class="grow">
          私信提醒
          <div class="muted" style="font-size: 12px; margin-top: 2px">
            {{
              me.phone || me.email
                ? '别人给你发私信时，可通过短信 / 邮件提醒你。你的手机号和邮箱不会展示给其他用户'
                : '绑定手机号或邮箱后才能收到提醒'
            }}
          </div>
        </div>
        <span class="switch" :class="{ on: me.allowRemind }"></span>
      </div>
      <button type="button" class="list-item" @click="sheet = 'password'">
        <div class="grow">修改密码</div>
        <span class="right">›</span>
      </button>
      <div style="height: 10px"></div>
      <button type="button" class="list-item" @click="router.push('/m/admins')">
        <div class="grow">联系管理员</div>
        <span class="right">›</span>
      </button>
    </div>
    <div v-else class="body"><div class="empty">加载中…</div></div>

    <template v-if="sheet !== 'none'">
      <div class="mask modal-mask" @click="sheet = 'none'"></div>
      <div v-if="sheet === 'bind'" class="modal">
        <h3 style="margin-bottom: 14px">
          绑定 / 修改{{ channel === ContactChannel.SMS ? '手机号' : '邮箱' }}
        </h3>
        <div class="field">
          <span>{{ channel === ContactChannel.SMS ? '手机号' : '邮箱' }}</span>
          <input
            v-model="target"
            :placeholder="channel === ContactChannel.SMS ? '11 位手机号' : 'name@example.com'"
          />
        </div>
        <div class="field">
          <span>验证码</span>
          <div class="row">
            <input v-model="code" placeholder="6 位验证码" :maxlength="VERIFICATION_CODE_LENGTH" />
            <button type="button" class="btn sm ghost" :disabled="countdown > 0" @click="sendCode">
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </button>
          </div>
        </div>
        <button type="button" class="btn" @click="confirmBind">确认</button>
      </div>
      <div v-else class="modal">
        <h3 style="margin-bottom: 14px">修改密码</h3>
        <div class="field">
          <span>原密码</span>
          <input v-model="oldPassword" type="password" />
        </div>
        <div class="field">
          <span>新密码</span>
          <input v-model="newPassword" type="password" :placeholder="PASSWORD_RULE_TEXT" />
        </div>
        <div class="field">
          <span>确认新密码</span>
          <input v-model="confirmPassword" type="password" />
        </div>
        <button type="button" class="btn" @click="confirmPasswordChange">确认修改</button>
      </div>
    </template>
  </div>
</template>
