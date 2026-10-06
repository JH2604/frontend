<script setup lang="ts">

import { computed,ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadRequestOptions, UploadUserFile } from 'element-plus'
import { uploadFile } from '@/api/file'
import { POST_IMAGE_LIMIT, POST_IMAGE_MAX_MB, UploadUsage } from '@/utils/contract'

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
const uploading = computed(() => fileList.value.some((file) => file.status === 'uploading'))

defineExpose({ uploading })

async function doUpload(options: UploadRequestOptions) {
  const file = options.file
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    const msg = '只支持 JPEG / PNG / WebP'
    ElMessage.error(msg)
    throw new Error(msg)
  }

  if (file.size > props.maxMb * 1024 * 1024) {
    const msg = `图片不能超过 ${props.maxMb}MB`
    ElMessage.error(msg)
    throw new Error(msg)
  }

  return uploadFile(file, props.usage)
}

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
      accept="image/jpeg,image/png,image/webp"
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
