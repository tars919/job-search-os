import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

const VALID_TYPES = new Set([
  'offer', 'interview_invite', 'rejection', 'oa_link',
  'recruiter_reply', 'follow_up', 'networking', 'other',
])

interface ClassifyResult {
  emailType: string
  company: string
  detectedAction: string
  detectedInterviewDate: string | null
  detectedDeadline: string | null
}

async function classifySingle(
  from: string,
  subject: string,
  body: string,
): Promise<ClassifyResult | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `Classify this recruiting email for a job seeker. Return ONLY a valid JSON object — no markdown, no explanation.

Fields: { "emailType": "<type>", "company": "<name or empty string>", "detectedAction": "<1 sentence max>", "detectedInterviewDate": "<YYYY-MM-DD or null>", "detectedDeadline": "<YYYY-MM-DD or null>" }

emailType must be one of: offer, interview_invite, rejection, oa_link, recruiter_reply, follow_up, networking, other

Rules for classification:
- interview_invite: explicit invitation to schedule or attend an interview
- rejection: application declined, position filled, not moving forward
- offer: job offer extended, compensation details, start date
- oa_link: online assessment, coding challenge, take-home assignment link
- recruiter_reply: recruiter reaching out, application acknowledgment, status update
- follow_up: reminder, checking in, follow-up from a previous exchange
- networking: informational meeting, coffee chat, general networking

Email:
From: ${from}
Subject: ${subject}
Body: ${body.slice(0, 2000)}`

  try {
    const msg = await Promise.race([
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
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

    const parsed = JSON.parse(raw.slice(start, end + 1)) as ClassifyResult
    if (!VALID_TYPES.has(parsed.emailType)) return null
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

  const result = await classifySingle(from, email.subject ?? '', email.body ?? '')
  if (!result) return NextResponse.json({ error: 'Classification failed' }, { status: 500 })

  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('emails')
    .update({
      email_type: result.emailType,
      company: result.company || null,
      detected_action: result.detectedAction || null,
      detected_interview_date: result.detectedInterviewDate || null,
      detected_deadline: result.detectedDeadline || null,
      updated_at: now,
    })
    .eq('id', body.emailId)
    .eq('user_id', user.id)

  if (updateError) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })

  return NextResponse.json({ success: true, result })
}
