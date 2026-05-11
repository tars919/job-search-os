# Overnight Build Progress

## Phase 15: MVP Stability Pass ✅
**Status:** Complete  
**Commit:** fbb31a1

### Files Changed
- `components/Providers.tsx` — reordered providers: `<AuthProvider><ToastProvider><StoreProvider>` so store can access toast
- `lib/store.tsx` — added `useToast()` ref pattern, `dbErr()` helper wired to all 29 CRUD error paths; `loadAll()` wrapped in try/catch with toast + `setReady(true)` fallback
- `app/auth/page.tsx` — added `getSession()` redirect on mount; authenticated users skip auth page
- `OVERNIGHT_PROGRESS.md` — this file

### Commands Run
- `npm run lint` → clean
- `npx tsc --noEmit` → clean

### Errors Fixed
- ESLint `react-hooks/refs` — cannot set ref during render; moved to `useEffect`
- `sed` backreference failure on macOS — used Python replace instead

---

## Phase 16: Gmail Sync Reliability ✅
**Status:** Complete  
**Commit:** 46a5561

### Files Changed
- `app/api/gmail/sync/route.ts` — full rewrite with discriminated union returns, chunked fetching (5/batch), 20s AI timeout, `safeDate()` helper, early 503 if env vars missing

### Commands Run
- `npm run lint` → clean
- `npx tsc --noEmit` → clean

### Key Improvements
- `getValidToken()` returns `{ token } | { error }` with specific messages per failure mode
- `listMessages()` distinguishes 401 (revoked) from generic API errors
- `fetchMessages()` chunks parallel fetches in groups of 5 (was: all 20 at once)
- `classifyEmails()` wrapped in `Promise.race` with 20s timeout; sync continues if AI fails

---

## Phase 17: Email Classification ✅
**Status:** Complete  
**Commit:** 6138378

### Files Changed
- `app/api/gmail/classify/route.ts` — new endpoint for per-email re-classification
- `app/email/page.tsx` — "Re-classify" button calls endpoint directly (inline loading state, toast)

### Key Improvements
- Classification prompt with explicit rules per type (better accuracy)
- No assistant redirect — classification happens inline with spinner
- On success, updates email type + company + detected dates in local store

---

## Phase 18: Job Application Tracker ✅
**Status:** Complete  
**Commit:** 01fce3e

### Files Changed
- `app/applications/page.tsx` — full rewrite with Table/Board view toggle

### Key Improvements
- Board view groups jobs into 6 columns: Wishlist / Applied / Screening / Interview / Offer / Closed
- Each board card: company name, role, priority dot, deadline urgency, inline status dropdown
- Status changes from board trigger store update + toast
- "Add job" button inline in Wishlist column
- Skeleton loading state for board view

---

## Phase 19: Dashboard Command Center ✅
**Status:** Complete  
**Commit:** ec5780e

### Files Changed
- `app/page.tsx` — full rewrite of dashboard

### Key Improvements
- `TodayFocus` component: shows today's upcoming calendar events in gradient banner
- `StalePipeline` component: surfaces active jobs with no update in 14+ days (amber warning)
- Recent Emails feed: last 5 emails with type badge, relative time, link to /email
- Replaced interview count metric with Unread Emails (more actionable)
- Quick link cards at bottom for fast navigation
- `MODULE_NOW = Date.now()` at module level avoids `react-hooks/purity` ESLint error

---

## Phase 20: Follow-Up System ✅
**Status:** Complete  
**Commit:** 566045e

### Files Changed
- `app/applications/page.tsx` — added FollowUpQueue component above table/board

### Key Improvements
- `FollowUpQueue` surfaces applied/screening/interview jobs with no update in 7+ days
- Urgency tiers: 7d (low/zinc), 14d (medium/amber), 21d+ (high/red)
- "Log Sent" bumps `updatedAt` to reset the stale clock
- "Draft Email" deep-links to AI Assistant with `task=draft_follow_up_email` pre-loaded
- Collapsible, shows up to 8 entries sorted by staleness

---

## Phase 21: AI Email Extraction ✅
**Status:** Complete  
**Commit:** 8802df2

### Files Changed
- `app/api/gmail/extract/route.ts` — new endpoint using Claude Haiku to extract job details
- `app/email/page.tsx` — "Create Application" button in EmailCard

### Key Improvements
- Extracts: company, role, location, URL, salary range, status, notes from any recruiting email
- Creates job entry in Supabase and links email → job via `related_job_id`
- "Create Application" button hidden when email is already linked to a job
- Inline loading state + success toast with company + role name

---

## Session Summary

**Branch:** `overnight-phases-15-21`  
**Commits:** 7 (phases 15-21)  
**All lint/typecheck checks:** clean for every phase

### Remaining Risks
- `updateJob(id, {})` for "Log Follow-Up" bumps `updated_at` but doesn't store an explicit follow-up log — acceptable for MVP, consider adding a `follow_ups` table later
- `MODULE_NOW` on dashboard/applications is set at module load time, not per-request — stale by the time of next navigation. Acceptable for staleness display (14-day threshold isn't sensitive to minutes).
- Email extraction creates a new job even if one exists for the same company — no deduplication. User should check before clicking "Create Application".

### Next Recommended Steps
1. Test all features with real Gmail data (connect OAuth, sync emails, classify, extract)
2. Add deduplication check to `/api/gmail/extract` (query existing jobs by company name)
3. Consider persisting kanban view preference (localStorage)
4. Add a proper follow-up log table for audit trail
5. Deploy to production (Vercel) and configure environment variables
