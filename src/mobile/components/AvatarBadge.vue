<script setup lang="ts">
const COLORS = ['#3370ff', '#f5a623', '#00b578', '#7b61ff', '#f54a45', '#13c2c2']

const props = withDefaults(
  defineProps<{
    name?: string
    url?: string
    userId?: number
    size?: number
    dot?: boolean
  }>(),
  { name: '', url: '', userId: 0, size: 36, dot: false },
)

const color = COLORS[Math.abs(props.userId) % COLORS.length]
</script>

<template>
  <span
    class="avatar"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${size * 0.42}px`,
      background: url ? 'transparent' : color,
    }"
  >
    <img v-if="url" :src="url" alt="" />
    <template v-else>{{ name.slice(0, 1) || '?' }}</template>
    <i v-if="dot" class="dot"></i>
  </span>
</template>
