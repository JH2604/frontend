<script setup lang="ts">
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
