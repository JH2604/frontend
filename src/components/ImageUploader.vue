<script setup lang="ts">
import { ref, watch } from 'vue'
import type { UploadUserFile } from 'element-plus'

// 外面用 v-model="form.images"，拿到的是图片地址数组
const model = defineModel<string[]>({ default: () => [] })

const props = withDefaults(defineProps<{ limit?: number }>(), { limit: 5 })

const fileList = ref<UploadUserFile[]>([])

// fileList 一变，就把里面的图片地址同步给外面
watch(
  fileList,
  (files) => {
    model.value = files.map((f) => f.url ?? (f.raw ? URL.createObjectURL(f.raw) : ''))
  },
  { deep: true },
)
</script>

<template>
  <div>
    <el-upload
      v-model:file-list="fileList"
      list-type="picture-card"
      :auto-upload="false"
      :limit="props.limit"
      accept="image/*"
    >
      <span class="plus">+</span>
    </el-upload>
    <div class="tip">
      最多 {{ props.limit }} 张。现在只做本地预览，后端上传接口好了以后把 :auto-upload 改成 true 并配上 action。
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
