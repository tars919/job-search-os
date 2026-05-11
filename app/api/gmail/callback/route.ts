import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const nonce = req.cookies.get('gmail_oauth_nonce')?.value

  const clearNonce = (res: NextResponse) => {
    res.cookies.delete('gmail_oauth_nonce')
    return res
  }

  if (error || !code || !state || !nonce || state !== nonce) {
    return clearNonce(NextResponse.redirect(new URL('/email?error=gmail_denied', req.url)))
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return clearNonce(NextResponse.redirect(new URL('/email?error=token_exchange', req.url)))
  }

  const tokens = await tokenRes.json() as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }
  const { access_token, refresh_token, expires_in } = tokens

  // Fetch Gmail address from Google userinfo
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  if (!profileRes.ok) {
    return clearNonce(NextResponse.redirect(new URL('/email?error=profile_fetch', req.url)))
  }
  const profile = await profileRes.json() as { email: string }

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return clearNonce(NextResponse.redirect(new URL('/auth', req.url)))
  }

  const expiry = new Date(Date.now() + expires_in * 1000).toISOString()

  await supabase.from('gmail_tokens').upsert(
    {
      user_id: user.id,
      gmail_address: profile.email,
      access_token,
      refresh_token: refresh_token ?? null,
      token_expiry: expiry,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  return clearNonce(NextResponse.redirect(new URL('/email?connected=true', req.url)))
}
