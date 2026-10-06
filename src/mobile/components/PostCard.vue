<script setup lang="ts">
import type { ItemBrief } from '@/types/api'
import { STATUS_TEXT, statusActionText } from '@/utils/contract'
import { fromNow } from '@/utils/format'
import AvatarBadge from './AvatarBadge.vue'

defineProps<{
  item: ItemBrief
  mine?: boolean
}>()

const emit = defineEmits<{
  open: []
  user: []
  status: []
  remove: []
}>()
</script>

<template>
  <div class="card post" @click="emit('open')">
    <h4>
      <span class="tag" :class="item.type">{{ item.type === 'lost' ? '失物' : '招领' }}</span>
      <span v-if="item.status === 'closed'" class="tag closed">
        {{ STATUS_TEXT[item.type].closed }}
      </span>
      {{ item.title }}
    </h4>
    <div class="row" style="align-items: flex-start">
      <div class="preview" style="flex: 1">{{ item.contentPreview }}</div>
      <div v-if="item.coverUrl || item.imageCount" class="img" style="width: 64px; height: 64px">
        <img v-if="item.coverUrl" :src="item.coverUrl" alt="" />
        <template v-else>图片</template>
      </div>
    </div>
    <div class="meta">
      <button type="button" @click.stop="emit('user')">
        <AvatarBadge
          :name="item.author.name"
          :url="item.author.avatarUrl"
          :user-id="item.author.id"
          :size="20"
        />
      </button>
      <span>{{ item.author.name }}</span>
      <span>· {{ fromNow(item.createdAt) }}</span>
      <span class="grow">· 📍{{ item.location.name }}</span>
    </div>
    <div v-if="mine" class="card-actions" @click.stop>
      <button class="primary" type="button" @click="emit('status')">
        {{ statusActionText(item.type, item.status) }}
      </button>
      <button class="danger" type="button" @click="emit('remove')">删除</button>
    </div>
  </div>
</template>
