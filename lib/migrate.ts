import type { SupabaseClient } from '@supabase/supabase-js'
import { toDbInsert } from './supabase/mappers'

const LS_KEYS = {
  jobs: 'jsos:jobs',
  prompts: 'jsos:prompts',
  notes: 'jsos:notes',
  resources: 'jsos:resources',
  outreach: 'jsos:outreach',
  interviews: 'jsos:interviews',
  events: 'jsos:events',
  emails: 'jsos:emails',
}

export const MIGRATED_KEY = 'jsos:migrated'

export function hasLocalStorageData(): boolean {
  try {
    return Object.values(LS_KEYS).some((key) => {
      const raw = localStorage.getItem(key)
      if (!raw) return false
      const data = JSON.parse(raw)
      return Array.isArray(data) && data.length > 0
    })
  } catch {
    return false
  }
}

export async function migrateToSupabase(
  userId: string,
  supabase: SupabaseClient,
): Promise<{ error?: string }> {
  const tables: Array<{ lsKey: string; table: string }> = [
    { lsKey: LS_KEYS.jobs, table: 'jobs' },
    { lsKey: LS_KEYS.prompts, table: 'prompts' },
    { lsKey: LS_KEYS.notes, table: 'research_notes' },
    { lsKey: LS_KEYS.resources, table: 'resources' },
    { lsKey: LS_KEYS.outreach, table: 'outreach' },
    { lsKey: LS_KEYS.interviews, table: 'interviews' },
    { lsKey: LS_KEYS.events, table: 'events' },
    { lsKey: LS_KEYS.emails, table: 'emails' },
  ]

  for (const { lsKey, table } of tables) {
    try {
      const raw = localStorage.getItem(lsKey)
      if (!raw) continue
      const items: Record<string, unknown>[] = JSON.parse(raw)
      if (!items.length) continue
      const rows = items.map((item) => toDbInsert(item, userId))
      const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' })
      if (error) return { error: error.message }
    } catch (err) {
      return { error: String(err) }
    }
  }

  // Clear localStorage after successful migration
  Object.values(LS_KEYS).forEach((k) => localStorage.removeItem(k))
  localStorage.setItem(MIGRATED_KEY, 'true')

  return {}
}
