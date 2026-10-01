# 校园失物招领系统 · 前端

浙江工业大学 软件工程大作业 · 失物招领系统前端。

## 技术栈

| 项 | 选型 |
|---|---|
| 框架 | Vue 3（`<script setup>` 组合式 API） |
| 路由 | Vue Router（History 模式 + 路由守卫） |
| 状态管理 | Pinia |
| UI 组件库 | Element Plus（中文语言包） |
| 语言 | TypeScript（`vue-tsc` 做类型检查） |
| 构建 | Vite |
| 请求 | axios（统一封装在 `src/utils/request.ts`） |

## 快速开始

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器，默认 http://localhost:5173
npm run type-check   # 只做类型检查
npm run build    # 类型检查 + 打包
npm run preview  # 预览打包结果
```

## 目录结构

```
src/
  api/          每个后端接口封装成一个函数，内含"真接口 / 假数据"分支
  assets/       全局样式 + 设计令牌
  components/   通用组件（PageTable 表格、StatusTag 状态标签、ImageUploader 图片上传）
  layouts/      两套外壳：用户端 UserLayout、管理端 AdminLayout
  mock/         假数据 + 假接口，总开关 USE_MOCK 在这里
  router/       路由表 + 登录/角色守卫
  stores/       登录态（Pinia）
  types/        接口协议的类型定义
  utils/
    request.ts   axios 封装：贴 token、拆响应、统一报错
    contract.ts  契约集中地：字段名、业务码、分页等"待确认项"全在这一个文件
    cache.ts     带过期时间的内存缓存（分类列表在用）
    format.ts    时间格式化（相对时间、ISO 8601）
  views/        页面
    user/       用户端：列表、详情、发布、我的认领
    admin/      管理端：发布审核、认领审核、物品管理
```

## 关键设计说明

### 1. 真假数据一键切换

`src/mock/index.ts` 里的 `USE_MOCK` 是总开关：

- `true`（默认）：接口层走本地假数据，**不连后端也能跑通完整流程**
- `false`：走真实后端接口

好处是前后端可以并行开发，页面代码完全不用改。

### 2. 契约集中在 `src/utils/contract.ts`

接口文档和群里的约定还有几处没统一（比如响应提示字段是 `message` 还是 `msg`、
分页字段是 `page_size` 还是 `pageSize`、业务码表以哪份为准）。

这些"可能会变"的东西**全部收在 `contract.ts` 一个文件里**，
等 Apifox 上的契约确认之后，只改这一个文件，其它代码不用动。

### 3. 网络层做了兼容处理

`request.ts` 里有三件事：

1. 请求拦截器自动贴 `Authorization: Bearer {token}`
2. 响应拦截器自动"拆壳"（把 `{code, message, data}` 里的 `data` 交给业务代码）
3. 业务错误统一弹提示；`40100 / 40103 / 40104` 自动清登录态并跳登录页

### 4. 缓存策略

- **分类列表**：`utils/cache.ts` 做了 30 分钟缓存，并且做了"请求去重"
  （同一个 key 并发请求只会真正发一次）
- **列表页**：`UserLayout.vue` 用 `<keep-alive>` 缓存 `ItemList`，
  从详情页返回时搜索条件、页码、滚动位置都还在

## 开发约定

- 缩进 2 空格，换行 LF（见根目录 `.editorconfig`）
- 提交前跑一遍 `npm run type-check`
- 新接口一律写在 `src/api/` 下，不要在页面里直接调 axios

## 相关文档

- 接口文档：见团队 Apifox 项目（最终契约以 Apifox 为准）
- 群内约定：见 `docs/` 目录
