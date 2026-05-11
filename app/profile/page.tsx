'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/lib/toast'

interface ProfileForm {
  name: string
  targetRoles: string
  preferredLocations: string
  yearsExperience: string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const toast = useToast()
  const supabase = getSupabase()

  const [form, setForm] = useState<ProfileForm>({
    name: '',
    targetRoles: '',
    preferredLocations: '',
    yearsExperience: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            name: data.name ?? '',
            targetRoles: (data.target_roles as string[] ?? []).join(', '),
            preferredLocations: (data.preferred_locations as string[] ?? []).join(', '),
            yearsExperience: data.years_experience != null ? String(data.years_experience) : '',
          })
        }
        setLoading(false)
      })
  }, [user, supabase])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)

    const payload = {
      id: user.id,
      name: form.name || null,
      email: user.email,
      target_roles: form.targetRoles
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      preferred_locations: form.preferredLocations
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      years_experience: form.yearsExperience ? parseInt(form.yearsExperience, 10) : null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('user_profiles').upsert(payload)
    setSaving(false)

    if (error) {
      toast('Failed to save profile', 'error')
    } else {
      toast('Profile saved', 'success')
    }
  }

  function field(
    label: string,
    key: keyof ProfileForm,
    opts?: { placeholder?: string; hint?: string; type?: string },
  ) {
    return (
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
        {opts?.hint && <p className="text-xs text-zinc-400 mb-1.5">{opts.hint}</p>}
        <input
          type={opts?.type ?? 'text'}
          value={form[key]}
          onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
          placeholder={opts?.placeholder}
          className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8 max-w-xl">
        <div className="h-7 w-32 bg-zinc-100 rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-zinc-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Profile</h1>
        <p className="mt-1 text-sm text-zinc-400">{user?.email}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
          {field('Name', 'name', { placeholder: 'Your full name' })}
          {field('Target Roles', 'targetRoles', {
            placeholder: 'Product Manager, APM, Associate PM',
            hint: 'Comma-separated list of roles you are targeting.',
          })}
          {field('Preferred Locations', 'preferredLocations', {
            placeholder: 'San Francisco, New York, Remote',
            hint: 'Comma-separated list of locations.',
          })}
          {field('Years of Experience', 'yearsExperience', {
            placeholder: '3',
            type: 'number',
          })}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
