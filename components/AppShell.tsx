'use client'

import { startTransition, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { useAuth } from '@/lib/auth'
import { hasLocalStorageData, migrateToSupabase, MIGRATED_KEY } from '@/lib/migrate'
import { getSupabase } from '@/lib/supabase/client'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [bannerError, setBannerError] = useState('')
  const { user } = useAuth()
  const pathname = usePathname()

  useEffect(() => {
    if (!user) return
    try {
      const alreadyMigrated = localStorage.getItem(MIGRATED_KEY) === 'true'
      if (!alreadyMigrated && hasLocalStorageData()) {
        startTransition(() => setShowBanner(true))
      }
    } catch {
      // localStorage unavailable
    }
  }, [user])

  async function handleMigrate() {
    if (!user) return
    setMigrating(true)
    setBannerError('')
    const supabase = getSupabase()
    const { error } = await migrateToSupabase(user.id, supabase)
    if (error) {
      setBannerError(error)
      setMigrating(false)
    } else {
      setShowBanner(false)
      window.location.reload()
    }
  }

  // Auth page: render children without sidebar
  if (pathname.startsWith('/auth')) {
    return <>{children}</>
  }

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 overflow-y-auto min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-10 flex items-center gap-3 h-12 px-4 bg-white/95 backdrop-blur-sm border-b border-zinc-200 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            aria-label="Open navigation"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-zinc-900">Job Search OS</span>
        </div>

        {/* Migration banner */}
        {showBanner && (
          <div className="mx-4 mt-4 lg:mx-6 lg:mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900">Local data detected</p>
              <p className="text-xs text-blue-700 mt-0.5">
                You have job search data stored locally. Migrate it to your account so it syncs across devices.
              </p>
              {bannerError && <p className="text-xs text-red-600 mt-1">{bannerError}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowBanner(false)}
                className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={handleMigrate}
                disabled={migrating}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {migrating ? 'Migrating…' : 'Migrate my data'}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1">{children}</div>
      </div>
    </>
  )
}
