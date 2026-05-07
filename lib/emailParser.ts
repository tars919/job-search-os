import type { EmailType } from './types'

// ─── EML header extraction ────────────────────────────────────────────────────

function extractHeader(raw: string, header: string): string {
  const re = new RegExp(`^${header}:\\s*(.+)$`, 'im')
  const m = raw.match(re)
  return m ? m[1].trim() : ''
}

// Parse "From: Name <email@example.com>" or "From: email@example.com"
function parseFrom(from: string): { name: string; email: string } {
  const angleMatch = from.match(/^(.*?)\s*<([^>]+)>/)
  if (angleMatch) {
    return {
      name: angleMatch[1].replace(/^["']|["']$/g, '').trim(),
      email: angleMatch[2].trim(),
    }
  }
  return { name: '', email: from.trim() }
}

// Normalise "Date:" header or fallback to today
function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0]
  return d.toISOString().split('T')[0]
}

export function parseEmlHeaders(raw: string): {
  senderName: string
  senderEmail: string
  subject: string
  receivedAt: string
  body: string
} {
  // EML body starts after the first blank line
  const blankLine = raw.search(/\n\r?\n/)
  const headers = blankLine > -1 ? raw.slice(0, blankLine) : raw
  const body = blankLine > -1 ? raw.slice(blankLine).trim() : ''

  const from = parseFrom(extractHeader(headers, 'From'))
  const subject = extractHeader(headers, 'Subject')
  const date = parseDate(extractHeader(headers, 'Date'))

  // Strip quoted-printable soft line breaks and encoded words
  const cleanBody = body
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/=\?[^?]+\?[BQ]\?[^?]*\?=/gi, '')

  return {
    senderName: from.name,
    senderEmail: from.email,
    subject,
    receivedAt: date,
    body: cleanBody || raw,
  }
}

// ─── Email type classification ────────────────────────────────────────────────

const TYPE_PATTERNS: Array<{ type: EmailType; patterns: RegExp[] }> = [
  {
    type: 'offer',
    patterns: [
      /\boffer\b.*\bjob\b/i,
      /\bwe('re| are) (pleased|excited|happy|delighted) to offer\b/i,
      /\bformal offer\b/i,
      /\boffer letter\b/i,
      /\bcompensation package\b/i,
    ],
  },
  {
    type: 'interview_invite',
    patterns: [
      /\binterview\b.*\bschedul/i,
      /\bschedul\w+.*\binterview\b/i,
      /\binterview (invite|invitation)\b/i,
      /\bwe('d| would) like to (invite|meet|speak with) you\b/i,
      /\bvideo (call|interview|screen)\b/i,
      /\bplease (select|choose|pick) a time\b/i,
      /\bcalendly\b/i,
      /\bgoodtime\b/i,
    ],
  },
  {
    type: 'rejection',
    patterns: [
      /\bwe('ve| have) decided (not to|to move forward with other)\b/i,
      /\bwe will not be moving forward\b/i,
      /\bnot (selected|chosen|moving forward)\b/i,
      /\bpursu(e|ing) other candidates\b/i,
      /\bthank you for (your interest|applying|taking the time).*\bhowever\b/i,
      /\bwe have filled the (position|role)\b/i,
      /\bregret to (inform|let you know)\b/i,
      /\bnot (a|the right) fit\b/i,
    ],
  },
  {
    type: 'oa_link',
    patterns: [
      /\bonline assessment\b/i,
      /\bcoding (challenge|assessment|test)\b/i,
      /\bhackerrank\b/i,
      /\bcodility\b/i,
      /\bhirevue\b/i,
      /\bpymetrics\b/i,
      /\bkarat\b/i,
      /\bcodesignal\b/i,
      /\bcomplete (the|this|your) (assessment|test|challenge)\b/i,
      /\bdeadline.*\b(assessment|test|challenge)\b/i,
    ],
  },
  {
    type: 'recruiter_reply',
    patterns: [
      /\bthank you for (applying|your application|your interest)\b/i,
      /\bwe received your (application|resume)\b/i,
      /\byour application (is|has been) (received|under review|being reviewed)\b/i,
      /\bwe'll be in touch\b/i,
      /\bexcited (about|to learn about) your background\b/i,
      /\bwould love to (connect|chat|learn more)\b/i,
    ],
  },
  {
    type: 'follow_up',
    patterns: [
      /\bfollowing up\b/i,
      /\bjust (checking|wanted to check) in\b/i,
      /\bany update(s)? on\b/i,
      /\bcircling back\b/i,
    ],
  },
  {
    type: 'networking',
    patterns: [
      /\bnetwork(ing)?\b/i,
      /\bconnect on linkedin\b/i,
      /\binformational (interview|chat|call)\b/i,
      /\bcoffee chat\b/i,
    ],
  },
]

export function guessEmailType(subject: string, body: string): EmailType {
  const text = `${subject} ${body}`
  for (const { type, patterns } of TYPE_PATTERNS) {
    if (patterns.some((p) => p.test(text))) return type
  }
  return 'other'
}

// ─── Company extraction ───────────────────────────────────────────────────────

export function extractCompany(senderEmail: string, subject: string, body: string): string {
  // Try sender domain first
  const domainMatch = senderEmail.match(/@([\w-]+)\.(com|io|ai|co|org|net|edu)/)
  if (domainMatch) {
    const domain = domainMatch[1]
    const skip = new Set(['gmail', 'yahoo', 'hotmail', 'outlook', 'icloud', 'proton', 'mail'])
    if (!skip.has(domain.toLowerCase())) {
      return domain.charAt(0).toUpperCase() + domain.slice(1)
    }
  }

  // Try to extract "at [Company]" or "[Company] team" patterns from subject/body
  const atMatch = (subject + ' ' + body.slice(0, 500)).match(
    /(?:at|from|with|join)\s+([A-Z][A-Za-z0-9&.\s-]{1,30})(?:\s+team|\s+recruiting|\s+talent|\.|,|!|\?|$)/
  )
  if (atMatch) return atMatch[1].trim()

  return ''
}

// ─── Date extraction ──────────────────────────────────────────────────────────

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec'

function toIso(day: string, monthStr: string, year: string): string | null {
  const monthMap: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    january: 1, february: 2, march: 3, april: 4, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  }
  const m = monthMap[monthStr.toLowerCase()]
  if (!m) return null
  const y = year ? parseInt(year) : new Date().getFullYear()
  const d = parseInt(day)
  if (isNaN(d) || isNaN(y)) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function extractInterviewDate(body: string): string | undefined {
  // "Monday, May 12" / "May 12, 2026" / "12 May 2026"
  const patterns = [
    new RegExp(`(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\\s+(${MONTHS})\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?`, 'i'),
    new RegExp(`(${MONTHS})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`, 'i'),
    new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS})(?:,?\\s+(\\d{4}))?`, 'i'),
  ]

  for (const re of patterns) {
    const m = body.match(re)
    if (m) {
      // figure out which group is month vs day
      const isMonthFirst = isNaN(Number(m[1]))
      const month = isMonthFirst ? m[1] : m[2]
      const day = isMonthFirst ? m[2] : m[1]
      const year = m[3] ?? ''
      const iso = toIso(day, month, year)
      if (iso) return iso
    }
  }

  // MM/DD/YYYY or MM/DD
  const slashMatch = body.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?\b/)
  if (slashMatch) {
    const y = slashMatch[3]
      ? (slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3])
      : String(new Date().getFullYear())
    return `${y}-${slashMatch[1].padStart(2, '0')}-${slashMatch[2].padStart(2, '0')}`
  }

  return undefined
}

export function extractDeadline(body: string): string | undefined {
  const deadlineCtx = body.match(
    /(?:deadline|due|expires?|by|complete by|submit by)[:\s]+([^\n.!?]{3,40})/i,
  )
  if (!deadlineCtx) return undefined
  return extractInterviewDate(deadlineCtx[1])
}

// ─── Detected action text ─────────────────────────────────────────────────────

export function detectAction(type: EmailType, subject: string, body: string): string {
  switch (type) {
    case 'interview_invite':
      return 'Schedule / confirm interview'
    case 'rejection':
      return 'Log rejection, update pipeline'
    case 'oa_link':
      return 'Complete online assessment'
    case 'offer':
      return 'Review offer details'
    case 'recruiter_reply':
      return 'Reply to recruiter'
    case 'follow_up':
      return 'Send follow-up response'
    case 'networking':
      return 'Connect and reply'
    default: {
      if (/reply|respond/i.test(subject + body)) return 'Reply to email'
      return 'Review and process'
    }
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export interface ParsedEmail {
  senderName: string
  senderEmail: string
  subject: string
  body: string
  emailType: EmailType
  company: string
  detectedAction: string
  detectedInterviewDate?: string
  detectedDeadline?: string
  receivedAt: string
}

export function parseEmailContent(raw: string, fileName?: string): ParsedEmail {
  const isEml = fileName?.endsWith('.eml') || /^(From|Subject|Date|To|MIME-Version):/im.test(raw.slice(0, 500))

  let senderName = ''
  let senderEmail = ''
  let subject = ''
  let body = raw
  let receivedAt = new Date().toISOString().split('T')[0]

  if (isEml) {
    const parsed = parseEmlHeaders(raw)
    senderName = parsed.senderName
    senderEmail = parsed.senderEmail
    subject = parsed.subject
    body = parsed.body
    receivedAt = parsed.receivedAt
  }

  const emailType = guessEmailType(subject, body)
  const company = extractCompany(senderEmail, subject, body)
  const detectedAction = detectAction(emailType, subject, body)
  const detectedInterviewDate = emailType === 'interview_invite' ? extractInterviewDate(body) : undefined
  const detectedDeadline = emailType === 'oa_link' ? extractDeadline(body) : undefined

  return {
    senderName,
    senderEmail,
    subject,
    body,
    emailType,
    company,
    detectedAction,
    detectedInterviewDate,
    detectedDeadline,
    receivedAt,
  }
}
