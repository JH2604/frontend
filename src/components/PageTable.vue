<script setup lang="ts" generic="T">
//
// =====================================================================
// 通用"搜索栏 + 表格 + 分页"面板（零件中的零件）
// =====================================================================
//
// 【它在哪里】
// components/PostTable.vue           -> 首页 / 我的发布
// views/admin/ItemManage.vue         -> 管理端帖子管理
// 这两个"列表页"长得几乎一样（搜索栏 + 表格 + 分页），
// 所以把这三样抽成本文件；它们只管提供"列有哪些、数据是什么"。
//
// 【这个文件是学三个高级语法的好地方】
//
// ① 泛型组件：script 标签上写 generic="T"
// 表格要显示的数据类型由调用方决定（帖子、消息、用户……），
// 所以这里用泛型 T 占位。C++ 类比：template <typename T>。
// 注意这是写在【标签属性位置】上的泛型，是 Vue 特有的写法。
//
// ② 具名插槽 + 作用域插槽（slot）
// 问题：不同列表的"搜索栏"完全不一样，但表格和分页是一样的。
// 怎么只复用后两样？答案：留洞让父组件填。
//
// 子组件（本文件）：
// el-form v-if="$slots.search"      <- 父组件给了 search 才画搜索栏
// slot name="search"
// slot :name="col.slot" v-bind="scope"   <- 动态名字的插槽
//
// 父组件（PostTable.vue）：
// PageTable ...
// template #search    搜索栏的 HTML
// template #type="{ row }"    这一列的渲染
//
// | 名词 | 意思 |
// |---|---|
// | 插槽（slot） | 子组件里的"洞"，父组件往洞里塞内容 |
// | 具名插槽 | 有名字的洞（name="search"），父组件用 #search 填 |
// | 作用域插槽 | 子组件把变量（scope / row）从洞里"递出去"给父组件用 |
// | $slots.search | 判断"父组件到底有没有填这个洞" |
//
// ③ 双向绑定的 prop：defineModel('page', ...)
// 父组件写 v-model:page="query.page"，
// 子组件里分页器一翻页，父组件的 query.page 自动跟着变。
// 等价于"声明了一个 prop + 一个 emit"，是 Vue 3.4+ 的简写。
//
// 【props / emit 的对照（父子的两个方向）】
// 父 -> 子：:columns / :data / :total / :loading   （传数据）
// 子 -> 父：@search   <- emit('search') 喊的那一声  （通知"该重新加载了"）
// 双向   ：v-model:page / v-model:page-size
//
// 【C++ 类比】
// 组件 + 插槽 ≈ 一个函数 + 函数指针参数：
// 函数负责通用流程，具体细节由调用方（父组件）传进来。
//

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
