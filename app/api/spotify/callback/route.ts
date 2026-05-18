import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://weddingsync.vercel.app'

  if (error || !code) {
    return NextResponse.redirect(`${base}/dashboard/playlist?spotify_error=denied`)
  }

  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    }).toString(),
    cache: 'no-store',
  })

  const data = await tokenRes.json()

  if (!data.refresh_token) {
    return NextResponse.redirect(`${base}/dashboard/playlist?spotify_error=no_token`)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  await supabase.from('app_settings').upsert(
    { key: 'spotify_refresh_token', value: data.refresh_token, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )

  return NextResponse.redirect(`${base}/dashboard/playlist?spotify_connected=1`)
}
