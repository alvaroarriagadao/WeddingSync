'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getStoredUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function GuestPlaylistPage() {
  const [user, setUser] = useState<any>(null)
  const [songs, setSongs] = useState<any[]>([])
  const [artist, setArtist] = useState('')
  const [song, setSong] = useState('')
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    if (!u) { router.push('/'); return }
    setUser(u)
    loadSongs()
  }, [])

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
    toast.success('¡Canción añadida! 🎵')
    setArtist(''); setSong(''); setSpotifyUrl(''); setShowForm(false); setAdding(false)
    loadSongs()
  }

  function copyAll() {
    const text = songs.map(s => `${s.artist} - ${s.song}`).join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Lista copiada al portapapeles 📋')
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-wedding-sand">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-4xl">🎵</span>
            <h1 className="text-3xl sm:text-4xl font-serif text-wedding-dark">Playlist Colaborativa</h1>
          </div>
          <p className="text-wedding-dark/60">Añade las canciones que no pueden faltar en la fiesta</p>
        </motion.div>

        {/* Jukebox decoration */}
        <motion.div
          className="relative bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-3xl p-6 mb-6 overflow-hidden shadow-xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Vinyl decoration */}
          <motion.div
            className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full border-8 border-white/20 opacity-30"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          >
            <div className="absolute inset-4 rounded-full border-4 border-white/30" />
            <div className="absolute inset-8 rounded-full bg-white/20" />
          </motion.div>

          <div className="relative z-10">
            <p className="text-white/70 text-sm mb-1">🎙️ Canciones en la lista</p>
            <p className="text-5xl font-serif text-white font-bold mb-3">{songs.length}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 bg-white text-purple-700 rounded-xl font-semibold text-sm hover:bg-opacity-90 transition-all"
              >
                + Añadir canción
              </button>
              {songs.length > 0 && (
                <button
                  onClick={copyAll}
                  className="px-4 py-2 bg-white/20 text-white rounded-xl font-semibold text-sm hover:bg-white/30 transition-all"
                >
                  📋 Copiar lista
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Add form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              className="bg-white rounded-2xl p-5 mb-5 shadow-sm"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <h3 className="font-serif text-wedding-dark mb-4 text-lg">🎵 Tu canción</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-wedding-dark/60 mb-1">Artista *</label>
                    <input value={artist} onChange={e => setArtist(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-purple-400 text-sm"
                      placeholder="Ej: Bad Bunny" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-wedding-dark/60 mb-1">Canción *</label>
                    <input value={song} onChange={e => setSong(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-purple-400 text-sm"
                      placeholder="Ej: Tití Me Preguntó" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-wedding-dark/60 mb-1">Link Spotify (opcional)</label>
                  <input value={spotifyUrl} onChange={e => setSpotifyUrl(e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-purple-400 text-sm"
                    placeholder="https://open.spotify.com/track/..." />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 border-2 border-wedding-sand rounded-xl text-sm font-medium text-wedding-dark/60 hover:bg-wedding-sand">
                    Cancelar
                  </button>
                  <button onClick={addSong} disabled={adding}
                    className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-all disabled:opacity-50">
                    {adding ? 'Añadiendo...' : '🎵 Añadir'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Song list */}
        {songs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎙️</div>
            <p className="text-wedding-dark/50 font-serif text-lg">¡Sé el primero en añadir una canción!</p>
          </div>
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
                  <span className="text-wedding-dark/30 text-sm font-mono group-hover:hidden">{String(i + 1).padStart(2, '0')}</span>
                  <span className="hidden group-hover:block text-lg">🎵</span>
                </div>

                {/* Song info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-wedding-dark truncate">{s.song}</p>
                  <p className="text-sm text-wedding-dark/60 truncate">{s.artist}</p>
                </div>

                {/* Added by + Spotify */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-wedding-dark/40 hidden sm:block">
                    {s.guests?.name?.split(' ')[0]}
                  </span>
                  {s.spotify_url && (
                    <a href={s.spotify_url} target="_blank" rel="noopener noreferrer"
                      className="text-green-500 hover:text-green-600 transition-colors"
                      title="Abrir en Spotify">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
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
