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
  if (!data.access_token) throw new Error('Token refresh failed')
  return data.access_token
}

function spotifyUriFromUrl(url: string): string | null {
  // https://open.spotify.com/track/3sK8wGT43QFpWrvNQsrQya → spotify:track:3sK8wGT43QFpWrvNQsrQya
  const match = url.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/)
  return match ? `spotify:track:${match[1]}` : null
}

export async function DELETE(request: NextRequest) {
  const { supabaseId, spotifyUrl } = await request.json()

  if (!supabaseId) {
    return NextResponse.json({ error: 'Missing supabaseId' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Remove from Spotify if we have a URL
  if (spotifyUrl) {
    const trackUri = spotifyUriFromUrl(spotifyUrl)
    if (trackUri) {
      const { data: settingRows } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'spotify_refresh_token')
        .order('updated_at', { ascending: false })
        .limit(1)

      const refreshToken = settingRows?.[0]?.value
      if (refreshToken) {
        try {
          const accessToken = await getAccessToken(refreshToken)
          const playlistId = process.env.SPOTIFY_PLAYLIST_ID

          const spotifyRes = await fetch(
            `https://api.spotify.com/v1/playlists/${playlistId}/items`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ tracks: [{ uri: trackUri }] }),
              cache: 'no-store',
            }
          )

          if (!spotifyRes.ok) {
            const errBody = await spotifyRes.json().catch(() => ({}))
            console.error('Spotify remove error', spotifyRes.status, JSON.stringify(errBody))
          }
        } catch (err) {
          console.error('Spotify remove failed (continuing with DB delete):', err)
        }
      }
    }
  }

  // Always delete from Supabase regardless of Spotify result
  const { error } = await supabase.from('playlist').delete().eq('id', supabaseId)
  if (error) {
    return NextResponse.json({ error: 'DB delete failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
