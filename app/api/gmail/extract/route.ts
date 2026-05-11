import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

interface ExtractedJob {
  company: string
  role: string
  location: string | null
  url: string | null
  status: string
  salaryRange: string | null
  notes: string | null
}

const VALID_STATUSES = new Set([
  'saved', 'researching', 'ready_to_apply', 'applied',
  'oa', 'hirevue', 'recruiter_screen', 'interview', 'final_round',
  'offer', 'rejected', 'closed',
])

async function extractJobFromEmail(
  subject: string,
  from: string,
  body: string,
): Promise<ExtractedJob | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `Extract job application details from this recruiting email. Return ONLY a valid JSON object — no markdown, no explanation.

Fields:
{
  "company": "<company name, never empty>",
  "role": "<job title/role, never empty>",
  "location": "<city/state/remote or null>",
  "url": "<job posting URL if mentioned, or null>",
  "status": "<one of: applied|oa|recruiter_screen|interview|final_round|offer|rejected>",
  "salaryRange": "<salary range if mentioned, or null>",
  "notes": "<1-2 sentence summary of key details, or null>"
}

Status rules:
- applied: application received/acknowledged
- oa: online assessment or coding challenge mentioned
- recruiter_screen: recruiter wants to chat/phone screen
- interview: interview scheduled or invitation
- final_round: final round or panel interview
- offer: job offer extended
- rejected: not moving forward, position filled

Email:
From: ${from}
Subject: ${subject}
Body: ${body.slice(0, 2500)}`

  try {
    const msg = await Promise.race([
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 15_000),
      ),
    ])

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) return null

    const parsed = JSON.parse(raw.slice(start, end + 1)) as ExtractedJob
    if (!parsed.company || !parsed.role) return null
    if (!VALID_STATUSES.has(parsed.status)) parsed.status = 'applied'
    return parsed
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { emailId?: string }
  if (!body.emailId) return NextResponse.json({ error: 'emailId required' }, { status: 400 })

  const { data: email, error } = await supabase
    .from('emails')
    .select('id, sender_name, sender_email, subject, body')
    .eq('id', body.emailId)
    .eq('user_id', user.id)
    .single()

  if (error || !email) return NextResponse.json({ error: 'Email not found' }, { status: 404 })

  const from = email.sender_name
    ? `${email.sender_name} <${email.sender_email ?? ''}>`
    : (email.sender_email ?? '')

  const extracted = await extractJobFromEmail(from, email.subject ?? '', email.body ?? '')
  if (!extracted) return NextResponse.json({ error: 'Could not extract job details' }, { status: 422 })

  const now = new Date().toISOString()
  const today = now.slice(0, 10)

  const { data: inserted, error: insertError } = await supabase
    .from('jobs')
    .insert({
      user_id: user.id,
      company: extracted.company,
      role: extracted.role,
      status: extracted.status,
      location: extracted.location ?? null,
      url: extracted.url ?? null,
      salary_range: extracted.salaryRange ?? null,
      notes: extracted.notes ?? null,
      applied_at: ['applied', 'oa', 'recruiter_screen', 'interview', 'final_round', 'offer'].includes(extracted.status)
        ? today
        : null,
      priority: 'medium',
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    return NextResponse.json({ error: 'Failed to create job entry' }, { status: 500 })
  }

  // Link the email to the new job
  await supabase
    .from('emails')
    .update({ related_job_id: inserted.id, updated_at: now })
    .eq('id', body.emailId)
    .eq('user_id', user.id)

  return NextResponse.json({ success: true, jobId: inserted.id, extracted })
}
