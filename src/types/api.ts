// ===== 后端统一返回体!!!注意统一=====
// 提示字段现在有两个名字在打架：
//   - 接口文档 1.4 写的是 message
//   - 群里 10/1 15:37 拍板"就 msg 哈"
// 所以两个都留着可选，真正的取值逻辑在 src/utils/contract.ts 的 pickMessage()。
// TODO[Apifox]：确认后把多余的那个删掉
export interface ApiResult<T = unknown> {
  code: number;
  /** 接口文档 1.4 的字段名 */
  message?: string;
  /** 群里 10/1 拍板的字段名 */
  msg?: string;
  data: T;
}

// ===== 统一分页 =====
// 前端内部统一用 pageSize（驼峰）。
// 后端文档 1.5 用的是 page_size（下划线），所以 api 层会用
// contract.ts 里的 normalizePageResult() 转一道，两种都能吃。
export interface PageQuery {
  page: number;
  pageSize: number;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ===== 物品实体 =====
export type ItemType = "lost" | "found";
export type ItemStatus = "pending" | "published" | "rejected" | "closed";

export interface Item {
  id: number;
  title: string;
  type: ItemType;
  categoryId: number;
  description: string;
  images: string[];
  place: string;
  happenTime: string;
  status: ItemStatus;
  userId: number;
  createdAt: string;
}

export interface ItemQuery extends PageQuery {
  keyword?: string;
  categoryId?: number;
  type?: ItemType;
  status?: ItemStatus;
}

// ===== 认领模块 =====
export type ClaimStatus = "pending" | "approved" | "rejected";

export interface Claim {
  id: number;
  itemId: number;
  // 冗余存一份标题，列表里不用再回头查物品
  itemTitle: string;
  userId: number;
  username: string;
  // 联系方式（手机号 / 微信 / QQ）
  contact: string;
  // 申请人补充的说明
  message: string;
  status: ClaimStatus;
  createdAt: string;
}

export interface ClaimQuery extends PageQuery {
  status?: ClaimStatus;
  itemId?: number;
}
