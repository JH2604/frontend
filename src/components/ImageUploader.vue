<script setup lang="ts">
//
// =====================================================================
// 图片上传（发帖配图 / 换头像都用它）
// =====================================================================
//
// 【它在哪里】
// views/user/Publish.vue    发布帖子时传图（最多 9 张，每张 ≤5MB）
// views/user/Settings.vue   用户中心换头像（1 张，≤2MB）
//
// 两处的区别通过 props 传：
// ImageUploader v-model="form.images"                    默认发帖规则
// ImageUploader v-model="avatarList" :limit="1"
// :usage="UploadUsage.AVATAR" :max-mb="AVATAR_MAX_MB"
//
// 【本文件里的语法点（两个都是重点）】
//
// ① defineModel()
// Vue 3.4+ 的"双向绑定"写法，等价于同时声明了 props + emit。
// 父组件写 v-model="form.images"，值就能【双向同步】：
// 上传成功 -> 子组件改 model.value -> 父组件的 form.images 跟着变
// 副作用：defineModel 声明的 prop，父组件直接改值时【不保证】会
// 触发 update:model-value 事件。所以 Settings.vue 里改头像后
// 是用 watch(avatarList, ...) 去保存的，不是监听那个事件。
//
// ② http-request 属性
// 为什么不用 el-upload 自带的 action 属性？
// 因为 action 是"它自己发请求"，那个请求【带不上 Authorization 头】，
// 后端会返回 40100（未携带令牌）。
// 所以改成"自己发"—— 通过 http-request 指定我们的上传函数。
//
// 【前端名词】
// multipart/form-data  上传文件时用的请求格式（普通 JSON 传不了文件）
// v-model              双向绑定：子组件改了，父组件的变量也跟着变
// watch                监听某个数据，它一变就执行回调
// （本文件用它把上传结果同步给父组件）
//

import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadRequestOptions, UploadUserFile } from 'element-plus'
import { uploadFile } from '@/api/file'
import { POST_IMAGE_LIMIT, POST_IMAGE_MAX_MB, UploadUsage } from '@/utils/contract'

// 外面这样用：<ImageUploader v-model="form.images" />
// model 里放的是"上传成功后拿到的图片地址数组"，正好就是 P3 请求体要的 images。
const model = defineModel<string[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    /** 最多几张 */
    limit?: number
    /** 单张最大多少 MB */
    maxMb?: number
    /** 用途，决定后端按哪个尺寸上限校验（文档 F1） */
    usage?: 'avatar' | 'post'
  }>(),
  {
    limit: POST_IMAGE_LIMIT,
    maxMb: POST_IMAGE_MAX_MB,
    usage: UploadUsage.POST,
  },
)

const fileList = ref<UploadUserFile[]>([])

/**
 * 真正发请求的地方（文档 F1）。
 *
 * el-upload 每选中一张图就调一次这个函数；
 * 它的返回值会被 el-upload 存进 file.response 里。
 *
 * 为什么要自己写而不是用 el-upload 的 action？
 *   因为 action 方式发出来的请求带不上我们的 Authorization 头，
 *   后端会返回 40100（未携带令牌）。自己发就能带上。
 */
async function doUpload(options: UploadRequestOptions) {
  const file = options.file

  // 前端先拦一道，省掉一次必然失败的请求。
  // 后端也会再校验一次（41300 文件过大），前端这道只是为了体验。
  if (file.size > props.maxMb * 1024 * 1024) {
    const msg = `图片不能超过 ${props.maxMb}MB`
    ElMessage.error(msg)
    throw new Error(msg)
  }

  return uploadFile(file, props.usage)
}

// fileList 一变（新增 / 删除 / 上传成功）就把已经拿到地址的同步给外面。
// 还在上传中的那一项 response 是空的，会被下面的 filter 过滤掉。
watch(
  fileList,
  (files) => {
    model.value = files
      .map((f) => {
        const res = f.response as { url?: string } | undefined
        return res?.url ?? f.url ?? ''
      })
      .filter((url) => !!url)
  },
  { deep: true },
)
</script>

<template>
  <div>
    <el-upload
      v-model:file-list="fileList"
      list-type="picture-card"
      :limit="props.limit"
      :http-request="doUpload"
      accept="image/*"
    >
      <span class="plus">+</span>
    </el-upload>
    <div class="tip">
      最多 {{ props.limit }} 张，单张不超过 {{ props.maxMb }}MB。
    </div>
  </div>
</template>

<style scoped>
.plus {
  font-size: 24px;
  line-height: 1;
}

.tip {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
