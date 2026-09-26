<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import type { ItemType } from '@/types/api'
import type { Category } from '@/api/category'
import { createItem } from '@/api/item'
import { getCategoryList } from '@/api/category'
import ImageUploader from '@/components/ImageUploader.vue'

const router = useRouter()

const formRef = ref<FormInstance>()
const loading = ref(false)
const categories = ref<Category[]>([])

const form = reactive({
  title: '',
  type: 'lost' as ItemType,
  categoryId: undefined as number | undefined,
  description: '',
  images: [] as string[],
  place: '',
  happenTime: '',
})

const rules: FormRules = {
  title: [{ required: true, message: '请填写标题', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  description: [{ required: true, message: '请填写描述', trigger: 'blur' }],
  place: [{ required: true, message: '请填写地点', trigger: 'blur' }],
  happenTime: [{ required: true, message: '请选择时间', trigger: 'change' }],
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await createItem(form)
    ElMessage.success('提交成功，等待管理员审核')
    router.push('/')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  categories.value = await getCategoryList()
})
</script>

<template>
  <el-card>
    <template #header>发布信息</template>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" placeholder="例如：黑色钱包" maxlength="30" show-word-limit />
      </el-form-item>

      <el-form-item label="类型" prop="type">
        <el-radio-group v-model="form.type">
          <el-radio value="lost">我丢了东西</el-radio>
          <el-radio value="found">我捡到东西</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="分类" prop="categoryId">
        <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 220px">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </el-form-item>

      <el-form-item label="地点" prop="place">
        <el-input v-model="form.place" placeholder="例如：图书馆三楼" />
      </el-form-item>

      <el-form-item label="发生时间" prop="happenTime">
        <el-date-picker
          v-model="form.happenTime"
          type="datetime"
          placeholder="选择时间"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
      </el-form-item>

      <el-form-item label="描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="4"
          placeholder="补充特征、联系方式等"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="图片">
        <ImageUploader v-model="form.images" :limit="5" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="loading" @click="handleSubmit">提交</el-button>
        <el-button @click="router.back()">取消</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>
