'use client'

import { useState, useEffect } from 'react'
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

export default function GuestPlaylistPage() {
  const [user, setUser] = useState<any>(null)
  const [songs, setSongs] = useState<any[]>([])
  const [artist, setArtist] = useState('')
  const [song, setSong] = useState('')
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    if (!u) { router.push('/'); return }
    setUser(u)
    loadSongs()
    loadPlaylistUrl()
  }, [])

  async function loadPlaylistUrl() {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'spotify_playlist_url')
      .single()
    if (data?.value) setPlaylistUrl(data.value)
  }

  async function loadSongs() {
    const { data } = await supabase
      .from('playlist')
      .select('*, guests(name)')
      .order('created_at', { ascending: false })
    if (data) setSongs(data)
  }

  async function addSong() {
    if (!artist.trim() || !song.trim()) { toast.error('Artista y canción son obligatorios'); return }
    setAdding(true)
    const { error } = await supabase.from('playlist').insert([{
      guest_id: user.id, artist: artist.trim(), song: song.trim(),
      spotify_url: spotifyUrl.trim() || null,
    }])
    if (error) { toast.error('Error al añadir'); setAdding(false); return }
    toast.success('¡Canción añadida!')
    setArtist(''); setSong(''); setSpotifyUrl(''); setShowForm(false); setAdding(false)
    loadSongs()
  }

  function copyAll() {
    const text = songs.map(s => `${s.artist} - ${s.song}`).join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Lista copiada al portapapeles')
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-wedding-sand font-guest">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-guest-serif text-wedding-dark tracking-wide">
            Playlist Colaborativa
          </h1>
          <p className="font-guest text-wedding-dark/60 mt-1 text-sm">
            Añade las canciones que no pueden faltar en la fiesta
          </p>
        </motion.div>

        {/* Spotify hero section */}
        <motion.div
          className="relative bg-gradient-to-br from-[#191414] via-[#1a1a2e] to-[#191414] rounded-3xl p-6 mb-6 overflow-hidden shadow-xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-40 h-40 opacity-5">
            <SpotifyLogo className="w-full h-full text-white" />
          </div>
          <motion.div
            className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full border-8 border-white/10 opacity-20"
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          >
            <div className="absolute inset-4 rounded-full border-4 border-white/20" />
            <div className="absolute inset-8 rounded-full bg-white/10" />
          </motion.div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <SpotifyLogo className="w-10 h-10 text-[#1DB954]" />
              <div>
                <p className="font-guest text-white/60 text-xs uppercase tracking-wider">Playlist de la boda</p>
                <p className="font-guest-serif text-white text-lg">La Fiesta</p>
              </div>
            </div>

            <p className="text-4xl font-guest-serif text-white font-bold mb-1">{songs.length}</p>
            <p className="font-guest text-white/50 text-sm mb-4">canciones añadidas</p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-5 py-2.5 bg-[#1DB954] text-white rounded-full font-guest font-semibold text-sm hover:bg-[#1ed760] transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Añadir canción
              </button>
              {playlistUrl && (
                <a
                  href={playlistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-white/10 text-white rounded-full font-guest font-semibold text-sm hover:bg-white/20 transition-all flex items-center gap-2 backdrop-blur-sm"
                >
                  <SpotifyLogo className="w-4 h-4 text-[#1DB954]" />
                  Abrir Playlist en Spotify
                </a>
              )}
              {songs.length > 0 && (
                <button
                  onClick={copyAll}
                  className="px-4 py-2.5 bg-white/10 text-white rounded-full font-guest font-semibold text-sm hover:bg-white/20 transition-all backdrop-blur-sm"
                >
                  Copiar lista
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Spotify playlist link (if exists) */}
        {playlistUrl && (
          <motion.a
            href={playlistUrl}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="block bg-[#1DB954]/10 border-2 border-[#1DB954]/20 rounded-2xl p-4 mb-6 hover:bg-[#1DB954]/15 transition-all group"
          >
            <div className="flex items-center gap-3">
              <SpotifyLogo className="w-8 h-8 text-[#1DB954] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-guest font-semibold text-wedding-dark text-sm">Playlist compartida por los novios</p>
                <p className="font-guest text-xs text-wedding-dark/50 truncate">{playlistUrl}</p>
              </div>
              <svg className="w-5 h-5 text-[#1DB954] flex-shrink-0 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </div>
          </motion.a>
        )}

        {/* Add song form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-wedding-sand"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <h3 className="font-guest-serif text-wedding-dark mb-4 text-lg">Tu canción</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-guest font-semibold text-wedding-dark/60 mb-1">Artista *</label>
                    <input value={artist} onChange={e => setArtist(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-[#1DB954]/50 text-sm font-guest"
                      placeholder="Ej: Bad Bunny" />
                  </div>
                  <div>
                    <label className="block text-xs font-guest font-semibold text-wedding-dark/60 mb-1">Canción *</label>
                    <input value={song} onChange={e => setSong(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-[#1DB954]/50 text-sm font-guest"
                      placeholder="Ej: Titi Me Pregunto" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-guest font-semibold text-wedding-dark/60 mb-1">Link de Spotify (opcional)</label>
                  <input value={spotifyUrl} onChange={e => setSpotifyUrl(e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-[#1DB954]/50 text-sm font-guest"
                    placeholder="https://open.spotify.com/track/..." />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 border-2 border-wedding-sand rounded-xl text-sm font-guest font-medium text-wedding-dark/60 hover:bg-wedding-sand transition-colors">
                    Cancelar
                  </button>
                  <button onClick={addSong} disabled={adding}
                    className="flex-1 py-2.5 bg-[#1DB954] text-white rounded-xl text-sm font-guest font-semibold hover:bg-[#1ed760] transition-all disabled:opacity-50">
                    {adding ? 'Añadiendo...' : 'Añadir'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Song list */}
        {songs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white rounded-2xl shadow-sm"
          >
            <SpotifyLogo className="w-12 h-12 mx-auto mb-4 text-[#1DB954]/30" />
            <p className="text-wedding-dark/50 font-guest-serif text-lg mb-2">¡Sé el primero en añadir una canción!</p>
            <button onClick={() => setShowForm(true)} className="font-guest text-[#1DB954] hover:underline text-sm">
              Añadir canción
            </button>
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
                {/* Track number */}
                <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                  <span className="font-guest text-wedding-dark/30 text-sm font-mono group-hover:hidden">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <SpotifyLogo className="w-5 h-5 text-[#1DB954] hidden group-hover:block" />
                </div>

                {/* Song info */}
                <div className="flex-1 min-w-0">
                  <p className="font-guest font-semibold text-wedding-dark truncate">{s.song}</p>
                  <p className="font-guest text-sm text-wedding-dark/60 truncate">{s.artist}</p>
                </div>

                {/* Added by + Spotify link */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-guest text-xs text-wedding-dark/40 hidden sm:block">
                    {s.guests?.name?.split(' ')[0]}
                  </span>
                  {s.spotify_url && (
                    <a href={s.spotify_url} target="_blank" rel="noopener noreferrer"
                      className="text-[#1DB954] hover:text-[#1ed760] transition-colors"
                      title="Abrir en Spotify">
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
