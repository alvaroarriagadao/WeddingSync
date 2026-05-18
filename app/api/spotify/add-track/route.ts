import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function getAccessToken(refreshToken: string): Promise<string> {
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
    throw new Error('Token refresh failed')
  }
  console.log('Token scopes:', data.scope)
  return data.access_token
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

  const { data: setting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'spotify_refresh_token')
    .single()

  if (!setting?.value) {
    return NextResponse.json({ error: 'Spotify no conectado aún' }, { status: 400 })
  }

  try {
    const accessToken = await getAccessToken(setting.value)
    const playlistId = process.env.SPOTIFY_PLAYLIST_ID

    const spotifyRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
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
      const msg = errBody?.error?.message || errBody?.error || `Spotify ${spotifyRes.status}`
      return NextResponse.json({ error: msg }, { status: 400 })
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
