import type { Job, PromptEntry, ResearchNote } from './types'

export const SEED_JOBS: Job[] = [
  {
    id: 'j1',
    company: 'Stripe',
    role: 'Software Engineer, Payments',
    status: 'final_round',
    priority: 'high',
    url: 'https://stripe.com/jobs',
    location: 'Remote',
    salaryRange: '$180k–$220k',
    savedAt: '2026-04-01',
    deadline: '2026-05-10',
    appliedAt: '2026-04-01',
    notes: 'Great conversations with the team. Strong culture fit. Prep system design.',
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-05-02T09:00:00.000Z',
  },
  {
    id: 'j2',
    company: 'Linear',
    role: 'Product Engineer',
    status: 'interview',
    priority: 'high',
    url: 'https://linear.app/jobs',
    location: 'Remote',
    salaryRange: '$160k–$200k',
    savedAt: '2026-04-10',
    deadline: '2026-05-15',
    appliedAt: '2026-04-10',
    notes: 'Technical interview scheduled. Review their sync engine architecture.',
    createdAt: '2026-04-10T14:00:00.000Z',
    updatedAt: '2026-05-01T11:00:00.000Z',
  },
  {
    id: 'j3',
    company: 'Vercel',
    role: 'Software Engineer, Infrastructure',
    status: 'oa',
    priority: 'high',
    url: 'https://vercel.com/careers',
    location: 'Remote',
    salaryRange: '$170k–$210k',
    savedAt: '2026-04-20',
    deadline: '2026-05-08',
    appliedAt: '2026-04-20',
    notes: 'OA due soon. Node.js and distributed systems questions expected.',
    createdAt: '2026-04-20T09:00:00.000Z',
    updatedAt: '2026-04-28T10:00:00.000Z',
  },
  {
    id: 'j4',
    company: 'Figma',
    role: 'Frontend Engineer',
    status: 'recruiter_screen',
    priority: 'high',
    url: 'https://figma.com/careers',
    location: 'San Francisco, CA',
    salaryRange: '$175k–$215k',
    savedAt: '2026-04-15',
    appliedAt: '2026-04-15',
    createdAt: '2026-04-15T16:00:00.000Z',
    updatedAt: '2026-04-29T13:00:00.000Z',
  },
  {
    id: 'j5',
    company: 'GitHub',
    role: 'Software Engineer, Actions',
    status: 'hirevue',
    priority: 'medium',
    url: 'https://github.com/about/careers',
    location: 'Remote',
    salaryRange: '$160k–$195k',
    savedAt: '2026-04-18',
    deadline: '2026-05-07',
    appliedAt: '2026-04-18',
    notes: 'HireVue due end of week. Behavioral + 1 coding question.',
    createdAt: '2026-04-18T11:00:00.000Z',
    updatedAt: '2026-05-02T08:00:00.000Z',
  },
  {
    id: 'j6',
    company: 'OpenAI',
    role: 'Software Engineer, Developer Experience',
    status: 'applied',
    priority: 'high',
    url: 'https://openai.com/careers',
    location: 'San Francisco, CA',
    salaryRange: '$200k–$280k',
    savedAt: '2026-04-25',
    appliedAt: '2026-04-25',
    createdAt: '2026-04-25T12:00:00.000Z',
    updatedAt: '2026-04-25T12:00:00.000Z',
  },
  {
    id: 'j7',
    company: 'Notion',
    role: 'Full Stack Engineer',
    status: 'applied',
    priority: 'medium',
    url: 'https://notion.so/careers',
    location: 'New York, NY',
    salaryRange: '$155k–$190k',
    savedAt: '2026-04-22',
    appliedAt: '2026-04-22',
    createdAt: '2026-04-22T10:00:00.000Z',
    updatedAt: '2026-04-22T10:00:00.000Z',
  },
  {
    id: 'j8',
    company: 'Anthropic',
    role: 'Software Engineer, Product',
    status: 'ready_to_apply',
    priority: 'high',
    url: 'https://anthropic.com/careers',
    location: 'San Francisco, CA',
    salaryRange: '$185k–$240k',
    savedAt: '2026-05-02',
    deadline: '2026-05-20',
    notes: 'Finish tailoring cover letter. Highlight AI tooling experience.',
    createdAt: '2026-05-02T09:00:00.000Z',
    updatedAt: '2026-05-02T09:00:00.000Z',
  },
  {
    id: 'j9',
    company: 'Shopify',
    role: 'Senior Developer',
    status: 'researching',
    priority: 'medium',
    url: 'https://shopify.com/careers',
    location: 'Remote',
    salaryRange: '$150k–$180k',
    savedAt: '2026-04-28',
    createdAt: '2026-04-28T15:00:00.000Z',
    updatedAt: '2026-04-28T15:00:00.000Z',
  },
  {
    id: 'j10',
    company: 'Planetscale',
    role: 'Software Engineer',
    status: 'saved',
    priority: 'low',
    url: 'https://planetscale.com/jobs',
    location: 'Remote',
    savedAt: '2026-05-01',
    createdAt: '2026-05-01T14:00:00.000Z',
    updatedAt: '2026-05-01T14:00:00.000Z',
  },
  {
    id: 'j11',
    company: 'Amazon',
    role: 'SDE II, Frontend',
    status: 'rejected',
    priority: 'medium',
    url: 'https://amazon.jobs',
    location: 'Seattle, WA',
    salaryRange: '$155k–$210k',
    savedAt: '2026-03-15',
    appliedAt: '2026-03-15',
    notes: 'Failed LP round. Prep more behavioral stories for next time.',
    createdAt: '2026-03-15T10:00:00.000Z',
    updatedAt: '2026-04-20T10:00:00.000Z',
  },
  {
    id: 'j12',
    company: 'Datadog',
    role: 'Backend Engineer',
    status: 'closed',
    priority: 'low',
    url: 'https://datadoghq.com/careers',
    location: 'New York, NY',
    savedAt: '2026-03-10',
    appliedAt: '2026-03-10',
    notes: 'Position filled internally.',
    createdAt: '2026-03-10T09:00:00.000Z',
    updatedAt: '2026-04-15T09:00:00.000Z',
  },
]

export const SEED_PROMPTS: PromptEntry[] = [
  {
    id: 'p1',
    title: 'Cold Email to Recruiter',
    category: 'Outreach',
    body: `Hi [Name],

I came across [Company] and was impressed by [specific thing about their product/mission]. I'm a software engineer with [X years] of experience in [relevant skills], and I'd love to learn more about opportunities on the [team] team.

Would you be open to a quick 15-minute call this week?

Best,
[Your name]`,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
  },
  {
    id: 'p2',
    title: 'Follow-up After Application',
    category: 'Follow-up',
    body: `Hi [Recruiter Name],

I applied for the [Role] position at [Company] on [Date] and wanted to follow up to express my continued interest. My experience with [specific skills] aligns closely with what you're looking for, and I'm excited about [specific aspect of the role].

I'd welcome any update on the status of my application.

Thank you,
[Your name]`,
    createdAt: '2026-04-05T10:00:00.000Z',
    updatedAt: '2026-04-05T10:00:00.000Z',
  },
  {
    id: 'p3',
    title: 'Thank You After Interview',
    category: 'Post-interview',
    body: `Hi [Interviewer Name],

Thank you for taking the time to speak with me today about the [Role] position. I really enjoyed our conversation about [specific topic discussed], and it reinforced my excitement about the opportunity to join [Company].

[One sentence connecting your background to something specific they mentioned.]

I look forward to next steps.

Best,
[Your name]`,
    createdAt: '2026-04-10T10:00:00.000Z',
    updatedAt: '2026-04-10T10:00:00.000Z',
  },
  {
    id: 'p4',
    title: 'LinkedIn Connection Request',
    category: 'Outreach',
    body: `Hi [Name],

I noticed you work on [team/area] at [Company] — I'm a software engineer exploring roles there and would love to connect. I'm particularly interested in [specific product area].

Happy to chat if you're open to it!

[Your name]`,
    createdAt: '2026-04-12T10:00:00.000Z',
    updatedAt: '2026-04-12T10:00:00.000Z',
  },
]

export const SEED_NOTES: ResearchNote[] = [
  {
    id: 'n1',
    company: 'Stripe',
    jobId: 'j1',
    content: `## Stripe Research

**Mission:** Increase the GDP of the internet

**Engineering culture:** Strong writing culture, thoughtful design docs, no-meeting Wednesdays, high ownership

**Tech stack:** Ruby, Go, TypeScript, React

**Interview process:** Recruiter screen → technical phone → virtual onsite (4 rounds: 2x coding, 1x system design, 1x reverse interview)

**Key talking points:**
- Payments reliability at scale
- Developer experience obsession
- Global expansion into new markets

**Questions to ask:**
- How does the team prioritize reliability vs velocity?
- What does the oncall rotation look like?`,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
  },
  {
    id: 'n2',
    company: 'Linear',
    jobId: 'j2',
    content: `## Linear Research

**Mission:** Making software teams more productive through great tools

**Culture:** ~60 person team, very high quality bar, async-first, remote

**Tech stack:** TypeScript everywhere, React, Electron, custom sync engine (Liveblocks-inspired)

**Why I want to work here:** Best-in-class product quality, obsessive attention to detail, small team with huge impact

**Prep notes:**
- Study their sync engine blog post
- Think about offline-first architecture patterns
- Review their public changelog for product thinking signals`,
    createdAt: '2026-04-10T10:00:00.000Z',
    updatedAt: '2026-04-10T10:00:00.000Z',
  },
]
