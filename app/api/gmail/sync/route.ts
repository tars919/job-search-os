import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

// ─── Token management ─────────────────────────────────────────────────────────

interface GmailTokenRow {
  access_token: string
  refresh_token: string | null
  token_expiry: string
}

async function getValidToken(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string,
): Promise<{ token: string } | { error: string }> {
  const { data, error } = await supabase
    .from('gmail_tokens')
    .select('access_token, refresh_token, token_expiry')
    .eq('user_id', userId)
    .single()

  if (error || !data) return { error: 'Gmail not connected. Please connect your Gmail account first.' }
  const row = data as GmailTokenRow

  if (new Date(row.token_expiry).getTime() - Date.now() < 5 * 60 * 1000) {
    if (!row.refresh_token) return { error: 'Gmail session expired. Please reconnect your account.' }

    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: row.refresh_token,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
      }),
    })

    if (!refreshRes.ok) {
      const body = await refreshRes.text()
      console.error('[gmail/sync] token refresh failed:', refreshRes.status, body)
      return { error: 'Could not refresh Gmail access. Please reconnect your account.' }
    }

    const refreshed = await refreshRes.json() as { access_token: string; expires_in: number }
    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()

    await supabase.from('gmail_tokens').update({
      access_token: refreshed.access_token,
      token_expiry: newExpiry,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId)

    return { token: refreshed.access_token }
  }

  return { token: row.access_token }
}

// ─── Gmail API helpers ────────────────────────────────────────────────────────

interface GmailMessageRef { id: string }

type ListResult =
  | { messages: GmailMessageRef[] }
  | { error: string }

async function listMessages(token: string, maxResults = 25): Promise<ListResult> {
  const q = encodeURIComponent(
    'newer_than:60d is:inbox (subject:interview OR subject:offer OR subject:rejected OR subject:rejection OR subject:assessment OR subject:"coding challenge" OR subject:"take home" OR subject:"online assessment" OR subject:"application received" OR subject:"application status" OR from:recruiting OR from:recruiter OR from:talent OR from:hiring OR from:hr OR from:noreply@lever.co OR from:noreply@greenhouse.io OR from:jobs-noreply@linkedin.com OR from:do-not-reply@workday.com OR from:noreply@smartrecruiters.com OR from:noreply@jobvite.com OR from:noreply@myworkday.com)',
  )
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=${maxResults}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })

  if (res.status === 401) return { error: 'Gmail access revoked. Please reconnect your account.' }
  if (!res.ok) return { error: `Gmail API error (${res.status}). Try again in a moment.` }

  const data = await res.json() as { messages?: GmailMessageRef[] }
  return { messages: data.messages ?? [] }
}

interface GmailHeader { name: string; value: string }
interface GmailPart {
  mimeType: string
  body?: { data?: string }
  parts?: GmailPart[]
}
interface GmailMessage {
  id: string
  payload?: {
    headers?: GmailHeader[]
    mimeType?: string
    body?: { data?: string }
    parts?: GmailPart[]
  }
}

function decodeBase64Url(data: string): string {
  try {
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

function extractTextFromParts(parts: GmailPart[]): string {
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return decodeBase64Url(part.body.data)
    }
  }
  for (const part of parts) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      return decodeBase64Url(part.body.data).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    }
    if (part.parts) {
      const nested = extractTextFromParts(part.parts)
      if (nested) return nested
    }
  }
  return ''
}

function extractBody(msg: GmailMessage): string {
  const payload = msg.payload
  if (!payload) return ''
  if (payload.body?.data) return decodeBase64Url(payload.body.data)
  if (payload.parts) return extractTextFromParts(payload.parts)
  return ''
}

function getHeader(msg: GmailMessage, name: string): string {
  return msg.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

// Fetch messages in chunks to avoid Gmail API rate limits
async function fetchMessages(token: string, refs: GmailMessageRef[], chunkSize = 5): Promise<GmailMessage[]> {
  const results: GmailMessage[] = []
  for (let i = 0; i < refs.slice(0, 20).length; i += chunkSize) {
    const chunk = refs.slice(i, i + chunkSize)
    const fetched = await Promise.all(
      chunk.map(async (r) => {
        const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${r.id}?format=full`
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return null
        return res.json() as Promise<GmailMessage>
      }),
    )
    results.push(...fetched.filter(Boolean) as GmailMessage[])
  }
  return results
}

// ─── From header parsing ──────────────────────────────────────────────────────

function parseFrom(from: string): { name: string; email: string } {
  const m = from.match(/^(.*?)\s*<([^>]+)>/)
  if (m) return { name: m[1].replace(/^["']|["']$/g, '').trim(), email: m[2].trim() }
  return { name: '', email: from.trim() }
}

function safeDate(dateStr: string, fallback: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return fallback
    return d.toISOString().split('T')[0]
  } catch {
    return fallback
  }
}

// ─── AI batch classification ──────────────────────────────────────────────────

interface EmailInput {
  index: number
  from: string
  subject: string
  snippet: string
}

interface ClassificationResult {
  index: number
  emailType: string
  company: string
  detectedAction: string
  detectedInterviewDate: string | null
  detectedDeadline: string | null
}

const VALID_TYPES = new Set([
  'offer', 'interview_invite', 'rejection', 'oa_link',
  'recruiter_reply', 'follow_up', 'networking', 'other',
])

const AI_TIMEOUT_MS = 20_000

async function classifyEmails(inputs: EmailInput[]): Promise<ClassificationResult[]> {
  if (!process.env.ANTHROPIC_API_KEY || inputs.length === 0) return []

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `Classify these recruiting emails for a job seeker. Return ONLY a valid JSON array — no markdown, no explanation.

Each item: { "index": <number>, "emailType": "<type>", "company": "<name or empty string>", "detectedAction": "<1 sentence>", "detectedInterviewDate": "<YYYY-MM-DD or null>", "detectedDeadline": "<YYYY-MM-DD or null>" }

emailType must be one of: offer, interview_invite, rejection, oa_link, recruiter_reply, follow_up, networking, other

Emails:
${JSON.stringify(inputs)}`

  try {
    const message = await Promise.race([
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI classification timed out')), AI_TIMEOUT_MS),
      ),
    ])

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const start = raw.indexOf('[')
    const end = raw.lastIndexOf(']')
    if (start === -1 || end === -1) return []

    const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown[]
    return (parsed as ClassificationResult[]).filter(
      (r) => typeof r.index === 'number' && VALID_TYPES.has(r.emailType),
    )
  } catch (err) {
    console.error('[gmail/sync] AI classification failed:', err)
    return []
  }
}

// ─── Company extraction from domain ──────────────────────────────────────────

function domainCompany(email: string): string {
  const m = email.match(/@([\w-]+)\.(com|io|ai|co|org|net|edu)/)
  if (!m) return ''
  const skip = new Set([
    'gmail', 'yahoo', 'hotmail', 'outlook', 'icloud', 'proton', 'mail',
    'lever', 'greenhouse', 'workday', 'smartrecruiters', 'jobvite', 'myworkday', 'linkedin',
  ])
  if (skip.has(m[1].toLowerCase())) return ''
  return m[1].charAt(0).toUpperCase() + m[1].slice(1)
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: 'Gmail integration is not configured on this server.' }, { status: 503 })
  }

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tokenResult = await getValidToken(supabase, user.id)
  if ('error' in tokenResult) {
    return NextResponse.json({ error: tokenResult.error }, { status: 400 })
  }
  const token = tokenResult.token

  const listResult = await listMessages(token, 25)
  if ('error' in listResult) {
    return NextResponse.json({ error: listResult.error }, { status: 502 })
  }
  const refs = listResult.messages

  const now = new Date().toISOString()
  const todayStr = now.split('T')[0]

  if (refs.length === 0) {
    await supabase.from('gmail_tokens').update({ last_synced_at: now, updated_at: now }).eq('user_id', user.id)
    return NextResponse.json({ synced: 0, skipped: 0, total: 0 })
  }

  // Skip already-imported message IDs
  const gmailIds = refs.map((r) => r.id)
  const { data: existing } = await supabase
    .from('emails')
    .select('gmail_message_id')
    .eq('user_id', user.id)
    .in('gmail_message_id', gmailIds)

  const existingIds = new Set(
    ((existing ?? []) as { gmail_message_id: string }[]).map((r) => r.gmail_message_id),
  )
  const newRefs = refs.filter((r) => !existingIds.has(r.id))

  if (newRefs.length === 0) {
    await supabase.from('gmail_tokens').update({ last_synced_at: now, updated_at: now }).eq('user_id', user.id)
    return NextResponse.json({ synced: 0, skipped: refs.length, total: refs.length })
  }

  // Fetch full messages in chunks
  const messages = await fetchMessages(token, newRefs)

  // Build AI classification inputs (body truncated for context window efficiency)
  const inputs: EmailInput[] = messages.map((msg, i) => ({
    index: i,
    from: getHeader(msg, 'From'),
    subject: getHeader(msg, 'Subject'),
    snippet: extractBody(msg).replace(/\s+/g, ' ').trim().slice(0, 1200),
  }))

  const classifications = await classifyEmails(inputs)
  const classMap = new Map(classifications.map((c) => [c.index, c]))

  const rows = messages.map((msg, i) => {
    const cls = classMap.get(i)
    const fromRaw = getHeader(msg, 'From')
    const { name: senderName, email: senderEmail } = parseFrom(fromRaw)
    const subject = getHeader(msg, 'Subject')
    const receivedAt = safeDate(getHeader(msg, 'Date'), todayStr)
    const body = extractBody(msg).slice(0, 8000)
    const company = cls?.company || domainCompany(senderEmail)

    return {
      user_id: user.id,
      gmail_message_id: msg.id,
      sender_name: senderName || null,
      sender_email: senderEmail || null,
      subject: subject || null,
      body: body || inputs[i]?.snippet || '',
      email_type: cls?.emailType ?? 'other',
      company: company || null,
      detected_action: cls?.detectedAction || null,
      detected_interview_date: cls?.detectedInterviewDate || null,
      detected_deadline: cls?.detectedDeadline || null,
      received_at: receivedAt,
      status: 'unread',
      created_at: now,
      updated_at: now,
    }
  })

  const { error: insertError } = await supabase.from('emails').insert(rows)

  if (insertError) {
    console.error('[gmail/sync] insert failed:', insertError)
    return NextResponse.json({ error: 'Failed to save emails. Please try again.' }, { status: 500 })
  }

  await supabase.from('gmail_tokens').update({ last_synced_at: now, updated_at: now }).eq('user_id', user.id)

  return NextResponse.json({
    synced: rows.length,
    skipped: refs.length - newRefs.length,
    total: refs.length,
  })
}
