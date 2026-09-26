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
