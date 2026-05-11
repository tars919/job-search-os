import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false })

  const { data } = await supabase
    .from('gmail_tokens')
    .select('gmail_address, last_synced_at')
    .eq('user_id', user.id)
    .single()

  if (!data) return NextResponse.json({ connected: false })

  return NextResponse.json({
    connected: true,
    gmailAddress: (data as { gmail_address: string; last_synced_at: string | null }).gmail_address,
    lastSyncedAt: (data as { gmail_address: string; last_synced_at: string | null }).last_synced_at,
  })
}
