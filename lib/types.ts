export const JOB_STATUSES = [
  'saved',
  'researching',
  'ready_to_apply',
  'applied',
  'oa',
  'hirevue',
  'recruiter_screen',
  'interview',
  'final_round',
  'offer',
  'rejected',
  'closed',
] as const

export type JobStatus = (typeof JOB_STATUSES)[number]

export const STATUS_LABELS: Record<JobStatus, string> = {
  saved: 'Saved',
  researching: 'Researching',
  ready_to_apply: 'Ready to Apply',
  applied: 'Applied',
  oa: 'OA',
  hirevue: 'HireVue',
  recruiter_screen: 'Recruiter Screen',
  interview: 'Interview',
  final_round: 'Final Round',
  offer: 'Offer',
  rejected: 'Rejected',
  closed: 'Closed',
}

export const STATUS_COLORS: Record<JobStatus, string> = {
  saved: 'bg-zinc-100 text-zinc-600',
  researching: 'bg-sky-50 text-sky-700',
  ready_to_apply: 'bg-indigo-50 text-indigo-700',
  applied: 'bg-amber-50 text-amber-700',
  oa: 'bg-orange-50 text-orange-700',
  hirevue: 'bg-orange-50 text-orange-700',
  recruiter_screen: 'bg-violet-50 text-violet-700',
  interview: 'bg-purple-50 text-purple-700',
  final_round: 'bg-pink-50 text-pink-700',
  offer: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
  closed: 'bg-zinc-100 text-zinc-400',
}

export const ACTIVE_STATUSES: JobStatus[] = [
  'applied',
  'oa',
  'hirevue',
  'recruiter_screen',
  'interview',
  'final_round',
]

export const PRIORITIES = ['low', 'medium', 'high'] as const
export type Priority = (typeof PRIORITIES)[number]

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-zinc-100 text-zinc-500',
}

export interface Job {
  id: string
  company: string
  role: string
  status: JobStatus
  priority?: Priority
  url?: string        // job posting URL
  location?: string
  salaryRange?: string
  fitScore?: string
  importanceScore?: string
  notes?: string
  savedAt?: string    // YYYY-MM-DD — when user bookmarked the role
  deadline?: string   // YYYY-MM-DD
  appliedAt?: string  // YYYY-MM-DD
  updatedAt: string   // ISO string
  createdAt: string   // ISO string
}

export const RESOURCE_TYPES = [
  'resume',
  'cover_letter',
  'company_resume',
  'job_description',
  'recruiter_email',
  'notes',
  'other',
] as const

export type ResourceType = (typeof RESOURCE_TYPES)[number]

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  resume: 'Resume',
  cover_letter: 'Cover Letter',
  company_resume: 'Company Resume',
  job_description: 'Job Description',
  recruiter_email: 'Recruiter Email',
  notes: 'Notes',
  other: 'Other',
}

export const RESOURCE_TYPE_COLORS: Record<ResourceType, string> = {
  resume: 'bg-blue-50 text-blue-700',
  cover_letter: 'bg-violet-50 text-violet-700',
  company_resume: 'bg-indigo-50 text-indigo-700',
  job_description: 'bg-amber-50 text-amber-700',
  recruiter_email: 'bg-emerald-50 text-emerald-700',
  notes: 'bg-zinc-100 text-zinc-600',
  other: 'bg-zinc-100 text-zinc-500',
}

export interface Resource {
  id: string
  title: string
  type: ResourceType
  company?: string
  role?: string
  tags: string[]
  fileName?: string
  fileType?: string
  fileSize?: number
  sourceUrl?: string
  contentText?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface PromptEntry {
  id: string
  title: string
  category: string
  body: string
  createdAt: string
  updatedAt: string
}

export interface ResearchNote {
  id: string
  company: string
  content: string
  jobId?: string
  createdAt: string
  updatedAt: string
}

// ─── Outreach ─────────────────────────────────────────────────────────────────

export const OUTREACH_STATUSES = ['planned', 'sent', 'replied', 'follow_up_needed', 'closed'] as const
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number]

export const OUTREACH_STATUS_LABELS: Record<OutreachStatus, string> = {
  planned: 'Planned',
  sent: 'Sent',
  replied: 'Replied',
  follow_up_needed: 'Follow Up',
  closed: 'Closed',
}

export const OUTREACH_STATUS_COLORS: Record<OutreachStatus, string> = {
  planned: 'bg-zinc-100 text-zinc-600',
  sent: 'bg-amber-50 text-amber-700',
  replied: 'bg-emerald-50 text-emerald-700',
  follow_up_needed: 'bg-red-50 text-red-600',
  closed: 'bg-zinc-100 text-zinc-400',
}

export const RELATIONSHIP_TYPES = [
  'recruiter', 'employee', 'alumni', 'hiring_manager', 'referral', 'friend', 'other',
] as const
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number]

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  recruiter: 'Recruiter',
  employee: 'Employee',
  alumni: 'Alumni',
  hiring_manager: 'Hiring Manager',
  referral: 'Referral',
  friend: 'Friend',
  other: 'Other',
}

export const RELATIONSHIP_TYPE_COLORS: Record<RelationshipType, string> = {
  recruiter: 'bg-violet-100 text-violet-700',
  employee: 'bg-blue-100 text-blue-700',
  alumni: 'bg-amber-100 text-amber-700',
  hiring_manager: 'bg-pink-100 text-pink-700',
  referral: 'bg-emerald-100 text-emerald-700',
  friend: 'bg-sky-100 text-sky-700',
  other: 'bg-zinc-100 text-zinc-600',
}

export const OUTREACH_CHANNELS = ['email', 'linkedin', 'handshake', 'text', 'other'] as const
export type OutreachChannel = (typeof OUTREACH_CHANNELS)[number]

export const OUTREACH_CHANNEL_LABELS: Record<OutreachChannel, string> = {
  email: 'Email',
  linkedin: 'LinkedIn',
  handshake: 'Handshake',
  text: 'Text',
  other: 'Other',
}

export const OUTREACH_CHANNEL_COLORS: Record<OutreachChannel, string> = {
  email: 'bg-blue-50 text-blue-700',
  linkedin: 'bg-sky-50 text-sky-700',
  handshake: 'bg-violet-50 text-violet-700',
  text: 'bg-emerald-50 text-emerald-700',
  other: 'bg-zinc-100 text-zinc-600',
}

export interface Outreach {
  id: string
  personName: string
  company: string
  role?: string
  relationshipType: RelationshipType
  channel: OutreachChannel
  status: OutreachStatus
  relatedJobId?: string
  lastContactedAt?: string  // YYYY-MM-DD
  followUpDate?: string     // YYYY-MM-DD
  notes?: string
  messageDraft?: string
  createdAt: string
  updatedAt: string
}

// ─── Interview Prep ───────────────────────────────────────────────────────────

export const ROUND_TYPES = [
  'recruiter_screen',
  'behavioral',
  'product_sense',
  'execution',
  'technical',
  'case',
  'presentation',
  'final',
  'other',
] as const
export type RoundType = (typeof ROUND_TYPES)[number]

export const ROUND_TYPE_LABELS: Record<RoundType, string> = {
  recruiter_screen: 'Recruiter Screen',
  behavioral: 'Behavioral',
  product_sense: 'Product Sense',
  execution: 'Execution',
  technical: 'Technical',
  case: 'Case',
  presentation: 'Presentation',
  final: 'Final Round',
  other: 'Other',
}

export const ROUND_TYPE_COLORS: Record<RoundType, string> = {
  recruiter_screen: 'bg-violet-50 text-violet-700',
  behavioral: 'bg-blue-50 text-blue-700',
  product_sense: 'bg-indigo-50 text-indigo-700',
  execution: 'bg-amber-50 text-amber-700',
  technical: 'bg-orange-50 text-orange-700',
  case: 'bg-pink-50 text-pink-700',
  presentation: 'bg-sky-50 text-sky-700',
  final: 'bg-rose-50 text-rose-700',
  other: 'bg-zinc-100 text-zinc-600',
}

export const INTERVIEW_STATUSES = ['upcoming', 'needs_prep', 'completed', 'done'] as const
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number]

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  upcoming: 'Upcoming',
  needs_prep: 'Needs Prep',
  completed: 'Completed',
  done: 'Done',
}

export const INTERVIEW_STATUS_COLORS: Record<InterviewStatus, string> = {
  upcoming: 'bg-blue-50 text-blue-700',
  needs_prep: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  done: 'bg-zinc-100 text-zinc-500',
}

export interface InterviewPrep {
  id: string
  relatedJobId?: string
  company: string
  role?: string
  roundName: string
  roundType: RoundType
  interviewDate?: string    // YYYY-MM-DD
  interviewerName?: string
  interviewerRole?: string
  status: InterviewStatus
  prepNotes?: string
  questionsToPractice?: string
  storiesToUse?: string
  feedback?: string
  createdAt: string
  updatedAt: string
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export const EVENT_TYPES = [
  'interview',
  'application_deadline',
  'follow_up',
  'networking',
  'prep_session',
  'oa_due',
  'other',
] as const
export type EventType = (typeof EVENT_TYPES)[number]

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  interview: 'Interview',
  application_deadline: 'Deadline',
  follow_up: 'Follow-up',
  networking: 'Networking',
  prep_session: 'Prep Session',
  oa_due: 'OA Due',
  other: 'Other',
}

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  interview: 'bg-purple-50 text-purple-700',
  application_deadline: 'bg-red-50 text-red-600',
  follow_up: 'bg-amber-50 text-amber-700',
  networking: 'bg-sky-50 text-sky-700',
  prep_session: 'bg-blue-50 text-blue-700',
  oa_due: 'bg-orange-50 text-orange-700',
  other: 'bg-zinc-100 text-zinc-600',
}

export const EVENT_TYPE_ICONS: Record<EventType, string> = {
  interview: '🎤',
  application_deadline: '🚨',
  follow_up: '💬',
  networking: '🤝',
  prep_session: '📋',
  oa_due: '💻',
  other: '📌',
}

export const EVENT_STATUSES = ['upcoming', 'completed', 'missed', 'cancelled'] as const
export type EventStatus = (typeof EVENT_STATUSES)[number]

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  upcoming: 'Upcoming',
  completed: 'Completed',
  missed: 'Missed',
  cancelled: 'Cancelled',
}

export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  upcoming: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
  missed: 'bg-red-50 text-red-600',
  cancelled: 'bg-zinc-100 text-zinc-400',
}

export interface CalendarEvent {
  id: string
  title: string
  eventType: EventType
  relatedJobId?: string
  relatedOutreachId?: string
  relatedInterviewId?: string
  company?: string
  startDateTime: string   // ISO or YYYY-MM-DD
  endDateTime?: string
  location?: string
  meetingLink?: string
  notes?: string
  status: EventStatus
  createdAt: string
  updatedAt: string
}

// ─── Email Intelligence ───────────────────────────────────────────────────────

export const EMAIL_TYPES = [
  'recruiter_reply',
  'interview_invite',
  'rejection',
  'oa_link',
  'follow_up',
  'networking',
  'offer',
  'other',
] as const
export type EmailType = (typeof EMAIL_TYPES)[number]

export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  recruiter_reply: 'Recruiter Reply',
  interview_invite: 'Interview Invite',
  rejection: 'Rejection',
  oa_link: 'OA Link',
  follow_up: 'Follow-up',
  networking: 'Networking',
  offer: 'Offer',
  other: 'Other',
}

export const EMAIL_TYPE_COLORS: Record<EmailType, string> = {
  recruiter_reply: 'bg-violet-50 text-violet-700',
  interview_invite: 'bg-blue-50 text-blue-700',
  rejection: 'bg-red-50 text-red-600',
  oa_link: 'bg-orange-50 text-orange-700',
  follow_up: 'bg-amber-50 text-amber-700',
  networking: 'bg-sky-50 text-sky-700',
  offer: 'bg-emerald-50 text-emerald-700',
  other: 'bg-zinc-100 text-zinc-600',
}

export const EMAIL_TYPE_ICONS: Record<EmailType, string> = {
  recruiter_reply: '💼',
  interview_invite: '🎤',
  rejection: '❌',
  oa_link: '💻',
  follow_up: '💬',
  networking: '🤝',
  offer: '🎉',
  other: '📧',
}

export const EMAIL_STATUSES = ['unread', 'processed', 'action_taken'] as const
export type EmailStatus = (typeof EMAIL_STATUSES)[number]

export const EMAIL_STATUS_LABELS: Record<EmailStatus, string> = {
  unread: 'Unread',
  processed: 'Processed',
  action_taken: 'Action Taken',
}

export const EMAIL_STATUS_COLORS: Record<EmailStatus, string> = {
  unread: 'bg-blue-50 text-blue-700',
  processed: 'bg-zinc-100 text-zinc-500',
  action_taken: 'bg-emerald-50 text-emerald-700',
}

export interface EmailMessage {
  id: string
  senderName?: string
  senderEmail?: string
  company?: string
  subject?: string
  body: string
  emailType: EmailType
  relatedJobId?: string
  detectedAction?: string
  detectedInterviewDate?: string  // YYYY-MM-DD if found
  detectedDeadline?: string       // YYYY-MM-DD if found
  receivedAt?: string
  status: EmailStatus
  createdAt: string
  updatedAt: string
}
