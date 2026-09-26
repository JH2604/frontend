// ===== 后端统一返回体!!!注意统一=====
export interface ApiResult<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

// ===== 统一分页 =====
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
