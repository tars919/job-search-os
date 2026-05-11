'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  startTransition,
  type ReactNode,
} from 'react'
import type {
  CalendarEvent,
  EmailMessage,
  InterviewPrep,
  Job,
  JobDiscovery,
  Outreach,
  PromptEntry,
  ResearchNote,
  Resource,
} from './types'
import { getSupabase } from './supabase/client'
import { fromDb, toDbInsert, toDbPatch } from './supabase/mappers'
import { useToast } from './toast'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString()
}

function uid() {
  return crypto.randomUUID()
}

// ─── Store interface (same public API as before) ───────────────────────────────

interface Store {
  ready: boolean
  jobs: Job[]
  prompts: PromptEntry[]
  notes: ResearchNote[]
  resources: Resource[]
  outreach: Outreach[]
  interviews: InterviewPrep[]
  events: CalendarEvent[]
  emails: EmailMessage[]
  addJob: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => void
  bulkAddJobs: (jobs: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>[]) => void
  updateJob: (id: string, patch: Partial<Omit<Job, 'id' | 'createdAt'>>) => void
  deleteJob: (id: string) => void
  addPrompt: (prompt: Omit<PromptEntry, 'id' | 'createdAt' | 'updatedAt'>) => void
  updatePrompt: (id: string, patch: Partial<Omit<PromptEntry, 'id' | 'createdAt'>>) => void
  deletePrompt: (id: string) => void
  addNote: (note: Omit<ResearchNote, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateNote: (id: string, patch: Partial<Omit<ResearchNote, 'id' | 'createdAt'>>) => void
  deleteNote: (id: string) => void
  addResource: (resource: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateResource: (id: string, patch: Partial<Omit<Resource, 'id' | 'createdAt'>>) => void
  deleteResource: (id: string) => void
  addOutreach: (outreach: Omit<Outreach, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateOutreach: (id: string, patch: Partial<Omit<Outreach, 'id' | 'createdAt'>>) => void
  deleteOutreach: (id: string) => void
  addInterview: (interview: Omit<InterviewPrep, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateInterview: (id: string, patch: Partial<Omit<InterviewPrep, 'id' | 'createdAt'>>) => void
  deleteInterview: (id: string) => void
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateEvent: (id: string, patch: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>) => void
  deleteEvent: (id: string) => void
  addEmail: (email: Omit<EmailMessage, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateEmail: (id: string, patch: Partial<Omit<EmailMessage, 'id' | 'createdAt'>>) => void
  deleteEmail: (id: string) => void
  discoveries: JobDiscovery[]
  addDiscovery: (d: Omit<JobDiscovery, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateDiscovery: (id: string, patch: Partial<Omit<JobDiscovery, 'id' | 'createdAt'>>) => void
  deleteDiscovery: (id: string) => void
}

const StoreContext = createContext<Store | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => getSupabase())
  const userIdRef = useRef<string | null>(null)
  const toast = useToast()
  const toastRef = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  // Centralised DB error handler — reads from ref so no useCallback deps needed
  function dbErr(op: string, error: unknown) {
    if (!error) return
    console.error(`[store] ${op}:`, error)
    toastRef.current('Changes may not have saved — check your connection.', 'error')
  }

  const [ready, setReady] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [prompts, setPrompts] = useState<PromptEntry[]>([])
  const [notes, setNotes] = useState<ResearchNote[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [outreach, setOutreach] = useState<Outreach[]>([])
  const [interviews, setInterviews] = useState<InterviewPrep[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [emails, setEmails] = useState<EmailMessage[]>([])
  const [discoveries, setDiscoveries] = useState<JobDiscovery[]>([])

  // Load all data for the given user
  async function loadAll(userId: string) {
    try {
      const [j, p, n, r, o, i, e, m, d] = await Promise.all([
        supabase.from('jobs').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('prompts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('research_notes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('resources').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('outreach').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('interviews').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('events').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('emails').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('job_discoveries').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ])

      startTransition(() => {
        setJobs((j.data ?? []).map((r) => fromDb<Job>(r)))
        setPrompts((p.data ?? []).map((r) => fromDb<PromptEntry>(r)))
        setNotes((n.data ?? []).map((r) => fromDb<ResearchNote>(r)))
        setResources((r.data ?? []).map((r) => fromDb<Resource>(r)))
        setOutreach((o.data ?? []).map((r) => fromDb<Outreach>(r)))
        setInterviews((i.data ?? []).map((r) => fromDb<InterviewPrep>(r)))
        setEvents((e.data ?? []).map((r) => fromDb<CalendarEvent>(r)))
        setEmails((m.data ?? []).map((r) => fromDb<EmailMessage>(r)))
        setDiscoveries((d.data ?? []).map((r) => fromDb<JobDiscovery>(r)))
        setReady(true)
      })
    } catch (err) {
      console.error('[store] loadAll failed:', err)
      toastRef.current('Failed to load your data — please refresh the page.', 'error')
      startTransition(() => setReady(true))
    }
  }

  function clearAll() {
    startTransition(() => {
      setJobs([])
      setPrompts([])
      setNotes([])
      setResources([])
      setOutreach([])
      setInterviews([])
      setEvents([])
      setEmails([])
      setDiscoveries([])
      setReady(true)
    })
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          userIdRef.current = session.user.id
          loadAll(session.user.id)
        } else {
          userIdRef.current = null
          clearAll()
        }
      } else if (event === 'SIGNED_OUT') {
        userIdRef.current = null
        clearAll()
      }
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  // ─── Jobs ──────────────────────────────────────────────────────────────────

  const addJob = useCallback(
    (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => {
      const userId = userIdRef.current
      if (!userId) return
      const ts = now()
      const entity: Job = { ...job, id: uid(), createdAt: ts, updatedAt: ts }
      setJobs((prev) => [entity, ...prev])
      supabase
        .from('jobs')
        .insert(toDbInsert(entity, userId))
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const bulkAddJobs = useCallback(
    (newJobs: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>[]) => {
      const userId = userIdRef.current
      if (!userId) return
      const ts = now()
      const entities = newJobs.map((j) => ({ ...j, id: uid(), createdAt: ts, updatedAt: ts }))
      setJobs((prev) => [...entities, ...prev])
      supabase
        .from('jobs')
        .insert(entities.map((j) => toDbInsert(j as Record<string, unknown>, userId)))
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const updateJob = useCallback(
    (id: string, patch: Partial<Omit<Job, 'id' | 'createdAt'>>) => {
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch, updatedAt: now() } : j)))
      supabase
        .from('jobs')
        .update(toDbPatch(patch as Record<string, unknown>))
        .eq('id', id)
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const deleteJob = useCallback(
    (id: string) => {
      setJobs((prev) => prev.filter((j) => j.id !== id))
      supabase.from('jobs').delete().eq('id', id)
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  // ─── Prompts ───────────────────────────────────────────────────────────────

  const addPrompt = useCallback(
    (prompt: Omit<PromptEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
      const userId = userIdRef.current
      if (!userId) return
      const ts = now()
      const entity: PromptEntry = { ...prompt, id: uid(), createdAt: ts, updatedAt: ts }
      setPrompts((prev) => [entity, ...prev])
      supabase
        .from('prompts')
        .insert(toDbInsert(entity, userId))
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const updatePrompt = useCallback(
    (id: string, patch: Partial<Omit<PromptEntry, 'id' | 'createdAt'>>) => {
      setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: now() } : p)))
      supabase
        .from('prompts')
        .update(toDbPatch(patch as Record<string, unknown>))
        .eq('id', id)
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const deletePrompt = useCallback(
    (id: string) => {
      setPrompts((prev) => prev.filter((p) => p.id !== id))
      supabase.from('prompts').delete().eq('id', id)
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  // ─── Research Notes ────────────────────────────────────────────────────────

  const addNote = useCallback(
    (note: Omit<ResearchNote, 'id' | 'createdAt' | 'updatedAt'>) => {
      const userId = userIdRef.current
      if (!userId) return
      const ts = now()
      const entity: ResearchNote = { ...note, id: uid(), createdAt: ts, updatedAt: ts }
      setNotes((prev) => [entity, ...prev])
      supabase
        .from('research_notes')
        .insert(toDbInsert(entity, userId))
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const updateNote = useCallback(
    (id: string, patch: Partial<Omit<ResearchNote, 'id' | 'createdAt'>>) => {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now() } : n)))
      supabase
        .from('research_notes')
        .update(toDbPatch(patch as Record<string, unknown>))
        .eq('id', id)
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const deleteNote = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== id))
      supabase.from('research_notes').delete().eq('id', id)
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  // ─── Resources ─────────────────────────────────────────────────────────────

  const addResource = useCallback(
    (resource: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => {
      const userId = userIdRef.current
      if (!userId) return
      const ts = now()
      const entity: Resource = { ...resource, id: uid(), createdAt: ts, updatedAt: ts }
      setResources((prev) => [entity, ...prev])
      supabase
        .from('resources')
        .insert(toDbInsert(entity, userId))
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const updateResource = useCallback(
    (id: string, patch: Partial<Omit<Resource, 'id' | 'createdAt'>>) => {
      setResources((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now() } : r)))
      supabase
        .from('resources')
        .update(toDbPatch(patch as Record<string, unknown>))
        .eq('id', id)
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const deleteResource = useCallback(
    (id: string) => {
      setResources((prev) => prev.filter((r) => r.id !== id))
      supabase.from('resources').delete().eq('id', id)
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  // ─── Outreach ──────────────────────────────────────────────────────────────

  const addOutreach = useCallback(
    (o: Omit<Outreach, 'id' | 'createdAt' | 'updatedAt'>) => {
      const userId = userIdRef.current
      if (!userId) return
      const ts = now()
      const entity: Outreach = { ...o, id: uid(), createdAt: ts, updatedAt: ts }
      setOutreach((prev) => [entity, ...prev])
      supabase
        .from('outreach')
        .insert(toDbInsert(entity, userId))
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const updateOutreach = useCallback(
    (id: string, patch: Partial<Omit<Outreach, 'id' | 'createdAt'>>) => {
      setOutreach((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch, updatedAt: now() } : o)))
      supabase
        .from('outreach')
        .update(toDbPatch(patch as Record<string, unknown>))
        .eq('id', id)
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const deleteOutreach = useCallback(
    (id: string) => {
      setOutreach((prev) => prev.filter((o) => o.id !== id))
      supabase.from('outreach').delete().eq('id', id)
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  // ─── Interviews ────────────────────────────────────────────────────────────

  const addInterview = useCallback(
    (interview: Omit<InterviewPrep, 'id' | 'createdAt' | 'updatedAt'>) => {
      const userId = userIdRef.current
      if (!userId) return
      const ts = now()
      const entity: InterviewPrep = { ...interview, id: uid(), createdAt: ts, updatedAt: ts }
      setInterviews((prev) => [entity, ...prev])
      supabase
        .from('interviews')
        .insert(toDbInsert(entity, userId))
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const updateInterview = useCallback(
    (id: string, patch: Partial<Omit<InterviewPrep, 'id' | 'createdAt'>>) => {
      setInterviews((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: now() } : i)))
      supabase
        .from('interviews')
        .update(toDbPatch(patch as Record<string, unknown>))
        .eq('id', id)
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const deleteInterview = useCallback(
    (id: string) => {
      setInterviews((prev) => prev.filter((i) => i.id !== id))
      supabase.from('interviews').delete().eq('id', id)
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  // ─── Events ────────────────────────────────────────────────────────────────

  const addEvent = useCallback(
    (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
      const userId = userIdRef.current
      if (!userId) return
      const ts = now()
      const entity: CalendarEvent = { ...event, id: uid(), createdAt: ts, updatedAt: ts }
      setEvents((prev) => [entity, ...prev])
      supabase
        .from('events')
        .insert(toDbInsert(entity, userId))
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const updateEvent = useCallback(
    (id: string, patch: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>) => {
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now() } : e)))
      supabase
        .from('events')
        .update(toDbPatch(patch as Record<string, unknown>))
        .eq('id', id)
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const deleteEvent = useCallback(
    (id: string) => {
      setEvents((prev) => prev.filter((e) => e.id !== id))
      supabase.from('events').delete().eq('id', id)
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  // ─── Emails ────────────────────────────────────────────────────────────────

  const addEmail = useCallback(
    (email: Omit<EmailMessage, 'id' | 'createdAt' | 'updatedAt'>) => {
      const userId = userIdRef.current
      if (!userId) return
      const ts = now()
      const entity: EmailMessage = { ...email, id: uid(), createdAt: ts, updatedAt: ts }
      setEmails((prev) => [entity, ...prev])
      supabase
        .from('emails')
        .insert(toDbInsert(entity, userId))
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const updateEmail = useCallback(
    (id: string, patch: Partial<Omit<EmailMessage, 'id' | 'createdAt'>>) => {
      setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now() } : e)))
      supabase
        .from('emails')
        .update(toDbPatch(patch as Record<string, unknown>))
        .eq('id', id)
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const deleteEmail = useCallback(
    (id: string) => {
      setEmails((prev) => prev.filter((e) => e.id !== id))
      supabase.from('emails').delete().eq('id', id)
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  // ─── Discoveries ───────────────────────────────────────────────────────────

  const addDiscovery = useCallback(
    (d: Omit<JobDiscovery, 'id' | 'createdAt' | 'updatedAt'>) => {
      const userId = userIdRef.current
      if (!userId) return
      const ts = now()
      const entity: JobDiscovery = { ...d, id: uid(), createdAt: ts, updatedAt: ts }
      setDiscoveries((prev) => [entity, ...prev])
      supabase
        .from('job_discoveries')
        .insert(toDbInsert(entity, userId))
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const updateDiscovery = useCallback(
    (id: string, patch: Partial<Omit<JobDiscovery, 'id' | 'createdAt'>>) => {
      setDiscoveries((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: now() } : d)),
      )
      supabase
        .from('job_discoveries')
        .update(toDbPatch(patch))
        .eq('id', id)
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  const deleteDiscovery = useCallback(
    (id: string) => {
      setDiscoveries((prev) => prev.filter((d) => d.id !== id))
      supabase
        .from('job_discoveries')
        .delete()
        .eq('id', id)
        .then(({ error }) => { if (error) dbErr(error.message, error) })
    },
    [supabase],
  )

  return (
    <StoreContext.Provider
      value={{
        ready,
        jobs,
        prompts,
        notes,
        resources,
        outreach,
        interviews,
        events,
        emails,
        addJob,
        bulkAddJobs,
        updateJob,
        deleteJob,
        addPrompt,
        updatePrompt,
        deletePrompt,
        addNote,
        updateNote,
        deleteNote,
        addResource,
        updateResource,
        deleteResource,
        addOutreach,
        updateOutreach,
        deleteOutreach,
        addInterview,
        updateInterview,
        deleteInterview,
        addEvent,
        updateEvent,
        deleteEvent,
        addEmail,
        updateEmail,
        deleteEmail,
        discoveries,
        addDiscovery,
        updateDiscovery,
        deleteDiscovery,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
