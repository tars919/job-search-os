'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  startTransition,
  type ReactNode,
} from 'react'
import type { Job, Outreach, InterviewPrep, CalendarEvent, EmailMessage, PromptEntry, ResearchNote, Resource } from './types'
import { SEED_JOBS, SEED_PROMPTS, SEED_NOTES } from './seed'

const KEYS = {
  jobs: 'jsos:jobs',
  prompts: 'jsos:prompts',
  notes: 'jsos:notes',
  resources: 'jsos:resources',
  outreach: 'jsos:outreach',
  interviews: 'jsos:interviews',
  events: 'jsos:events',
  emails: 'jsos:emails',
}

function now() {
  return new Date().toISOString()
}

function uid() {
  return crypto.randomUUID()
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

interface Store {
  ready: boolean
  jobs: Job[]
  prompts: PromptEntry[]
  notes: ResearchNote[]
  resources: Resource[]
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
  outreach: Outreach[]
  addOutreach: (outreach: Omit<Outreach, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateOutreach: (id: string, patch: Partial<Omit<Outreach, 'id' | 'createdAt'>>) => void
  deleteOutreach: (id: string) => void
  interviews: InterviewPrep[]
  addInterview: (interview: Omit<InterviewPrep, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateInterview: (id: string, patch: Partial<Omit<InterviewPrep, 'id' | 'createdAt'>>) => void
  deleteInterview: (id: string) => void
  events: CalendarEvent[]
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateEvent: (id: string, patch: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>) => void
  deleteEvent: (id: string) => void
  emails: EmailMessage[]
  addEmail: (email: Omit<EmailMessage, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateEmail: (id: string, patch: Partial<Omit<EmailMessage, 'id' | 'createdAt'>>) => void
  deleteEmail: (id: string) => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [prompts, setPrompts] = useState<PromptEntry[]>([])
  const [notes, setNotes] = useState<ResearchNote[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [outreach, setOutreach] = useState<Outreach[]>([])
  const [interviews, setInterviews] = useState<InterviewPrep[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [emails, setEmails] = useState<EmailMessage[]>([])

  useEffect(() => {
    startTransition(() => {
      setJobs(load(KEYS.jobs, SEED_JOBS))
      setPrompts(load(KEYS.prompts, SEED_PROMPTS))
      setNotes(load(KEYS.notes, SEED_NOTES))
      setResources(load(KEYS.resources, []))
      setOutreach(load(KEYS.outreach, []))
      setInterviews(load(KEYS.interviews, []))
      setEvents(load(KEYS.events, []))
      setEmails(load(KEYS.emails, []))
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (ready) localStorage.setItem(KEYS.jobs, JSON.stringify(jobs))
  }, [jobs, ready])

  useEffect(() => {
    if (ready) localStorage.setItem(KEYS.prompts, JSON.stringify(prompts))
  }, [prompts, ready])

  useEffect(() => {
    if (ready) localStorage.setItem(KEYS.notes, JSON.stringify(notes))
  }, [notes, ready])

  useEffect(() => {
    if (ready) localStorage.setItem(KEYS.resources, JSON.stringify(resources))
  }, [resources, ready])

  useEffect(() => {
    if (ready) localStorage.setItem(KEYS.outreach, JSON.stringify(outreach))
  }, [outreach, ready])

  useEffect(() => {
    if (ready) localStorage.setItem(KEYS.interviews, JSON.stringify(interviews))
  }, [interviews, ready])

  useEffect(() => {
    if (ready) localStorage.setItem(KEYS.events, JSON.stringify(events))
  }, [events, ready])

  useEffect(() => {
    if (ready) localStorage.setItem(KEYS.emails, JSON.stringify(emails))
  }, [emails, ready])

  const addJob = useCallback(
    (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => {
      const ts = now()
      setJobs((prev) => [{ ...job, id: uid(), createdAt: ts, updatedAt: ts }, ...prev])
    },
    [],
  )

  const bulkAddJobs = useCallback(
    (newJobs: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>[]) => {
      const ts = now()
      setJobs((prev) => [
        ...newJobs.map((j) => ({ ...j, id: uid(), createdAt: ts, updatedAt: ts })),
        ...prev,
      ])
    },
    [],
  )

  const updateJob = useCallback(
    (id: string, patch: Partial<Omit<Job, 'id' | 'createdAt'>>) => {
      setJobs((prev) =>
        prev.map((j) => (j.id === id ? { ...j, ...patch, updatedAt: now() } : j)),
      )
    },
    [],
  )

  const deleteJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id))
  }, [])

  const addPrompt = useCallback(
    (prompt: Omit<PromptEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
      const ts = now()
      setPrompts((prev) => [{ ...prompt, id: uid(), createdAt: ts, updatedAt: ts }, ...prev])
    },
    [],
  )

  const updatePrompt = useCallback(
    (id: string, patch: Partial<Omit<PromptEntry, 'id' | 'createdAt'>>) => {
      setPrompts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: now() } : p)),
      )
    },
    [],
  )

  const deletePrompt = useCallback((id: string) => {
    setPrompts((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const addNote = useCallback(
    (note: Omit<ResearchNote, 'id' | 'createdAt' | 'updatedAt'>) => {
      const ts = now()
      setNotes((prev) => [{ ...note, id: uid(), createdAt: ts, updatedAt: ts }, ...prev])
    },
    [],
  )

  const updateNote = useCallback(
    (id: string, patch: Partial<Omit<ResearchNote, 'id' | 'createdAt'>>) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now() } : n)),
      )
    },
    [],
  )

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const addResource = useCallback(
    (resource: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => {
      const ts = now()
      setResources((prev) => [{ ...resource, id: uid(), createdAt: ts, updatedAt: ts }, ...prev])
    },
    [],
  )

  const updateResource = useCallback(
    (id: string, patch: Partial<Omit<Resource, 'id' | 'createdAt'>>) => {
      setResources((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now() } : r)),
      )
    },
    [],
  )

  const deleteResource = useCallback((id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const addOutreach = useCallback(
    (o: Omit<Outreach, 'id' | 'createdAt' | 'updatedAt'>) => {
      const ts = now()
      setOutreach((prev) => [{ ...o, id: uid(), createdAt: ts, updatedAt: ts }, ...prev])
    },
    [],
  )

  const updateOutreach = useCallback(
    (id: string, patch: Partial<Omit<Outreach, 'id' | 'createdAt'>>) => {
      setOutreach((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...patch, updatedAt: now() } : o)),
      )
    },
    [],
  )

  const deleteOutreach = useCallback((id: string) => {
    setOutreach((prev) => prev.filter((o) => o.id !== id))
  }, [])

  const addInterview = useCallback(
    (interview: Omit<InterviewPrep, 'id' | 'createdAt' | 'updatedAt'>) => {
      const ts = now()
      setInterviews((prev) => [{ ...interview, id: uid(), createdAt: ts, updatedAt: ts }, ...prev])
    },
    [],
  )

  const updateInterview = useCallback(
    (id: string, patch: Partial<Omit<InterviewPrep, 'id' | 'createdAt'>>) => {
      setInterviews((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: now() } : i)),
      )
    },
    [],
  )

  const deleteInterview = useCallback((id: string) => {
    setInterviews((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const addEvent = useCallback(
    (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
      const ts = now()
      setEvents((prev) => [{ ...event, id: uid(), createdAt: ts, updatedAt: ts }, ...prev])
    },
    [],
  )

  const updateEvent = useCallback(
    (id: string, patch: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>) => {
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now() } : e)),
      )
    },
    [],
  )

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const addEmail = useCallback(
    (email: Omit<EmailMessage, 'id' | 'createdAt' | 'updatedAt'>) => {
      const ts = now()
      setEmails((prev) => [{ ...email, id: uid(), createdAt: ts, updatedAt: ts }, ...prev])
    },
    [],
  )

  const updateEmail = useCallback(
    (id: string, patch: Partial<Omit<EmailMessage, 'id' | 'createdAt'>>) => {
      setEmails((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now() } : e)),
      )
    },
    [],
  )

  const deleteEmail = useCallback((id: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== id))
  }, [])

  return (
    <StoreContext.Provider
      value={{
        ready,
        jobs,
        prompts,
        notes,
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
        resources,
        addResource,
        updateResource,
        deleteResource,
        outreach,
        addOutreach,
        updateOutreach,
        deleteOutreach,
        interviews,
        addInterview,
        updateInterview,
        deleteInterview,
        events,
        addEvent,
        updateEvent,
        deleteEvent,
        emails,
        addEmail,
        updateEmail,
        deleteEmail,
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
