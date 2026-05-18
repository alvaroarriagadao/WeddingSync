'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getStoredUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

function SpotifyLogo({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  )
}

function msToMin(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function GuestPlaylistPage() {
  const [user, setUser] = useState<any>(null)
  const [songs, setSongs] = useState<any[]>([])
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null)
  const [spotifyConnected, setSpotifyConnected] = useState(false)

  // Search state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [addingTrack, setAddingTrack] = useState<string | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Manual fallback
  const [showManual, setShowManual] = useState(false)
  const [manual, setManual] = useState({ song: '', artist: '', spotify_url: '' })
  const [savingManual, setSavingManual] = useState(false)

  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    if (!u) { router.push('/'); return }
    setUser(u)
    loadSongs()
    loadSettings()
  }, [])

  async function loadSettings() {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['spotify_playlist_url', 'spotify_refresh_token'])

    if (data) {
      const map = Object.fromEntries(data.map((r: any) => [r.key, r.value]))
      if (map.spotify_playlist_url) setPlaylistUrl(map.spotify_playlist_url)
      if (map.spotify_refresh_token) setSpotifyConnected(true)
    }
  }

  async function loadSongs() {
    const { data } = await supabase
      .from('playlist')
      .select('*, guests(name)')
      .order('created_at', { ascending: false })
    if (data) setSongs(data)
  }

  function onQueryChange(val: string) {
    setQuery(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!val.trim()) { setResults([]); return }
    searchTimer.current = setTimeout(() => searchTracks(val), 400)
  }

  async function searchTracks(q: string) {
    setSearching(true)
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.tracks?.items || [])
    } catch {
      toast.error('Error al buscar')
    } finally {
      setSearching(false)
    }
  }

  async function addTrack(track: any) {
    if (!user) return
    setAddingTrack(track.id)
    try {
      const res = await fetch('/api/spotify/add-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackUri: track.uri,
          guestId: user.id,
          song: track.name,
          artist: track.artists.map((a: any) => a.name).join(', '),
          spotifyUrl: track.external_urls?.spotify,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Error al añadir')
      } else {
        toast.success(`"${track.name}" añadida a la playlist 🎉`)
        setQuery('')
        setResults([])
        loadSongs()
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setAddingTrack(null)
    }
  }

  async function addManual() {
    if (!manual.song.trim() || !manual.artist.trim()) {
      toast.error('Artista y canción son obligatorios')
      return
    }
    setSavingManual(true)
    const { error } = await supabase.from('playlist').insert([{
      guest_id: user.id,
      artist: manual.artist.trim(),
      song: manual.song.trim(),
      spotify_url: manual.spotify_url.trim() || null,
    }])
    if (error) { toast.error('Error al añadir'); setSavingManual(false); return }
    toast.success('¡Canción añadida!')
    setManual({ song: '', artist: '', spotify_url: '' })
    setShowManual(false)
    setSavingManual(false)
    loadSongs()
  }

  function copyAll() {
    const text = songs.map(s => `${s.artist} - ${s.song}`).join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Lista copiada')
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-wedding-sand font-guest">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-guest-serif text-wedding-dark tracking-wide">
              Playlist Colaborativa
            </h1>
            <p className="font-guest text-wedding-dark/60 mt-1 text-sm">
              {songs.length} canciones · Añade la tuya 🎵
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {playlistUrl && (
              <a href={playlistUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-white border-2 border-wedding-sand rounded-xl text-xs font-guest font-semibold text-wedding-dark/70 hover:border-[#1DB954] hover:text-[#1DB954] transition-all">
                <SpotifyLogo className="w-3.5 h-3.5" />
                Abrir
              </a>
            )}
            {songs.length > 0 && (
              <button onClick={copyAll}
                className="px-3 py-2 bg-white border-2 border-wedding-sand rounded-xl text-xs font-guest font-semibold text-wedding-dark/70 hover:border-wedding-coral hover:text-wedding-coral transition-all">
                Copiar lista
              </button>
            )}
          </div>
        </motion.div>

        {/* Spotify embed player */}
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <iframe
            style={{ borderRadius: '16px' }}
            src="https://open.spotify.com/embed/playlist/78QEQ1bo6fYT1e1PZtngmv?utm_source=generator"
            width="100%"
            height="352"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </motion.div>

        {/* Spotify search (when connected) */}
        {spotifyConnected ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                {searching ? (
                  <div className="w-4 h-4 border-2 border-[#1DB954]/40 border-t-[#1DB954] rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-wedding-dark/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                )}
              </div>
              <input
                value={query}
                onChange={e => onQueryChange(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-wedding-sand rounded-2xl focus:outline-none focus:border-[#1DB954]/50 font-guest text-sm shadow-sm"
                placeholder="Busca una canción o artista en Spotify..."
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setResults([]) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-wedding-dark/30 hover:text-wedding-dark/60 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Search results */}
            <AnimatePresence>
              {results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mt-2 bg-white rounded-2xl shadow-lg border border-wedding-sand overflow-hidden"
                >
                  {results.map((track, i) => {
                    const isAdding = addingTrack === track.id
                    const album = track.album?.images?.[2] || track.album?.images?.[0]
                    return (
                      <motion.button
                        key={track.id}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1DB954]/5 transition-colors border-b border-wedding-sand last:border-b-0 text-left"
                        onClick={() => addTrack(track)}
                        disabled={isAdding}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        {album ? (
                          <img src={album.url} alt="" className="w-10 h-10 rounded-lg flex-shrink-0 object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-wedding-sand flex-shrink-0 flex items-center justify-center">
                            <SpotifyLogo className="w-5 h-5 text-[#1DB954]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-guest font-semibold text-wedding-dark text-sm truncate">{track.name}</p>
                          <p className="font-guest text-xs text-wedding-dark/50 truncate">
                            {track.artists.map((a: any) => a.name).join(', ')} · {track.album?.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-guest text-xs text-wedding-dark/40">{msToMin(track.duration_ms)}</span>
                          {isAdding ? (
                            <div className="w-5 h-5 border-2 border-[#1DB954]/40 border-t-[#1DB954] rounded-full animate-spin" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#1DB954] flex items-center justify-center flex-shrink-0 hover:bg-[#1ed760] transition-colors">
                              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </motion.button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Manual fallback link */}
            <p className="text-center text-xs text-wedding-dark/40 mt-3">
              ¿No encuentras la canción?{' '}
              <button onClick={() => setShowManual(v => !v)} className="text-wedding-coral hover:underline">
                Añadir manualmente
              </button>
            </p>
          </motion.div>
        ) : (
          /* No Spotify connected — show manual form button */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <button
              onClick={() => setShowManual(v => !v)}
              className={`w-full px-5 py-3 rounded-2xl font-guest font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                showManual ? 'bg-wedding-gold text-white' : 'bg-white border-2 border-wedding-sand text-wedding-dark/70 hover:border-wedding-gold'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Añadir canción
            </button>
          </motion.div>
        )}

        {/* Manual form */}
        <AnimatePresence>
          {showManual && (
            <motion.div
              className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-wedding-sand"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <h3 className="font-guest-serif text-wedding-dark mb-4 text-lg">Añadir manualmente</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input value={manual.song} onChange={e => setManual(s => ({ ...s, song: e.target.value }))}
                    className="w-full px-3 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-[#1DB954]/50 text-sm font-guest"
                    placeholder="Nombre de la canción *" />
                  <input value={manual.artist} onChange={e => setManual(s => ({ ...s, artist: e.target.value }))}
                    className="w-full px-3 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-[#1DB954]/50 text-sm font-guest"
                    placeholder="Artista *" />
                </div>
                <input value={manual.spotify_url} onChange={e => setManual(s => ({ ...s, spotify_url: e.target.value }))}
                  className="w-full px-3 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-[#1DB954]/50 text-sm font-guest"
                  placeholder="URL de Spotify (opcional)" />
                <div className="flex gap-2">
                  <button onClick={() => setShowManual(false)}
                    className="flex-1 py-2.5 border-2 border-wedding-sand rounded-xl text-sm font-guest font-medium text-wedding-dark/60 hover:bg-wedding-sand">
                    Cancelar
                  </button>
                  <button onClick={addManual} disabled={savingManual}
                    className="flex-1 py-2.5 bg-[#1DB954] text-white rounded-xl text-sm font-guest font-semibold hover:bg-[#1ed760] disabled:opacity-50">
                    {savingManual ? 'Añadiendo...' : 'Añadir'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Song list */}
        {songs.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <SpotifyLogo className="w-12 h-12 mx-auto mb-4 text-[#1DB954]/30" />
            <p className="text-wedding-dark/50 font-guest-serif text-lg mb-2">¡Sé el primero en añadir!</p>
            <p className="font-guest text-wedding-dark/40 text-sm">Busca una canción arriba</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {songs.map((s, i) => (
              <motion.div
                key={s.id}
                className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all group"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                  <span className="font-guest text-wedding-dark/30 text-sm font-mono group-hover:hidden">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <SpotifyLogo className="w-5 h-5 text-[#1DB954] hidden group-hover:block" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-guest font-semibold text-wedding-dark truncate">{s.song}</p>
                  <p className="font-guest text-sm text-wedding-dark/60 truncate">{s.artist}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-guest text-xs text-wedding-dark/40 hidden sm:block">
                    {s.guests?.name?.split(' ')[0]}
                  </span>
                  {s.spotify_url && (
                    <a href={s.spotify_url} target="_blank" rel="noopener noreferrer"
                      className="text-[#1DB954] hover:text-[#1ed760] transition-colors">
                      <SpotifyLogo className="w-[18px] h-[18px]" />
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
