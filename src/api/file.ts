import { http } from '@/utils/request'
import { USE_MOCK, delay, mockUploadFile } from '@/mock'
import {
  API_FILES_PATH,
  UPLOAD_FILE_FIELD,
  UPLOAD_USAGE_FIELD,
  UploadUsage,
} from '@/utils/contract'

/**
 * 上传（文档 F1）：POST /api/v1/files
 *
 * 请求是 multipart/form-data，两个字段：
 *   file  —— 文件本身
 *   usage —— 用途，avatar（头像，≤2MB）/ post（帖子配图，≤5MB）
 *
 * 为什么不用 el-upload 自带的 action 直接传？
 *   因为它不会自动带上我们的 Authorization 头，也不方便带 usage。
 *   所以改成"自己发请求"，把这个函数交给 el-upload 的 http-request。
 */

export interface UploadedFile {
  url: string
  width: number
  height: number
  size: number
}

export function uploadFile(
  file: File,
  usage: 'avatar' | 'post' = UploadUsage.POST,
): Promise<UploadedFile> {
  if (USE_MOCK) {
    return delay(300).then(() => mockUploadFile(file))
  }

  // FormData 就是浏览器版的"多部分表单"，用来装二进制文件
  const form = new FormData()
  form.append(UPLOAD_FILE_FIELD, file)
  form.append(UPLOAD_USAGE_FIELD, usage)

  return http<UploadedFile>({
    url: API_FILES_PATH,
    method: 'post',
    data: form,
    // 让浏览器自己带 boundary，手写 'multipart/form-data' 会把 boundary 弄丢
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
