<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { Item } from '@/types/api'
import { getItemDetail } from '@/api/item'
import StatusTag from '@/components/StatusTag.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const detail = ref<Item | null>(null)

async function fetchDetail() {
  loading.value = true
  try {
    detail.value = await getItemDetail(Number(route.params.id))
  } catch (err) {
    detail.value = null
    ElMessage.error(err instanceof Error ? err.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function handleClaim() {
  ElMessage.success('认领申请已提交（Mock）')
}

onMounted(fetchDetail)
</script>

<template>
  <div v-loading="loading" class="detail">
    <el-page-header content="物品详情" @back="router.back()" />

    <el-card v-if="detail">
      <div class="head">
        <h2 class="title">{{ detail.title }}</h2>
        <div class="tags">
          <el-tag :type="detail.type === 'lost' ? 'danger' : 'success'">
            {{ detail.type === 'lost' ? '失物' : '招领' }}
          </el-tag>
          <StatusTag :status="detail.status" />
        </div>
      </div>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="地点">{{ detail.place }}</el-descriptions-item>
        <el-descriptions-item label="发生时间">{{ detail.happenTime }}</el-descriptions-item>
        <el-descriptions-item label="发布时间">{{ detail.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="编号">{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">
          {{ detail.description }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="actions">
        <el-button type="primary" @click="handleClaim">我要认领</el-button>
      </div>
    </el-card>

    <el-empty v-else-if="!loading" description="没有找到这条信息" />
  </div>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.title {
  margin: 0;
}

.tags {
  display: flex;
  gap: 8px;
}

.actions {
  margin-top: 16px;
  text-align: right;
}
</style>
