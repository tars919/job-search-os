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
