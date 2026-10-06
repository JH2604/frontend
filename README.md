# 校园失物招领系统 · 前端

浙江工业大学 软件工程大作业 · 失物招领系统前端。

> ## 📖 第一次看这个项目？先读这个
>
> 讲解类文档**不再放在仓库里**，统一放在 `E:\outputs\<日期>\`：
>
> | 文档 | 内容 |
> |---|---|
> | `E:\outputs\2026-10-06\导读-从零看懂这个前端项目.md` | **新人先读这个**：项目结构、Vue 语法、前端术语 |
> | `E:\outputs\2026-10-06\部署说明.md` | 打包与部署、假数据总开关、怎么验证 dist |
>
> 那份导读专门讲**项目结构、Vue 语法、前端术语**，是给"写过算法题但没写过工程项目"的人写的。
> 本 README 只讲技术选型和怎么跑起来。

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
  main.ts        ★ 程序入口（挂载 Vue 应用、初始化主题）
  App.vue        ★ 根组件（只有一个 <RouterView /> 插座）

  api/           每个后端接口封装成一个函数，内含"真接口 / 假数据"分支
    auth.ts        A1~A4 注册/登录/退出/刷新令牌
    user.ts        U1~U7 我的信息/改资料/改密码/验证码/绑联系方式/看别人/管理员列表
    item.ts        P1~P5 帖子列表/详情/发布/删除/改状态
    message.ts     M1~M5 未读数/我的消息/私信记录/发私信/标记已读
    file.ts        F1 图片上传
  assets/         全局样式 + 设计令牌（含暗色主题变量）
  components/     通用组件（PageTable 表格、PostTable 列表面板、StatusTag 状态标签、
                  ImageUploader 图片上传）
  layouts/        两套外壳：用户端 UserLayout、管理端 AdminLayout
  mock/           假数据 + 假接口，总开关 USE_MOCK 在这里
  router/         路由表 + 登录/角色守卫
  stores/         登录态（Pinia）
  types/          接口协议的类型定义（纯声明，运行时不存在）
  utils/
    request.ts    axios 封装：贴 token、拆响应、统一报错、令牌过期自动续期
    contract.ts   契约集中地：接口路径、字段名、业务码、枚举、路由常量
    theme.ts      主题 light / dark / system
    unread.ts     未读消息数的共享状态（菜单小红点）
    cache.ts      带过期时间的内存缓存
    format.ts     时间格式化（相对时间、ISO 8601）
  views/          页面
    LoginView.vue 登录/注册
    user/         用户端：列表、详情、发布、我的发布、消息、聊天、用户主页、
                  用户中心、联系管理员
    admin/        管理端：帖子管理
```

> ⚠️ **契约已经是 v1.1**：评论模块（C1~C3）**已被删除**，消息模块重新编号为 M1~M5。
> 旧文档 `01-API接口文档(1).md` 已作废，别再照它写代码。

## 关键设计说明

### 1. 真假数据一键切换

`src/mock/index.ts` 里的 `USE_MOCK` 是总开关：

- `true`（默认）：接口层走本地假数据，**不连后端也能跑通完整流程**
- `false`：走真实后端接口（`vite.config.ts` 里代理到 `127.0.0.1:8000`）

好处是前后端可以并行开发，页面代码完全不用改。

### 2. 契约集中在 `src/utils/contract.ts`

接口文档和群里的约定还有几处没统一（比如响应提示字段是 `message` 还是 `msg`）。

这些"可能会变"的东西**全部收在 `contract.ts` 一个文件里**，
等 Apifox 上的契约确认之后，只改这一个文件，其它代码不用动。

### 3. 网络层做了四件事

`request.ts` 里：

1. 请求拦截器自动贴 `Authorization: Bearer {token}`
2. 响应拦截器自动"拆壳"（把 `{code, message, data}` 里的 `data` 交给业务代码）
3. 业务错误统一弹提示；`40100 / 40103 / 40104` 自动清登录态并跳登录页
4. `40101`（令牌过期）自动调 A4 刷新令牌并重发原请求，**用户无感**

### 4. 主题（契约 U2 的 theme）

- 实现方式：给 `<html>` 挂 `dark` class，配合 Element Plus 的
  `theme-chalk/dark/css-vars.css`（在 `main.ts` 里 import）
- 自己的设计令牌（`assets/main.css` 里的 `--color-*`）在 `html.dark` 下换成暗色值
- 契约要求"先本地生效再异步保存"，见 `views/user/Settings.vue`

### 5. 缓存与状态保持

- **未读数**：`utils/unread.ts` 是一个模块级 `ref`，菜单小红点和消息页共享它
  （30 秒轮询 + 切回前台补一次，见 `layouts/UserLayout.vue`）
- **列表页**：`UserLayout.vue` 用 `<keep-alive>` 缓存 `ItemList` / `MyPosts` / `Messages`，
  从详情页返回时搜索条件、页码、滚动位置都还在

## 开发约定

- 缩进 2 空格，换行 LF（见根目录 `.editorconfig`）
- 提交前跑一遍 `npm run type-check`
- 新接口一律写在 `src/api/` 下，**不要在页面里直接调 axios**
- 下划线字段名**只允许出现在 `src/api/*.ts`**，页面永远只见驼峰
- 假数据故意写成**下划线的原始形状**，这样转换层在 `USE_MOCK=true` 时也被真跑一遍
- `if (USE_MOCK)` 分叉里，**校验和规范化必须写在分叉之前**（踩过两次）

## 相关文档

> ⚠️ **讲解类文档不放在仓库里**，统一放 `E:\outputs\<日期>\`（当天生成的进当天的文件夹）。
> 仓库里只保留这份 README。

- 接口契约：见团队 Apifox 项目（**最终契约以 Apifox 为准**）
- 项目结构 / 语法 / 术语讲解：`E:\outputs\2026-10-06\导读-从零看懂这个前端项目.md`
- 打包与部署（含"生产构建会跑假数据"的坑）：`E:\outputs\2026-10-06\部署说明.md`
- 契约原文备份 + 各类分析文档：`E:\outputs\`
