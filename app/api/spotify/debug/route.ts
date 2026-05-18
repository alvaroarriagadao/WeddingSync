import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Check stored tokens
  const { data: rows } = await supabase
    .from('app_settings')
    .select('key, value, updated_at')
    .eq('key', 'spotify_refresh_token')

  const refreshToken = rows?.[0]?.value
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token in DB', rows })
  }

  // Exchange refresh token for access token
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString(),
    cache: 'no-store',
  })
  const tokenData = await tokenRes.json()

  if (!tokenData.access_token) {
    return NextResponse.json({ error: 'Token refresh failed', tokenData, rowCount: rows?.length })
  }

  // Get authenticated user info
  const meRes = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
    cache: 'no-store',
  })
  const meData = await meRes.json()

  // Try to get playlist info
  const playlistId = process.env.SPOTIFY_PLAYLIST_ID
  const plRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=id,name,owner`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
    cache: 'no-store',
  })
  const plData = await plRes.json()

  return NextResponse.json({
    tokenRowCount: rows?.length,
    tokenUpdatedAt: rows?.[0]?.updated_at,
    scopes: tokenData.scope,
    authenticatedUser: { id: meData.id, display_name: meData.display_name, email: meData.email },
    playlist: { id: plData.id, name: plData.name, owner: plData.owner },
    isOwner: meData.id === plData.owner?.id,
    playlistId,
  })
}
