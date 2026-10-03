// =====================================================================
// 表格列的描述（一个很小的类型文件，但能说明"配置驱动渲染"的思路）
//
// 【它在哪里】
//   components/PageTable.vue     读这个类型来画表格的列
//   components/PostTable.vue     写一份 TableColumn[] 传给 PageTable
//   views/admin/ItemManage.vue   同上（管理端那张表）
//
// 【它解决的问题】
//   不同列表页的列完全不一样（有的要 ID 列、有的要"发布人"列），
//   但"表格怎么画"是同一套逻辑。
//   所以做法是：页面只【声明】自己有哪些列，PageTable 负责照单渲染。
//
//     const columns: TableColumn[] = [
//       { prop: 'title', label: '标题', minWidth: 180 },
//       { label: '类型', width: 90, slot: 'type' },   // slot 表示"这列我自己渲染"
//     ]
//
//   这就是"配置驱动"：把变化的部分写成数据（数组），把不变的部分写成代码。
//   C++ 类比：把差异做成一个表（常量数组），而不是写 if/else 分支。
//
// 【本文件的语法点】
//   interface        描述"一个对象应该长什么样"（struct 的声明）
//   ?:               可选属性（这个字段可以不给）
//   number | string  联合类型（宽度既可以是 120，也可以是 '120px'）
//   // 注释           TS 里用 //，也可以用 /* */（本文件用的是 //）

// 表格列的描述。每个列表页只要写一份这样的数组，就能喂给 PageTable 组件
export interface TableColumn {
  // 对应数据里的字段名，比如 'title'
  prop?: string
  // 表头显示的文字
  label: string
  // 固定宽度
  width?: number | string
  // 最小宽度（内容长时自动撑开）
  minWidth?: number | string
  // 这一列要自定义渲染时填一个插槽名字，页面里用 template #那个名字 来写
  slot?: string
}
