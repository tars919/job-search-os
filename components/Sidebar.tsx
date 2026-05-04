'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useHotkey } from '@/lib/hotkeys'

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

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: <IconGrid />, shortcut: '⌘1' },
  { label: 'Applications', href: '/applications', icon: <IconBriefcase />, shortcut: '⌘2' },
  { label: 'Prompt Library', href: '/prompts', icon: <IconChat />, shortcut: '⌘3' },
  { label: 'Research Notes', href: '/research', icon: <IconBook />, shortcut: '⌘4' },
  { label: 'Import CSV', href: '/import', icon: <IconUpload />, shortcut: '⌘5' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  useHotkey('1', () => router.push('/'), { meta: true })
  useHotkey('2', () => router.push('/applications'), { meta: true })
  useHotkey('3', () => router.push('/prompts'), { meta: true })
  useHotkey('4', () => router.push('/research'), { meta: true })
  useHotkey('5', () => router.push('/import'), { meta: true })

  return (
    <aside className="w-56 shrink-0 h-full flex flex-col bg-white border-r border-zinc-200">
      <div className="px-4 py-5 border-b border-zinc-100">
        <span className="text-sm font-semibold text-zinc-900 tracking-tight">
          Job Search OS
        </span>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ label, href, icon, shortcut }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="shrink-0">{icon}</span>
                {label}
              </span>
              <span className={`text-[10px] font-mono tabular-nums ${isActive ? 'text-blue-400' : 'text-zinc-300'}`}>
                {shortcut}
              </span>
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-3 border-t border-zinc-100">
        <p className="text-xs text-zinc-400">
          <kbd className="font-mono">N</kbd> new &nbsp;·&nbsp;
          <kbd className="font-mono">/</kbd> search &nbsp;·&nbsp;
          <kbd className="font-mono">Esc</kbd> close
        </p>
      </div>
    </aside>
  )
}
