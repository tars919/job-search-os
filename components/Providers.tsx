'use client'

import { StoreProvider } from '@/lib/store'
import { ToastProvider } from '@/lib/toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <ToastProvider>{children}</ToastProvider>
    </StoreProvider>
  )
}
