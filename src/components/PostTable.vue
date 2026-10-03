<script setup lang="ts">
//
// =====================================================================
// 帖子列表面板（首页和"我的发布"共用）
// =====================================================================
//
// 【它在哪里】
// views/user/ItemList.vue      用 PostTable           -> 全部帖子
// views/user/MyPosts.vue       用 PostTable + mine    -> 只看我发布的
// 两个页面的区别【只有一个 mine 参数】，其余完全一样，所以抽成这个零件。
//
// 【父组件只有一行，是这样的】
// ItemList.vue 里：    PostTable
// MyPosts.vue 里：     PostTable mine
//
// mine 没写值 = 传了 true（HTML 属性简写，等价 :mine="true"）。
// 完全不传时，子组件用 withDefaults 给的默认值 false。
//
// 【本文件里的语法点（列表页的标配，几乎每页都这么写）】
// defineProps + withDefaults   声明参数 + 给默认值（C++ 的默认参数）
// reactive({...})              一组相关的响应式数据放在一个对象里
// 用它就不用写 .value（对比 ref 必须写 .value）
// async / await                等请求回来
// try / catch / finally        固定三件套：
// try     拿数据
// catch   出错也要让界面有东西显示（别白屏）
// finally 无论成败都要关掉 loading
// onMounted(fetchList)         页面"出生"时自动拉一次
// onActivated(...)             被 keep-alive 缓存后，第二次进来走这个
// 而不是 onMounted
// defineOptions({ name })      给组件起名 —— 必须和 UserLayout 里
// keep-alive 的 :include 数组里的字符串完全一致，
// 否则缓存不生效（而且不报错，很难查）
//
// 【"制表"式渲染：一行数据 -> 一行的各个格子】
// columns 数组声明"这个表格有哪些列"，PageTable 照着它画；
// 每个格子里的内容由插槽决定（本文件在模板里给了 #type / #status / ...）。
//

import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ItemBrief, ItemStatus, ItemType } from '@/types/api'
import type { TableColumn } from '@/types/table'
import { deleteItem, getItemList, updateItemStatus } from '@/api/item'
import PageTable from '@/components/PageTable.vue'
import StatusTag from '@/components/StatusTag.vue'
import {
  PAGE_SIZE_DEFAULT,
  itemDetailPath,
  nextStatus,
  statusActionText,
} from '@/utils/contract'
import { formatDateTime, fromNow } from '@/utils/format'
// =====================================================================
// 帖子列表面板
//
// 首页（ItemList.vue）和"我的发布"（MyPosts.vue）除了"查全部 / 只查自己"
// 这一个差别之外，其它完全一样。所以把整张表格抽成这个组件，
// 两个页面各写一行 <PostTable /> / <PostTable mine /> 就够了。
//
// 这就是前端最常用的复用手段：props 传差异，其余共用。
// C++ 类比：把重复代码抽成一个带默认参数的函数，两个调用点只传不同的那个参数。
// =====================================================================
const props = withDefaults(defineProps<{ mine?: boolean }>(), { mine: false })

const router = useRouter()

const loading = ref(false)
const total = ref(0)
const list = ref<ItemBrief[]>([])

const query = reactive({
  page: 1,
  pageSize: PAGE_SIZE_DEFAULT,
  keyword: '',
  type: 'all' as ItemType | 'all',
  status: 'all' as ItemStatus | 'all',
  order: 'desc' as 'asc' | 'desc',
})

const typeOptions: { label: string; value: ItemType | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '失物', value: 'lost' },
  { label: '招领', value: 'found' },
]

// v1.1 把状态文案写清楚了（第 1.7 节）：失物帖说"未找到 / 已找到"，
// 招领帖说"待认领 / 已认领"。这里是"全部状态"筛选，
// 所以只用两边都说得通的"进行中 / 已完结"。
const statusOptions: { label: string; value: ItemStatus | 'all' }[] = [
  { label: '全部状态', value: 'all' },
  { label: '进行中', value: 'open' },
  { label: '已完结', value: 'closed' },
]

// ⚠️ 这里原来有一个"排序"下拉框（最新发布 / 最多评论），v1.1 之后【删掉了】。
//
// 为什么必须删？因为 P1 的 `sort_by` 参数在 v1.1 里被整个移除：
//   v1.0：sort_by = created_at | comment_count
//   v1.1：（没有这个参数了），只保留 order = asc | desc
// 而 comment_count 字段本身也随评论模块一起被删了。
//
// 如果留着这个下拉框：用户选了"最多评论"，请求里带上 sort_by=comment_count，
// 后端要么忽略（用户觉得"选了没反应"），要么报 40000。
// 按交接说明第 9 节第 6 条：知道后端一定会忽略/拒绝的操作，前端不要给入口。

// 一份列描述，PageTable 照着画表格。
// 列只列契约 P1 真的会返回的字段，不要写 happenTime / category 这些不存在的。
const columns = computed<TableColumn[]>(() => [
  { prop: 'title', label: '标题', minWidth: 180 },
  { label: '类型', width: 90, slot: 'type' },
  { label: '地点', width: 150, slot: 'location' },
  { label: '发布时间', width: 170, slot: 'createdAt' },
  { label: '状态', width: 100, slot: 'status' },
  { label: '操作', width: props.mine ? 280 : 90, slot: 'action' },
])

async function fetchList() {
  loading.value = true
  try {
    const res = await getItemList({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword,
      type: query.type,
      status: query.status,
      order: query.order,
      // mine 为 true 时后端只返回"我发布的"（文档 P1 的 mine 参数）
      mine: props.mine,
    })
    list.value = res.list
    total.value = res.total
  } catch {
    // 错误提示已经在 utils/request.ts 的拦截器里统一弹过了。
    // 这里只负责"别让页面白屏"：失败就把列表清空。
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  fetchList()
}

function handleReset() {
  query.keyword = ''
  query.type = 'all'
  query.status = 'all'
  query.order = 'desc'
  handleSearch()
}
async function handleToggleStatus(row: ItemBrief)
{
  const next =nextStatus(row.status)
  const actionText = statusActionText(row.type, row.status)
  try {
    await ElMessageBox.confirm(`确定把「${row.title}」${actionText}吗？`, '确认',{
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消',
    })
  } catch{
    return
  }
  try {
    const res = await updateItemStatus(row.id, next)
    row.status = res.status
    row.closedAt = res.closedAt
    ElMessage.success(`已${actionText}`)
    if (query.status !== 'all') fetchList()
  } catch {
    // 错误提示已经在 utils/request.ts 的拦截器里统一弹
  }
}

async function handleDeleteRow(row: ItemBrief) {
  try {
    await ElMessageBox.confirm(
      `确定要删除「${row.title}」吗？删掉就找不回来了。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await deleteItem(row.id)
    ElMessage.success('已删除')
    if (list.value.length === 1 && query.page > 1) query.page -= 1
    fetchList()
  } catch {
    // 错误提示已经由拦截器弹出
  }
}


onMounted(fetchList)

// 被 keep-alive 缓存之后，第二次进入本页不会再触发 onMounted，而是触发 onActivated。
// 这时重新拉一次数据，保证看到的是最新的（比如刚发布完帖子回来），
// 同时搜索条件和页码仍然保留着。
// 第一次激活要跳过，因为那一次 onMounted 已经拉过了。
let activatedOnce = false
onActivated(() => {
  if (activatedOnce) fetchList()
  activatedOnce = true
})
</script>

<template>
  <PageTable
    v-model:page="query.page"
    v-model:page-size="query.pageSize"
    :columns="columns"
    :data="list"
    :total="total"
    :loading="loading"
    @search="fetchList"
  >
    <template #search>
      <el-form-item label="关键词">
        <el-input
          v-model="query.keyword"
          placeholder="搜标题 / 正文 / 地点"
          clearable
          style="width: 200px"
          @keyup.enter="handleSearch"
        />
      </el-form-item>

      <el-form-item label="类型">
        <el-radio-group v-model="query.type" @change="handleSearch">
          <el-radio-button v-for="o in typeOptions" :key="o.value" :value="o.value">
            {{ o.label }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="状态">
        <el-select v-model="query.status" style="width: 130px" @change="handleSearch">
          <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>

      <el-form-item v-if="props.mine" label="排序">
        <el-select v-model="query.order" style="width: 140px" @change="handleSearch">
          <el-option label="最新在前" value="desc" />
          <el-option label="最早在前" value="asc" />
        </el-select>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </template>

    <template #type="{ row }">
      <el-tag :type="row.type === 'lost' ? 'danger' : 'success'">
        {{ row.type === 'lost' ? '失物' : '招领' }}
      </el-tag>
    </template>

    <template #location="{ row }">
      {{ row.location?.name || '—' }}
    </template>

    <!-- 相对时间："3小时前" 比 "2026-09-19 14:00" 更好扫。
         鼠标悬停能看到精确时间（title 属性），不牺牲准确性。 -->
    <template #createdAt="{ row }">
      <span :title="formatDateTime(row.createdAt)">{{ fromNow(row.createdAt) }}</span>
    </template>

    <template #status="{ row }">
      <StatusTag :status="row.status" :item-type="row.type" />
    </template>

    <template #action="{ row }">
      <el-button link type="primary" @click="router.push(itemDetailPath(row.id))">详情</el-button>
      <template v-if="props.mine">
        <el-button link type="primary" @click="handleToggleStatus(row)">
          {{ statusActionText(row.type, row.status) }}
        </el-button>
        <el-button link type="danger" @click="handleDeleteRow(row)">删除</el-button>
      </template>
    </template>
  </PageTable>
</template>
