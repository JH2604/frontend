<script setup lang="ts" generic="T">
import type { TableColumn } from '@/types/table'

const props = withDefaults(
  defineProps<{
    columns: TableColumn[]
    data: T[]
    total?: number
    loading?: boolean
  }>(),
  { total: 0, loading: false },
)

const emit = defineEmits<{ search: [] }>()

// v-model:page="query.page" 这样用
const page = defineModel<number>('page', { default: 1 })
const pageSize = defineModel<number>('pageSize', { default: 10 })
</script>

<template>
  <div class="page-table">
    <!-- 有 search 插槽才画搜索栏，页面自己决定放几个输入框 -->
    <el-form v-if="$slots.search" inline @submit.prevent="emit('search')">
      <slot name="search" />
    </el-form>

    <el-table v-loading="props.loading" :data="props.data" border stripe>
      <el-table-column
        v-for="col in props.columns"
        :key="col.prop ?? col.label"
        :prop="col.prop"
        :label="col.label"
        :width="col.width"
        :min-width="col.minWidth"
      >
        <!-- col.slot 有值时，把这一列的渲染权交给页面 -->
        <template v-if="col.slot" #default="scope">
          <slot :name="col.slot" v-bind="scope" />
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="props.total"
      layout="total, prev, pager, next"
      class="pager"
      @current-change="emit('search')"
    />
  </div>
</template>

<style scoped>
.page-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pager {
  justify-content: flex-end;
}
</style>
