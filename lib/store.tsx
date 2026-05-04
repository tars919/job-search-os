'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { Job, PromptEntry, ResearchNote, Resource } from './types'
import { SEED_JOBS, SEED_PROMPTS, SEED_NOTES } from './seed'

const KEYS = {
  jobs: 'jsos:jobs',
  prompts: 'jsos:prompts',
  notes: 'jsos:notes',
  resources: 'jsos:resources',
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
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [prompts, setPrompts] = useState<PromptEntry[]>([])
  const [notes, setNotes] = useState<ResearchNote[]>([])
  const [resources, setResources] = useState<Resource[]>([])

  useEffect(() => {
    setJobs(load(KEYS.jobs, SEED_JOBS))
    setPrompts(load(KEYS.prompts, SEED_PROMPTS))
    setNotes(load(KEYS.notes, SEED_NOTES))
    setResources(load(KEYS.resources, []))
    setReady(true)
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
