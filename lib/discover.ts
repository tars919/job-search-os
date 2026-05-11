import type { JobDiscovery, Job, Resource } from './types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FitScoreResult {
  score: number
  why: string[]
  missingSkills: string[]
}

interface ProfileSnapshot {
  name?: string
  targetRoles?: string[]
  preferredLocations?: string[]
  yearsExperience?: number | null
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

export function buildFitPrompt(
  discovery: JobDiscovery,
  profile: ProfileSnapshot | null,
  jobs: Job[],
  resources: Resource[],
): string {
  const lines: string[] = []

  lines.push('You are an expert career coach evaluating job fit for a job seeker.')
  lines.push('Score how well this candidate fits the job description below, from 0 to 100.')
  lines.push('')
  lines.push('Respond ONLY with valid JSON — no markdown, no code fences, no explanation:')
  lines.push('{"score":82,"why":["Strong PM background matches the role","Location preference aligned"],"missingSkills":["SQL proficiency","Growth metrics experience"]}')
  lines.push('')
  lines.push('Rules:')
  lines.push('- "score" must be an integer 0–100')
  lines.push('- "why": 2–4 specific reasons the candidate is a good fit')
  lines.push('- "missingSkills": 2–5 concrete skills the candidate likely lacks based on the requirements')
  lines.push('- Be honest and precise. Do not over-inflate scores.')

  lines.push('')
  lines.push('## Job to Evaluate')
  lines.push(`Title: ${discovery.title}`)
  lines.push(`Company: ${discovery.company}`)
  if (discovery.location) lines.push(`Location: ${discovery.location}`)
  if (discovery.workMode) lines.push(`Work Mode: ${discovery.workMode}`)
  if (discovery.salaryRange) lines.push(`Salary Range: ${discovery.salaryRange}`)
  if (discovery.requiredSkills.length > 0) {
    lines.push(`Required Skills: ${discovery.requiredSkills.join(', ')}`)
  }
  if (discovery.description) {
    lines.push('')
    lines.push('### Job Description')
    lines.push(discovery.description.slice(0, 2500))
  }

  if (profile) {
    lines.push('')
    lines.push('## Candidate Profile')
    if (profile.name) lines.push(`Name: ${profile.name}`)
    if (profile.yearsExperience != null) {
      lines.push(`Years of Experience: ${profile.yearsExperience}`)
    }
    if (profile.targetRoles?.length) {
      lines.push(`Target Roles: ${profile.targetRoles.join(', ')}`)
    }
    if (profile.preferredLocations?.length) {
      lines.push(`Preferred Locations: ${profile.preferredLocations.join(', ')}`)
    }
  }

  // Past applications — gives Claude signal about the candidate's experience level
  const appliedStatuses = new Set(['applied', 'oa', 'hirevue', 'recruiter_screen', 'interview', 'final_round', 'offer'])
  const pastApps = jobs.filter((j) => appliedStatuses.has(j.status))
  if (pastApps.length > 0) {
    lines.push('')
    lines.push('## Past Applications (experience signal)')
    pastApps.slice(0, 12).forEach((j) => {
      const loc = j.location ? ` (${j.location})` : ''
      lines.push(`- ${j.role} at ${j.company}${loc}`)
    })
  }

  // Best resume with content
  const resumes = resources
    .filter((r) => r.type === 'resume' && (r.contentText || r.notes))
    .slice(0, 1)
  if (resumes.length > 0) {
    const r = resumes[0]
    lines.push('')
    lines.push('## Resume')
    lines.push(r.title)
    lines.push((r.contentText || r.notes || '').slice(0, 3000))
  }

  return lines.join('\n')
}

// ─── Response parser ──────────────────────────────────────────────────────────

export function parseFitResult(raw: string): FitScoreResult | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'score' in parsed &&
      'why' in parsed &&
      'missingSkills' in parsed
    ) {
      const p = parsed as { score: unknown; why: unknown; missingSkills: unknown }
      if (
        typeof p.score === 'number' &&
        Array.isArray(p.why) &&
        Array.isArray(p.missingSkills)
      ) {
        return {
          score: Math.max(0, Math.min(100, Math.round(p.score))),
          why: (p.why as unknown[]).slice(0, 5).map(String),
          missingSkills: (p.missingSkills as unknown[]).slice(0, 6).map(String),
        }
      }
    }
    return null
  } catch {
    return null
  }
}

// ─── Fit score color helpers ──────────────────────────────────────────────────

export function fitScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-700'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-500'
}

export function fitScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-50 border-emerald-200 text-emerald-700'
  if (score >= 60) return 'bg-amber-50 border-amber-200 text-amber-700'
  return 'bg-red-50 border-red-200 text-red-600'
}

export function fitBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-red-400'
}
