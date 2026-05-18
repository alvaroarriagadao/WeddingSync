import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function getAccessToken(refreshToken: string): Promise<{ accessToken: string; newRefreshToken?: string; scopes: string }> {
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
    cache: 'no-store',
  })

  const data = await res.json()
  if (!data.access_token) {
    console.error('Token refresh failed', JSON.stringify(data))
    throw new Error('Token refresh failed: ' + JSON.stringify(data))
  }
  console.log('Token scopes:', data.scope)
  return {
    accessToken: data.access_token,
    newRefreshToken: data.refresh_token,
    scopes: data.scope,
  }
}

export async function POST(request: NextRequest) {
  const { trackUri, guestId, song, artist, spotifyUrl } = await request.json()

  if (!trackUri || !guestId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: settingRows } = await supabase
    .from('app_settings')
    .select('value, updated_at')
    .eq('key', 'spotify_refresh_token')
    .order('updated_at', { ascending: false })
    .limit(1)

  const refreshToken = settingRows?.[0]?.value
  console.log('Refresh token found:', !!refreshToken, 'updated_at:', settingRows?.[0]?.updated_at)

  if (!refreshToken) {
    return NextResponse.json({ error: 'Spotify no conectado aún' }, { status: 400 })
  }

  try {
    const { accessToken, newRefreshToken, scopes } = await getAccessToken(refreshToken)
    console.log('Access token obtained, scopes:', scopes)

    // If Spotify issued a new refresh token, persist it
    if (newRefreshToken) {
      console.log('Spotify issued new refresh token — saving to DB')
      await supabase.from('app_settings').delete().eq('key', 'spotify_refresh_token')
      await supabase.from('app_settings').insert({
        key: 'spotify_refresh_token',
        value: newRefreshToken,
        updated_at: new Date().toISOString(),
      })
    }

    const playlistId = process.env.SPOTIFY_PLAYLIST_ID
    console.log('Adding track', trackUri, 'to playlist', playlistId)

    const spotifyRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/items`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: [trackUri] }),
        cache: 'no-store',
      }
    )

    if (!spotifyRes.ok) {
      let errBody: any = {}
      try { errBody = await spotifyRes.json() } catch { /* ignore */ }
      console.error('Spotify add-track error', spotifyRes.status, JSON.stringify(errBody))
      const msg = errBody?.error?.message || errBody?.error || `Spotify error ${spotifyRes.status}`
      return NextResponse.json({
        error: msg,
        spotifyStatus: spotifyRes.status,
        detail: errBody,
        scopes,
        playlistId,
        trackUri,
      }, { status: 400 })
    }

    await supabase.from('playlist').insert([{
      guest_id: guestId,
      song,
      artist,
      spotify_url: spotifyUrl,
    }])

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
