'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useHotkey } from '@/lib/hotkeys'
import { useAuth } from '@/lib/auth'

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconBriefcase() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  )
}

function IconChat() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconBook() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function IconUpload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function IconFolder() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconBarChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}

function IconSparkle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.88 5.76a1 1 0 0 0 .95.69h6.06l-4.9 3.56a1 1 0 0 0-.36 1.12L17.51 20 12 16.44 6.49 20l1.88-5.87a1 1 0 0 0-.36-1.12L3.11 9.45h6.06a1 1 0 0 0 .95-.69L12 3z" />
    </svg>
  )
}

function IconZap() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconDiscover() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

// ─── Nav structure ────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: 'TRACK',
    items: [
      { label: 'Dashboard', href: '/', icon: <IconGrid />, shortcut: '⌘1' },
      { label: 'Discover Jobs', href: '/discover', icon: <IconDiscover />, shortcut: '' },
      { label: 'Applications', href: '/applications', icon: <IconBriefcase />, shortcut: '⌘2' },
      { label: 'Analytics', href: '/analytics', icon: <IconBarChart />, shortcut: '⌘7' },
    ],
  },
  {
    label: 'PREPARE',
    items: [
      { label: 'Research Notes', href: '/research', icon: <IconBook />, shortcut: '⌘4' },
      { label: 'Resources', href: '/resources', icon: <IconFolder />, shortcut: '⌘5' },
      { label: 'Interviews', href: '/interviews', icon: <IconCalendar />, shortcut: '' },
      { label: 'Outreach', href: '/outreach', icon: <IconUsers />, shortcut: '⌘0' },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { label: 'Copilot', href: '/copilot', icon: <IconZap />, shortcut: '⌘9' },
      { label: 'Email', href: '/email', icon: <IconMail />, shortcut: '' },
      { label: 'Calendar', href: '/calendar', icon: <IconClock />, shortcut: '' },
      { label: 'AI Assistant', href: '/assistant', icon: <IconSparkle />, shortcut: '⌘8' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { label: 'Import CSV', href: '/import', icon: <IconUpload />, shortcut: '⌘6' },
      { label: 'Prompt Library', href: '/prompts', icon: <IconChat />, shortcut: '⌘3' },
      { label: 'Profile', href: '/profile', icon: <IconUser />, shortcut: '' },
    ],
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    router.push('/auth')
  }

  useHotkey('1', () => router.push('/'), { meta: true })
  useHotkey('2', () => router.push('/applications'), { meta: true })
  useHotkey('3', () => router.push('/prompts'), { meta: true })
  useHotkey('4', () => router.push('/research'), { meta: true })
  useHotkey('5', () => router.push('/resources'), { meta: true })
  useHotkey('6', () => router.push('/import'), { meta: true })
  useHotkey('7', () => router.push('/analytics'), { meta: true })
  useHotkey('8', () => router.push('/assistant'), { meta: true })
  useHotkey('9', () => router.push('/copilot'), { meta: true })
  useHotkey('0', () => router.push('/outreach'), { meta: true })

  return (
    <aside
      className={[
        'fixed lg:static inset-y-0 left-0 z-30',
        'w-56 shrink-0 h-full flex flex-col bg-white border-r border-zinc-200',
        'transition-transform duration-200 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}
    >
      {/* Header */}
      <div className="px-4 py-5 border-b border-zinc-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-900 tracking-tight">
          Job Search OS
        </span>
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded text-zinc-400 hover:text-zinc-700 transition-colors"
          aria-label="Close navigation"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-4 overflow-y-auto">
        {NAV_SECTIONS.map(({ label, items }) => (
          <div key={label}>
            <p className="px-3 pb-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              {label}
            </p>
            <div className="flex flex-col gap-0.5">
              {items.map(({ label: itemLabel, href, icon, shortcut }) => {
                const isActive =
                  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="shrink-0">{icon}</span>
                      {itemLabel}
                    </span>
                    {shortcut && (
                      <span
                        className={`text-[10px] font-mono tabular-nums ${
                          isActive ? 'text-blue-400' : 'text-zinc-300'
                        }`}
                      >
                        {shortcut}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-100 space-y-2">
        {user && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-zinc-400 truncate min-w-0">{user.email}</p>
            <button
              onClick={handleSignOut}
              className="shrink-0 text-xs text-zinc-400 hover:text-red-500 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
        <p className="text-xs text-zinc-300">
          <kbd className="font-mono">N</kbd> new &nbsp;·&nbsp;
          <kbd className="font-mono">/</kbd> search
        </p>
      </div>
    </aside>
  )
}
