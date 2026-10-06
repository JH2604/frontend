import { inject, type InjectionKey } from 'vue'
import type { UserMe } from '@/types/api'

export interface MobileConfirmOptions {
  reason?: boolean
  okText?: string
  danger?: boolean
}

export interface MobileBridge {
  toast: (text: string) => void
  openDrawer: () => void
  closeDrawer: () => void
  showUser: (userId: number, postId?: number) => void
  confirm: (text: string, options?: MobileConfirmOptions) => Promise<string | null>
  profile: () => UserMe | null
  reloadProfile: () => Promise<void>
}

export const mobileBridgeKey: InjectionKey<MobileBridge> = Symbol('mobile-bridge')

export function useMobileBridge(): MobileBridge {
  const bridge = inject(mobileBridgeKey)
  if (!bridge) throw new Error('手机端页面需要放在手机壳里')
  return bridge
}
