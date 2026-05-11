'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { useToast } from '@/lib/toast'
import {
  EMAIL_TYPES,
  EMAIL_TYPE_LABELS,
  EMAIL_TYPE_COLORS,
  EMAIL_TYPE_ICONS,
  EMAIL_STATUSES,
  EMAIL_STATUS_LABELS,
  EMAIL_STATUS_COLORS,
  type EmailMessage,
  type EmailType,
  type EmailStatus,
} from '@/lib/types'
import { parseEmailContent } from '@/lib/emailParser'

// ─── Gmail section ────────────────────────────────────────────────────────────

interface GmailStatus {
  connected: boolean
  gmailAddress?: string
  lastSyncedAt?: string | null
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function GmailSection({ onSynced }: { onSynced: () => void }) {
  const toast = useToast()
  const [status, setStatus] = useState<GmailStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const handledParam = useRef(false)

  // Load connection status
  useEffect(() => {
    fetch('/api/gmail/status')
      .then((r) => r.json())
      .then((data: GmailStatus) => setStatus(data))
      .catch(() => setStatus({ connected: false }))
  }, [])

  // Handle redirect params after OAuth
  useEffect(() => {
    if (handledParam.current) return
    handledParam.current = true

    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const error = params.get('error')

    if (connected === 'true') {
      toast('Gmail connected successfully!', 'success')
      fetch('/api/gmail/status')
        .then((r) => r.json())
        .then((data: GmailStatus) => setStatus(data))
        .catch(() => {})
      // Clean URL
      window.history.replaceState({}, '', '/email')
    } else if (error) {
      const messages: Record<string, string> = {
        gmail_denied: 'Gmail connection was cancelled.',
        token_exchange: 'Failed to connect Gmail — please try again.',
        profile_fetch: 'Could not read your Gmail address — please try again.',
        gmail_not_configured: 'Gmail integration is not configured on this server.',
      }
      toast(messages[error] ?? 'Gmail connection failed.', 'error')
      window.history.replaceState({}, '', '/email')
    }
  }, [toast])

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/gmail/sync', { method: 'POST' })
      const data = await res.json() as { synced?: number; skipped?: number; error?: string }
      if (!res.ok) {
        toast(data.error ?? 'Sync failed.', 'error')
      } else {
        const msg = data.synced === 0
          ? 'No new emails found.'
          : `Synced ${data.synced} new email${data.synced !== 1 ? 's' : ''}.`
        toast(msg, 'success')
        // Refresh last synced time
        fetch('/api/gmail/status')
          .then((r) => r.json())
          .then((s: GmailStatus) => setStatus(s))
          .catch(() => {})
        onSynced()
      }
    } catch {
      toast('Sync failed — check your connection.', 'error')
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await fetch('/api/gmail/disconnect', { method: 'DELETE' })
      setStatus({ connected: false })
      toast('Gmail disconnected.', 'success')
    } catch {
      toast('Failed to disconnect.', 'error')
    } finally {
      setDisconnecting(false)
    }
  }

  if (status === null) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 animate-pulse">
        <div className="h-4 w-40 bg-zinc-100 rounded" />
      </div>
    )
  }

  if (!status.connected) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-500">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900">Connect Gmail</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Auto-import recruiting emails and classify them with AI.
            </p>
          </div>
        </div>
        <a
          href="/api/gmail/connect"
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          Connect Gmail
        </a>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-5 py-3.5 flex items-center gap-4">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <div className="min-w-0">
          <span className="text-sm font-medium text-zinc-900">{status.gmailAddress}</span>
          {status.lastSyncedAt ? (
            <span className="ml-2 text-xs text-zinc-400">
              Last synced {relativeTime(status.lastSyncedAt)}
            </span>
          ) : (
            <span className="ml-2 text-xs text-zinc-400">Never synced</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-50 transition-colors"
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={syncing ? 'animate-spin' : ''}
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="px-3 py-1.5 text-xs text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          Disconnect
        </button>
      </div>
    </div>
  )
}

// ─── Ingest panel ─────────────────────────────────────────────────────────────

interface IngestPanelProps {
  jobs: ReturnType<typeof useStore>['jobs']
  onAdd: (email: Omit<EmailMessage, 'id' | 'createdAt' | 'updatedAt'>) => void
}

function IngestPanel({ jobs, onAdd }: IngestPanelProps) {
  const [raw, setRaw] = useState('')
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ReturnType<typeof parseEmailContent> | null>(null)
  const [stage, setStage] = useState<'input' | 'confirm'>('input')
  // Editable fields in confirm stage
  const [emailType, setEmailType] = useState<EmailType>('other')
  const [company, setCompany] = useState('')
  const [subject, setSubject] = useState('')
  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [receivedAt, setReceivedAt] = useState('')
  const [detectedAction, setDetectedAction] = useState('')
  const [relatedJobId, setRelatedJobId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => setRaw((ev.target?.result as string) ?? '')
    reader.readAsText(file)
  }

  function handleParse() {
    if (!raw.trim()) return
    const result = parseEmailContent(raw, fileName || undefined)
    setParsed(result)
    setEmailType(result.emailType)
    setCompany(result.company)
    setSubject(result.subject)
    setSenderName(result.senderName)
    setSenderEmail(result.senderEmail)
    setReceivedAt(result.receivedAt)
    setDetectedAction(result.detectedAction)
    setRelatedJobId('')
    setStage('confirm')
  }

  function handleSave() {
    if (!parsed) return
    onAdd({
      body: parsed.body || raw,
      emailType,
      company: company || undefined,
      subject: subject || undefined,
      senderName: senderName || undefined,
      senderEmail: senderEmail || undefined,
      receivedAt: receivedAt || undefined,
      detectedAction: detectedAction || undefined,
      detectedInterviewDate: parsed.detectedInterviewDate,
      detectedDeadline: parsed.detectedDeadline,
      relatedJobId: relatedJobId || undefined,
      status: 'unread',
    })
    setRaw('')
    setFileName('')
    setParsed(null)
    setStage('input')
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleBack() { setStage('input'); setParsed(null) }

  const field = 'w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white'
  const labelCls = 'block text-xs font-medium text-zinc-500 mb-1'

  if (stage === 'confirm' && parsed) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Review Parsed Email</h2>
          <button onClick={handleBack} className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">← Back</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Email Type</label>
            <select value={emailType} onChange={(e) => setEmailType(e.target.value as EmailType)} className={field}>
              {EMAIL_TYPES.map((t) => <option key={t} value={t}>{EMAIL_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Company</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Stripe" className={field} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Sender Name</label>
            <input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Alex Chen" className={field} />
          </div>
          <div>
            <label className={labelCls}>Sender Email</label>
            <input value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="recruiter@company.com" className={field} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={field} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Received Date</label>
            <input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className={field} />
          </div>
          <div>
            <label className={labelCls}>Link to Job</label>
            <select value={relatedJobId} onChange={(e) => setRelatedJobId(e.target.value)} className={field}>
              <option value="">None</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.company} — {j.role}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Detected Action</label>
          <input value={detectedAction} onChange={(e) => setDetectedAction(e.target.value)} className={field} />
        </div>

        {(parsed.detectedInterviewDate || parsed.detectedDeadline) && (
          <div className="flex gap-3 text-xs">
            {parsed.detectedInterviewDate && (
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                📅 Interview date: {parsed.detectedInterviewDate}
              </span>
            )}
            {parsed.detectedDeadline && (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">
                ⏰ Deadline: {parsed.detectedDeadline}
              </span>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={handleBack} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Save Email</button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Add Email Manually</h2>
        <span className="text-xs text-zinc-400">Paste content or upload .txt / .eml</span>
      </div>

      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={6}
        placeholder={'Paste the full email here — headers + body, or just the body...\n\nFrom: recruiter@stripe.com\nSubject: Interview invitation\n\nHi, we\'d love to schedule an interview...'}
        className="w-full px-3 py-2.5 text-sm font-mono rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none text-zinc-700 placeholder-zinc-400"
      />

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 cursor-pointer transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          {fileName || 'Upload file'}
          <input ref={fileRef} type="file" accept=".txt,.eml" onChange={handleFile} className="hidden" />
        </label>
        {fileName && <span className="text-xs text-zinc-500 truncate max-w-[160px]">{fileName}</span>}
        <div className="flex-1" />
        <button
          onClick={handleParse}
          disabled={!raw.trim()}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          Parse & Review →
        </button>
      </div>
    </div>
  )
}

// ─── Email card ───────────────────────────────────────────────────────────────

interface EmailCardProps {
  email: EmailMessage
  jobs: ReturnType<typeof useStore>['jobs']
  onUpdate: (id: string, patch: Partial<Omit<EmailMessage, 'id' | 'createdAt'>>) => void
  onDelete: (id: string) => void
  onAddEvent: ReturnType<typeof useStore>['addEvent']
}

function EmailCard({ email, jobs, onUpdate, onDelete, onAddEvent }: EmailCardProps) {
  const router = useRouter()
  const toast = useToast()
  const [showBody, setShowBody] = useState(false)
  const [linkJob, setLinkJob] = useState(false)
  const [classifying, setClassifying] = useState(false)

  function handleCreateEvent() {
    const date = email.detectedInterviewDate ?? email.detectedDeadline ?? email.receivedAt
    if (!date) return
    onAddEvent({
      title: email.subject ?? `${email.company} — ${EMAIL_TYPE_LABELS[email.emailType]}`,
      eventType: email.emailType === 'interview_invite' ? 'interview'
        : email.emailType === 'oa_link' ? 'oa_due'
        : 'other',
      company: email.company,
      relatedJobId: email.relatedJobId,
      startDateTime: date,
      status: 'upcoming',
    })
    onUpdate(email.id, { status: 'action_taken' })
  }

  function handleReply() {
    const params = new URLSearchParams({ task: 'draft_email_reply', emailId: email.id })
    if (email.relatedJobId) params.set('jobId', email.relatedJobId)
    router.push(`/assistant?${params.toString()}`)
  }

  async function handleClassify() {
    setClassifying(true)
    try {
      const res = await fetch('/api/gmail/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId: email.id }),
      })
      const data = await res.json() as { result?: { emailType: string; company: string; detectedAction: string; detectedInterviewDate: string | null; detectedDeadline: string | null }; error?: string }
      if (!res.ok || !data.result) {
        toast(data.error ?? 'Classification failed', 'error')
      } else {
        onUpdate(email.id, {
          emailType: data.result.emailType as EmailMessage['emailType'],
          company: data.result.company || email.company,
          detectedAction: data.result.detectedAction || undefined,
          detectedInterviewDate: data.result.detectedInterviewDate || undefined,
          detectedDeadline: data.result.detectedDeadline || undefined,
        })
        toast('Email re-classified', 'success')
      }
    } catch {
      toast('Classification failed — check your connection', 'error')
    } finally {
      setClassifying(false)
    }
  }

  const linkedJob = jobs.find((j) => j.id === email.relatedJobId)
  const isUnread = email.status === 'unread'

  return (
    <div className={`rounded-xl border bg-white p-4 space-y-3 transition-colors ${isUnread ? 'border-blue-200 bg-blue-50/20' : 'border-zinc-200'}`}>
      {/* Top row */}
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">{EMAIL_TYPE_ICONS[email.emailType]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {email.subject ? (
              <p className="text-sm font-semibold text-zinc-900 leading-snug truncate max-w-md">{email.subject}</p>
            ) : (
              <p className="text-sm font-semibold text-zinc-400 italic">No subject</p>
            )}
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${EMAIL_TYPE_COLORS[email.emailType]}`}>
              {EMAIL_TYPE_LABELS[email.emailType]}
            </span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${EMAIL_STATUS_COLORS[email.status]}`}>
              {EMAIL_STATUS_LABELS[email.status]}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 flex-wrap">
            {email.company && <span className="font-medium text-zinc-700">{email.company}</span>}
            {email.senderName && <span>· {email.senderName}</span>}
            {email.senderEmail && <span className="text-zinc-400">&lt;{email.senderEmail}&gt;</span>}
            {email.receivedAt && <span className="text-zinc-400 ml-auto">{email.receivedAt}</span>}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-0.5">
          <button onClick={() => onDelete(email.id)} title="Delete" className="p-1.5 rounded-lg text-zinc-300 hover:text-red-600 hover:bg-red-50 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Detected action */}
      {email.detectedAction && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400">Action:</span>
          <span className="font-medium text-zinc-700">{email.detectedAction}</span>
        </div>
      )}

      {/* Detected dates */}
      {(email.detectedInterviewDate || email.detectedDeadline) && (
        <div className="flex gap-2 text-xs flex-wrap">
          {email.detectedInterviewDate && (
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
              📅 Interview: {email.detectedInterviewDate}
            </span>
          )}
          {email.detectedDeadline && (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
              ⏰ Deadline: {email.detectedDeadline}
            </span>
          )}
        </div>
      )}

      {/* Linked job */}
      {(linkedJob || linkJob) && (
        <div className="text-xs">
          {linkJob ? (
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Link to job:</span>
              <select
                value={email.relatedJobId ?? ''}
                onChange={(e) => { onUpdate(email.id, { relatedJobId: e.target.value || undefined }); setLinkJob(false) }}
                autoFocus
                className="flex-1 px-2 py-1 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">None</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.company} — {j.role}</option>)}
              </select>
              <button onClick={() => setLinkJob(false)} className="text-zinc-400 hover:text-zinc-600">✕</button>
            </div>
          ) : linkedJob && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              {linkedJob.company} — {linkedJob.role}
              <button onClick={() => onUpdate(email.id, { relatedJobId: undefined })} className="ml-1 text-zinc-400 hover:text-zinc-700">✕</button>
            </span>
          )}
        </div>
      )}

      {/* Body snippet toggle */}
      <button onClick={() => setShowBody((v) => !v)} className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
        {showBody ? '▲ Hide body' : '▼ Show body'}
      </button>
      {showBody && (
        <pre className="text-xs text-zinc-600 font-mono whitespace-pre-wrap leading-relaxed bg-zinc-50 rounded-lg p-3 max-h-48 overflow-y-auto border border-zinc-100">
          {email.body}
        </pre>
      )}

      {/* Quick actions */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        {!linkedJob && (
          <button onClick={() => setLinkJob(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-600 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 transition-colors">
            🔗 Link Job
          </button>
        )}
        {(email.detectedInterviewDate || email.detectedDeadline) && (
          <button onClick={handleCreateEvent} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-600 bg-zinc-50 hover:bg-blue-50 hover:text-blue-700 border border-zinc-200 hover:border-blue-200 transition-colors">
            📅 Create Event
          </button>
        )}
        <button onClick={handleReply} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-600 bg-zinc-50 hover:bg-violet-50 hover:text-violet-700 border border-zinc-200 hover:border-violet-200 transition-colors">
          ✍️ Generate Reply
        </button>
        <button onClick={handleClassify} disabled={classifying} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-600 bg-zinc-50 hover:bg-amber-50 hover:text-amber-700 border border-zinc-200 hover:border-amber-200 transition-colors disabled:opacity-50">
          {classifying ? '⏳ Classifying…' : '🤖 Re-classify'}
        </button>
        {email.status === 'unread' && (
          <button onClick={() => onUpdate(email.id, { status: 'processed' })} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-600 bg-zinc-50 hover:bg-emerald-50 hover:text-emerald-700 border border-zinc-200 hover:border-emerald-200 transition-colors">
            ✓ Mark Processed
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Summary bar ──────────────────────────────────────────────────────────────

function SummaryBar({ emails }: { emails: EmailMessage[] }) {
  const counts: Partial<Record<EmailType, number>> = {}
  let unread = 0
  for (const e of emails) {
    counts[e.emailType] = (counts[e.emailType] ?? 0) + 1
    if (e.status === 'unread') unread++
  }

  const highlights: EmailType[] = ['offer', 'interview_invite', 'rejection', 'oa_link']

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${unread > 0 ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-500'}`}>
        {unread} unread
      </span>
      {highlights.map((t) => counts[t] ? (
        <span key={t} className={`px-2.5 py-1 rounded-full text-xs font-medium ${EMAIL_TYPE_COLORS[t]}`}>
          {EMAIL_TYPE_ICONS[t]} {counts[t]} {EMAIL_TYPE_LABELS[t]}
        </span>
      ) : null)}
      <span className="text-xs text-zinc-400 ml-auto">{emails.length} total</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmailPage() {
  const { jobs, emails, ready, addEmail, updateEmail, deleteEmail, addEvent } = useStore()
  const [filterCompany, setFilterCompany] = useState('')
  const [filterType, setFilterType] = useState<EmailType | ''>('')
  const [filterStatus, setFilterStatus] = useState<EmailStatus | ''>('')
  // Increment to force email list refresh after sync
  const [syncTick, setSyncTick] = useState(0)

  const filtered = useMemo(() => {
    void syncTick
    const q = filterCompany.trim().toLowerCase()
    return emails.filter((e) => {
      if (q && !(e.company ?? '').toLowerCase().includes(q) && !(e.subject ?? '').toLowerCase().includes(q)) return false
      if (filterType && e.emailType !== filterType) return false
      if (filterStatus && e.status !== filterStatus) return false
      return true
    })
  }, [emails, filterCompany, filterType, filterStatus, syncTick])

  const allCompanies = useMemo(() => [...new Set(emails.map((e) => e.company).filter(Boolean))].sort() as string[], [emails])
  const hasFilters = filterCompany !== '' || filterType !== '' || filterStatus !== ''

  if (!ready) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-36 bg-zinc-100 rounded animate-pulse" />
        {[0, 1, 2].map((i) => <div key={i} className="h-28 bg-zinc-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Email Intelligence</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {emails.length === 0
            ? 'Connect Gmail to auto-import recruiting emails, or paste one below.'
            : `${emails.length} email${emails.length !== 1 ? 's' : ''} tracked.`}
        </p>
      </div>

      {/* Gmail connection */}
      <GmailSection onSynced={() => setSyncTick((n) => n + 1)} />

      {/* Manual ingest panel */}
      <IngestPanel jobs={jobs} onAdd={addEmail} />

      {/* Summary bar */}
      {emails.length > 0 && <SummaryBar emails={emails} />}

      {/* Filters */}
      {emails.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              list="email-company-filter"
              placeholder="Filter by company…"
              className="pl-8 pr-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-44"
            />
            <datalist id="email-company-filter">
              {allCompanies.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as EmailType | '')}
            className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            {EMAIL_TYPES.map((t) => <option key={t} value={t}>{EMAIL_TYPE_LABELS[t]}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as EmailStatus | '')}
            className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            {EMAIL_STATUSES.map((s) => <option key={s} value={s}>{EMAIL_STATUS_LABELS[s]}</option>)}
          </select>
          {hasFilters && (
            <button onClick={() => { setFilterCompany(''); setFilterType(''); setFilterStatus('') }} className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Email list */}
      {emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-200 rounded-xl">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <p className="text-base font-medium text-zinc-600">No emails yet</p>
          <p className="text-sm text-zinc-400 mt-1 max-w-xs">
            Connect Gmail above to auto-sync, or paste an email and click &ldquo;Parse &amp; Review&rdquo;.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-10">No emails match the current filters.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((email) => (
            <EmailCard
              key={email.id}
              email={email}
              jobs={jobs}
              onUpdate={updateEmail}
              onDelete={deleteEmail}
              onAddEvent={addEvent}
            />
          ))}
        </div>
      )}
    </div>
  )
}
