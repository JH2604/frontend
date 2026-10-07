# 校园失物招领前端

歪比巴卜大作业。学生登录后可以发失物或招领、看详情、站内私信；管理员可以在后台删帖。电脑宽屏和手机窄屏是两套页面，请求的是同一套接口。

窗口宽度不超过 768px 时，路由会把地址改到 `/m` 开头。宽屏再自动改回去。管理后台 `/admin` 只在宽屏使用，手机上会回到手机首页。

## 技术栈

| 用途 | 用的东西 |
|---|---|
| 页面 | Vue 3，单文件组件，`<script setup>` |
| 路由 | Vue Router，History 模式，`router.beforeEach` 做登录和角色判断 |
| 登录态 | Pinia，同时写入 `localStorage` |
| 宽屏界面 | Element Plus，中文语言包 |
| 窄屏界面 | `src/mobile` 里自己写的页面和 `mobile.css`，不用 Element Plus 的表格 |
| 语言 | TypeScript |
| 打包 | Vite |
| 请求 | axios，封装在 `src/utils/request.ts` |
| 代码检查 | ESLint、Oxlint、Prettier、`vue-tsc` |

Node 版本要求 `^22.18.0` 或 `>=24.12.0`，见 `package.json` 的 `engines`。

## 本地运行

```bash
npm install
npm run dev
```

开发服务器默认是 `http://localhost:5173`。

`src/mock/index.ts` 里 `USE_MOCK = !import.meta.env.PROD`。`npm run dev` 不是生产构建，接口走内存里的假数据，不用开后端。`npm run build` 打出来的包会关掉假数据，请求发到同域的 `/api`。

开发服务器在 `vite.config.ts` 里把 `/api` 和 `/uploads` 代理到 `http://127.0.0.1:8000`。

假数据登录不校验密码。学号填 3 到 20 位数字就是学生「张三」（用户 id `1001`）。学号填 `admin` 就是管理员（用户 id `9001`）。改密码时，假数据里的原密码是 `abc12345`。绑邮箱时，假验证码固定是 `123456`。

常用命令：

```bash
npm run type-check   # 只做类型检查
npm run build        # 类型检查通过后再打包，产物在 dist/
npm run preview      # 本地预览打包结果
npm run lint         # oxlint 和 eslint
npm run format       # prettier 格式化 src/
```

## 页面

宽屏需要登录的页面都套在 `UserLayout` 里，顶栏是首页、我的发布、消息、联系管理员、用户中心。

| 地址 | 页面 |
|---|---|
| `/login` | 登录、注册 |
| `/` | 全部帖子 |
| `/items/:id` | 帖子详情 |
| `/publish` | 发布 |
| `/my-posts` | 我的发布，可改状态、删除 |
| `/messages` | 消息列表 |
| `/messages/:peerId` | 和某个人的私信 |
| `/users/:id` | 用户主页 |
| `/settings` | 用户中心：头像、主题、邮箱、改密码 |
| `/admins` | 管理员联系方式 |
| `/admin/items` | 管理端帖子列表，角色必须是 `admin` |

窄屏对应地址把前缀换成 `/m`，登录页是 `/m/login`。窄屏没有单独的管理后台页面；管理员删别人的帖时，详情页会多要一句删除理由。

从详情返回列表时，首页、我的发布、消息这三个宽屏页面被 `<keep-alive>` 留着，搜索条件和页码还在。

## 代码怎么串起来

`index.html` 里只有一个 `<div id="app">`，脚本入口是 `src/main.ts`。`main.ts` 创建 Vue 应用，装上 Pinia、路由和 Element Plus，再挂到 `#app`。根组件 `App.vue` 只有一个 `<RouterView />`，当前路由决定显示哪一页。

页面不直接调用 axios。页面调用 `src/api/` 里的函数。这些函数做两件事：开发环境调用 `src/mock/index.ts`，生产环境调用 `http()`。接口返回的字段名是下划线，例如 `avatar_url`、`page_size`。`api` 目录负责改成页面用的驼峰，例如 `avatarUrl`、`pageSize`。下划线字段名只出现在 `src/api/*.ts`、`src/types/api.ts` 的 `Raw*` 类型，以及 mock 数据里。

`src/utils/contract.ts` 放路径、业务码、本地存储的 key、字数限制、状态文案。后端字段名如果要改，先改这个文件和对应的转换函数。

`src/utils/request.ts` 在每个请求上加 `Authorization: Bearer {token}` 和 `X-Client-Platform: web`。成功时业务码 `code === 0`，拦截器只把 `data` 交给调用方。失败时按业务码弹 `ElMessage`。`40101` 用本地的 `refresh_token` 调 `/auth/refresh`，换到新 token 后重发原来的请求，并发的过期请求共用同一次刷新。`40100`、`40103`、`40104` 以及刷新失败会清掉本地登录信息并跳到 `/login`。

登录成功后，`src/stores/user.ts` 的 `setLogin` 把 token、角色、用户名、用户 id 写进内存和 `localStorage`。刷新页面后 store 从 `localStorage` 读回来。路由守卫只看 `localStorage` 里有没有 `token`，不看 Pinia。

主题存在 `localStorage` 的 `theme`，取值 `light`、`dark`、`system`。`src/utils/theme.ts` 在 `<html>` 上切换 `dark` class。宽屏暗色还依赖 `main.ts` 引入的 Element Plus `theme-chalk/dark/css-vars.css`。当前页面改主题只写本地，没有再请求保存接口。

未读数是 `src/utils/unread.ts` 里的一个模块级 `ref`。`UserLayout`、`AdminLayout`、手机壳挂载后每 30 秒拉一次，浏览器标签从后台切回来再拉一次。

## 目录

```
index.html                 页面壳，挂载点 #app
vite.config.ts             Vite：@ 指向 src，开发时代理 /api 和 /uploads
package.json               依赖和 npm scripts
tsconfig.json              类型检查拆成 app 和 node 两份
tsconfig.app.json          浏览器侧源码，路径别名 @/*
tsconfig.node.json         vite.config.ts、eslint.config.ts
env.d.ts                   让 TS 认识 Vite 注入的 import.meta.env
eslint.config.ts           ESLint
.oxlintrc.json             Oxlint
.prettierrc.json           Prettier：无分号、单引号、行宽 100
.editorconfig              缩进 2 空格，换行 LF

src/
  main.ts                  创建应用、初始化主题
  App.vue                  根组件
  assets/main.css          全局字体和颜色变量，含 html.dark
  router/index.ts          路由表、宽窄屏互跳、登录和角色守卫
  stores/user.ts           登录用户
  mock/index.ts            假帖子、假消息、假用户，以及 USE_MOCK
  api/
    auth.ts                登录、注册、退出、解析 JWT
    user.ts                我的资料、改密、验证码、绑定联系方式、别人的主页、管理员列表
    item.ts                帖子列表、详情、发布、改状态、删除
    message.ts             未读数、消息列表、会话、发私信、标已读
    file.ts                上传图片
  types/
    api.ts                 页面用的类型，以及接口原始字段的 Raw* 类型
    table.ts               表格列配置
  utils/
    contract.ts            路径、业务码、枚举、校验、文案
    request.ts             axios 实例和拦截器
    theme.ts               主题
    unread.ts              未读数和轮询
    cache.ts               带过期时间的内存缓存
    format.ts              时间格式化
  layouts/
    UserLayout.vue         宽屏用户端顶栏
    AdminLayout.vue        宽屏管理端侧栏
  components/
    PageTable.vue          搜索栏 + 表格 + 分页
    PostTable.vue          帖子筛选列表，首页和「我的发布」共用
    StatusTag.vue          未找到 / 已找到 / 待认领 / 已认领
    ImageUploader.vue      发帖图片
    UserProfileDialog.vue  点头像弹出的用户信息
  views/
    LoginView.vue
    user/                  列表、详情、发布、我的发布、消息、会话、主页、设置、管理员
    admin/ItemManage.vue   管理端删帖
  mobile/
    device.ts              768px 判断，以及 / 与 /m 地址互转
    context.ts             手机壳提供给子页面的 toast、抽屉、确认框
    MobileShell.vue        手机端已登录后的外壳
    mobile.css             手机端样式
    components/            头像、帖子卡片
    views/                 与 views/ 对应的窄屏页面
```

## 接口路径

下面的路径都挂在 `/api/v1` 后面。

| 方法 | 路径 | 作用 |
|---|---|---|
| POST | `/auth/register` | 注册 |
| POST | `/auth/login` | 登录 |
| POST | `/auth/refresh` | 用 refresh_token 换 access_token |
| POST | `/auth/logout` | 退出 |
| GET | `/users/me` | 我的资料 |
| PATCH | `/users/me` | 改头像、主题、是否接收提醒 |
| PUT | `/users/me/password` | 改密码 |
| POST | `/verification-codes` | 发验证码，场景固定为 `bind_contact` |
| PUT | `/users/me/contact` | 用验证码绑定手机或邮箱 |
| GET | `/users/:id` | 别人的资料。`detail` 里的学号和联系方式只在管理员查看时有值 |
| GET | `/users/admins` | 管理员列表 |
| GET | `/posts` | 帖子列表 |
| POST | `/auth/post` | 发帖。路径是 `/auth/post`，不是 `/posts` |
| GET | `/posts/:id` | 帖子详情 |
| PATCH | `/posts/:id/status` | 把状态改成 `open` 或 `closed` |
| DELETE | `/posts/:id` | 删除。body 里可以带 `reason` |
| POST | `/files` | `multipart/form-data`，字段名 `file` 和 `usage`（`avatar` 或 `post`） |
| GET | `/messages/unread-count` | 未读条数 |
| GET | `/messages` | 消息列表，查询参数 `box`、`is_read`、`page`、`page_size` |
| GET | `/messages/conversations/:peerId` | 和某个人的聊天记录 |
| POST | `/messages` | 发私信 |
| PUT | `/messages/read` | 按消息 id、对方 id，或 `all: true` 标已读 |

统一响应是 `{ code, msg, data }`。`code` 为 `0` 表示成功。其它业务码和中文提示写在 `contract.ts` 的 `BizCode`、`CODE_TEXT`。

帖子类型 `lost` 是失物，`found` 是招领。状态 `open` 进行中，`closed` 已完结。失物的两句文案是「未找到 / 已找到」，招领是「待认领 / 已认领」。

## 写的时候按这个来

缩进 2 个空格，换行用 LF。页面里需要新接口时，在 `src/api/` 加函数，不要在 `.vue` 里 `import axios`。`if (USE_MOCK)` 前面先做参数校验和请求体组装，假数据和真接口走同一套校验。提交前跑 `npm run type-check`。
