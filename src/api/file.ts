import { http } from '@/utils/request'

import { USE_MOCK, delay, mockUploadFile } from '@/mock'
import {
  API_FILES_PATH,
  UPLOAD_FILE_FIELD,
  UPLOAD_USAGE_FIELD,
  UploadUsage,
} from '@/utils/contract'

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

  const form = new FormData()
  form.append(UPLOAD_FILE_FIELD, file)
  form.append(UPLOAD_USAGE_FIELD, usage)

  return http<UploadedFile>({
    url: API_FILES_PATH,
    method: 'post',
    data: form,

    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
