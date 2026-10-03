<script setup lang="ts">
// =====================================================================
// 发布信息页（对应契约 P3）
// =====================================================================
//
// 【它在哪里】
// router/index.ts:  { path: 'publish', component: Publish }
// 入口：页头右上角的「发布信息」按钮（UserLayout.vue 里 router.push(ROUTE_PUBLISH)）
//
// 【表单字段 -> 契约 P3 请求体的对照】
// 表单变量          发给后端的字段名      说明
// ---------------  -------------------  --------------------------------
// form.type        type                 必填，'lost' 失物 / 'found' 招领
// form.title       title                必填，1~30 字
// form.content     content              必填，1~1000 字
// form.images      images               可选，最多 9 张（走 F1 上传拿 URL）
// form.locationName location.name        必填（后端要的是对象 { name }）
// form.eventTime   event_time           可选，转成 ISO 字符串才发
//
// 注意 form 里的名字和契约字段不是一一对应：
// locationName  -> location: { name }
// eventTime     -> event_time（还要 toIso() 转格式）
// 这些"整理"动作都在 api/item.ts 的 toCreateBody() 里做，页面不管。
//
// 【本文件的语法点】
// reactive({...})        表单字段集中放一个对象（不用写 .value）
// FormInstance/FormRules 表单校验的类型
// rules                  "什么时候校验、校验什么、报什么错"
// trigger: 'blur' 意思是"输入框失焦时校验"
// max / required         Element Plus 内置的校验规则（不用自己写函数）
// toIso(...)             utils/format.ts 的函数，把 Date 转成带时区的字符串
//
// 【一个容易被忽略的细节】
// el-date-picker 的 v-model 拿到的是 Date 对象，不是字符串。
// 直接发给后端会变成 "Wed Oct 01 2026 ..." 这种格式，后端解析不了。
// 所以必须 toIso()。这也是为什么这个文件要 import format.ts。

import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import type { ItemType } from '@/types/api'
import { createItem } from '@/api/item'
import ImageUploader from '@/components/ImageUploader.vue'
import { POST_CONTENT_MAX, POST_TITLE_MAX, ROUTE_HOME } from '@/utils/contract'
import { toIso } from '@/utils/format'

const router = useRouter()

const formRef = ref<FormInstance>()
const loading = ref(false)

// 字段名和契约 P3 一一对应（内部驼峰，发给后端时由 api/item.ts 转成下划线）：
//   type      -> type        必填，lost / found
//   title     -> title       必填，1~30 字
//   content   -> content     必填，1~1000 字
//   images    -> images      可选，最多 9 张
//   location  -> location    必填，这里只填 name；经纬度可选，暂时不做地图选点
//   eventTime -> event_time  可选（所以这次不是必填了）
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

async function handleSubmit() {
  // validate() 通过返回 true，不通过会 reject，这里 catch 成 false
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await createItem({
      type: form.type,
      title: form.title,
      content: form.content,
      images: form.images,
      location: { name: form.locationName },
      // 没填就是 null，api 层会直接不发这个字段
      eventTime: form.eventTime ? toIso(form.eventTime) : null,
    })

    // 组长拍板"不需要先审核后发布"，所以这里直接说发布成功，
    // 不再有"等待管理员审核"那句话。
    ElMessage.success('发布成功')
    router.push(ROUTE_HOME)
  } finally {
    loading.value = false
  }
}
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

      <el-form-item label="图片">
        <ImageUploader v-model="form.images" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="loading" @click="handleSubmit">发布</el-button>
        <el-button @click="router.back()">取消</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>
