<script setup lang="ts">

import { reactive, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import type { ItemType } from '@/types/api'
import { createItem } from '@/api/item'
import ImageUploader from '@/components/ImageUploader.vue'
import { POST_CONTENT_MAX, POST_TITLE_MAX, itemDetailPath } from '@/utils/contract'
import { toIso } from '@/utils/format'

const router = useRouter()

const formRef = ref<FormInstance>()
const loading = ref(false)
const submitted = ref(false)
const uploaderRef = ref<{ uploading: boolean }| null>(null)

const form = reactive({
  type: 'lost' as ItemType,
  title: '',
  content: '',
  locationName: '',
  // el-date-picker 的值默认是 Date 对象；提交时用 toIso() 转成带时区的字符串
  eventTime: null as Date | null,
  images: [] as string[],
})

const rules: FormRules = {
  title: [
    { required: true, message: '请填写标题', trigger: 'blur' },
    { max: POST_TITLE_MAX, message: `标题最多 ${POST_TITLE_MAX} 个字`, trigger: 'blur' },
  ],
  content: [
    { required: true, message: '请填写描述', trigger: 'blur' },
    { max: POST_CONTENT_MAX, message: `描述最多 ${POST_CONTENT_MAX} 个字`, trigger: 'blur' },
  ],
  locationName: [{ required: true, message: '请填写地点', trigger: 'blur' }],
}

function formDirty(){
  return (
    form.title.trim() !== '' ||
    form.content.trim() !== '' ||
    form.locationName.trim() !== '' ||
    form.eventTime !== null ||
    form.images.length > 0 
  )
}
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  if (uploaderRef.value?.uploading) {
    ElMessage.warning('图片还在上传，请稍候')
    return
  }

  if (/1\d{10}/.test(form.content)) {
    try {
      await ElMessageBox.confirm(
        '描述里好像有手机号。请不要填写联系方式，统一通过站内私信联系。仍要发布吗？',
        '提示',
        { type: 'warning', confirmButtonText: '仍要发布', cancelButtonText: '返回修改' },
      )
    } catch {
      return
    }
  }

  loading.value = true
  try {
    const created = await createItem({
      type: form.type,
      title: form.title,
      content: form.content,
      images: form.images,
      location: { name: form.locationName },
      eventTime: form.eventTime ? toIso(form.eventTime) : null,
    })
    submitted.value = true
    ElMessage.success('发布成功')
    router.replace(itemDetailPath(created.id))
  } finally {
    loading.value = false
  }
}

onBeforeRouteLeave(async () => {
  if (submitted.value || !formDirty()) return true
  try {
    await ElMessageBox.confirm('是否放弃编辑？', '离开确认', {
      type: 'warning',
      confirmButtonText: '放弃',
      cancelButtonText: '继续编辑',
    })
    return true
  } catch {
    return false
  }
})
</script>

<template>
  <el-card>
    <template #header>发布信息</template>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="类型" prop="type">
        <el-radio-group v-model="form.type">
          <el-radio value="lost">我丢了东西</el-radio>
          <el-radio value="found">我捡到东西</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="标题" prop="title">
        <el-input
          v-model="form.title"
          placeholder="例如：黑色钱包"
          :maxlength="POST_TITLE_MAX"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="地点" prop="locationName">
        <el-input v-model="form.locationName" placeholder="例如：图书馆三楼" />
      </el-form-item>

      <el-form-item label="丢失/拾到时间" prop="eventTime">
        <el-date-picker
          v-model="form.eventTime"
          type="datetime"
          placeholder="选填，不确定可以不填"
        />
      </el-form-item>

      <el-form-item label="描述" prop="content">
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="4"
          placeholder="补充特征、注意事项等"
          :maxlength="POST_CONTENT_MAX"
          show-word-limit
        />
      </el-form-item>
      <el-alert
          type="info"
          :closable="false"
          title="请不要在描述里填写手机号等联系方式，统一通过站内私信联系"
          show-icon
        />

      <el-form-item label="图片">
        <ImageUploader ref="uploaderRef" v-model="form.images" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="loading" @click="handleSubmit">发布</el-button>
        <el-button @click="router.back()">取消</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>
