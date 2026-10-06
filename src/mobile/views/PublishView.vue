<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { uploadFile } from '@/api/file'
import { createItem } from '@/api/item'
import type { ItemType } from '@/types/api'
import { POST_CONTENT_MAX, POST_IMAGE_LIMIT, POST_IMAGE_MAX_MB, POST_TITLE_MAX } from '@/utils/contract'
import { toIso } from '@/utils/format'
import { useMobileBridge } from '../context'

const router = useRouter()
const bridge = useMobileBridge()

const type = ref<ItemType>('lost')
const title = ref('')
const content = ref('')
const locationName = ref('')
const eventTime = ref('')
const images = ref<string[]>([])
const uploading = ref(false)
const submitting = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

async function onFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  for (const file of files) {
    if (images.value.length >= POST_IMAGE_LIMIT) {
      bridge.toast(`最多 ${POST_IMAGE_LIMIT} 张图片`)
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      bridge.toast('只支持 JPEG / PNG / WebP')
      continue
    }
    if (file.size > POST_IMAGE_MAX_MB * 1024 * 1024) {
      bridge.toast(`图片不能超过 ${POST_IMAGE_MAX_MB}MB`)
      continue
    }
    uploading.value = true
    try {
      const uploaded = await uploadFile(file, 'post')
      images.value.push(uploaded.url)
    } catch {
      // 失败提示由请求拦截器弹出
    } finally {
      uploading.value = false
    }
  }
}

async function publish() {
  const nextTitle = title.value.trim()
  const nextContent = content.value.trim()
  const place = locationName.value.trim()
  if (!nextTitle || !nextContent || !place) {
    bridge.toast('请填写标题、描述和地点')
    return
  }
  if (nextTitle.length > POST_TITLE_MAX) {
    bridge.toast(`标题不超过 ${POST_TITLE_MAX} 字`)
    return
  }
  if (nextContent.length > POST_CONTENT_MAX) {
    bridge.toast(`描述不超过 ${POST_CONTENT_MAX} 字`)
    return
  }
  if (/1\d{10}/.test(nextContent)) {
    bridge.toast('描述中包含手机号，请删除后通过私信联系')
    return
  }
  if (uploading.value) {
    bridge.toast('图片还在上传，请稍候')
    return
  }
  submitting.value = true
  try {
    const created = await createItem({
      type: type.value,
      title: nextTitle,
      content: nextContent,
      images: images.value,
      location: { name: place },
      eventTime: eventTime.value ? toIso(eventTime.value) : null,
    })
    bridge.toast('发布成功')
    router.replace(`/m/items/${created.id}`)
  } catch {
    // 失败提示由请求拦截器弹出
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="m-page">
    <div class="topbar">
      <button class="icon" type="button" @click="router.back()">‹</button>
      <div class="title">发布帖子</div>
      <div class="icon"></div>
    </div>
    <div class="body pad">
      <div class="field">
        <span>类型</span>
        <div class="seg">
          <button type="button" :class="{ on: type === 'lost' }" @click="type = 'lost'">
            我丢了东西（失物）
          </button>
          <button type="button" :class="{ on: type === 'found' }" @click="type = 'found'">
            我捡到东西（招领）
          </button>
        </div>
      </div>
      <div class="field">
        <span>标题 *</span>
        <input v-model="title" :maxlength="POST_TITLE_MAX" placeholder="简要描述物品，30 字以内" />
      </div>
      <div class="field">
        <span>描述 *</span>
        <textarea
          v-model="content"
          rows="4"
          :maxlength="POST_CONTENT_MAX"
          placeholder="颜色、品牌、特征等，帮助对方确认"
        ></textarea>
      </div>
      <p class="notice" style="margin: -6px 0 14px">
        请勿在描述中填写手机号等联系方式，其他同学会通过站内私信联系你。
      </p>
      <div class="field">
        <span>图片（最多 {{ POST_IMAGE_LIMIT }} 张）</span>
        <div class="row" style="flex-wrap: wrap">
          <div v-for="url in images" :key="url" class="img" style="width: 72px; height: 72px">
            <img :src="url" alt="" />
          </div>
          <button
            v-if="images.length < POST_IMAGE_LIMIT"
            type="button"
            class="img"
            style="width: 72px; height: 72px; background: var(--bg); border: 1px dashed var(--line); font-size: 26px; color: var(--sub)"
            @click="fileInput?.click()"
          >
            ＋
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            @change="onFiles"
          />
        </div>
        <p v-if="uploading" class="muted" style="margin-top: 6px">图片上传中…</p>
      </div>
      <div class="field">
        <span>地点 *</span>
        <input v-model="locationName" placeholder="如：图书馆三楼自习区" />
      </div>
      <div class="field">
        <span>{{ type === 'lost' ? '丢失' : '拾到' }}时间</span>
        <input v-model="eventTime" type="datetime-local" />
      </div>
      <button type="button" class="btn" :disabled="submitting" @click="publish">发布</button>
    </div>
  </div>
</template>
