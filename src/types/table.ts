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
