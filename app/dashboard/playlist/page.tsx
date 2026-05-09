'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
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

export default function AdminPlaylistPage() {
  const [user, setUser] = useState<any>(null)
  const [songs, setSongs] = useState<any[]>([])
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [savedUrl, setSavedUrl] = useState('')
  const [savingUrl, setSavingUrl] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    if (!u || u.role !== 'admin') { router.push('/'); return }
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
    if (data?.value) {
      setPlaylistUrl(data.value)
      setSavedUrl(data.value)
    }
  }

  async function savePlaylistUrl() {
    if (!playlistUrl.trim()) { toast.error('Ingresa una URL de Spotify'); return }
    setSavingUrl(true)
    const { error } = await supabase.from('app_settings').upsert({
      key: 'spotify_playlist_url',
      value: playlistUrl.trim(),
      updated_at: new Date().toISOString(),
    })
    if (error) { toast.error('Error al guardar'); setSavingUrl(false); return }
    toast.success('URL de playlist guardada')
    setSavedUrl(playlistUrl.trim())
    setSavingUrl(false)
  }

  async function loadSongs() {
    const { data } = await supabase
      .from('playlist')
      .select('*, guests(name)')
      .order('created_at', { ascending: false })
    if (data) setSongs(data)
  }

  async function deleteSong(id: string) {
    const { error } = await supabase.from('playlist').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    setSongs(prev => prev.filter(s => s.id !== id))
    toast.success('Canción eliminada')
  }

  function copyAll() {
    const text = songs.map(s => `${s.artist} - ${s.song}${s.spotify_url ? ` (${s.spotify_url})` : ''}`).join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Lista copiada al portapapeles')
  }

  if (!user) return null

  const urlChanged = playlistUrl.trim() !== savedUrl

  return (
    <main className="min-h-screen bg-wedding-sand">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-serif text-wedding-dark tracking-wide">
                Playlist Colaborativa
              </h1>
              <p className="font-sans text-wedding-dark/60 mt-1 text-sm">
                {songs.length} canciones añadidas por invitados
              </p>
            </div>
            {songs.length > 0 && (
              <button onClick={copyAll}
                className="px-4 py-2.5 bg-wedding-coral text-white rounded-xl text-sm font-sans font-semibold hover:bg-wedding-coral/90 transition-all shadow-sm">
                Copiar todo
              </button>
            )}
          </div>
        </motion.div>

        {/* Spotify playlist URL config */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#191414] rounded-2xl p-5 mb-6 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-4">
            <SpotifyLogo className="w-8 h-8 text-[#1DB954]" />
            <div>
              <h3 className="font-serif text-white text-base">Playlist de Spotify</h3>
              <p className="font-sans text-white/50 text-xs">
                Comparte tu playlist con los invitados
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              value={playlistUrl}
              onChange={e => setPlaylistUrl(e.target.value)}
              className="flex-1 px-3 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white font-sans text-sm placeholder:text-white/30 focus:outline-none focus:border-[#1DB954]/50"
              placeholder="https://open.spotify.com/playlist/..."
            />
            <button
              onClick={savePlaylistUrl}
              disabled={savingUrl || !urlChanged}
              className="px-4 py-2.5 bg-[#1DB954] text-white rounded-xl text-sm font-sans font-semibold hover:bg-[#1ed760] transition-all disabled:opacity-40 disabled:hover:bg-[#1DB954] flex-shrink-0"
            >
              {savingUrl ? 'Guardando...' : 'Guardar'}
            </button>
          </div>

          {savedUrl && (
            <div className="mt-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#1DB954]" />
              <p className="font-sans text-white/40 text-xs truncate">Enlace activo: {savedUrl}</p>
              <a href={savedUrl} target="_blank" rel="noopener noreferrer"
                className="font-sans text-[#1DB954] text-xs hover:underline flex-shrink-0">
                Abrir
              </a>
            </div>
          )}
        </motion.div>

        {/* Song count stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-xl font-serif font-bold text-wedding-coral">{songs.length}</p>
            <p className="text-xs font-sans text-wedding-dark/50">Canciones</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-xl font-serif font-bold text-wedding-gold">
              {new Set(songs.map(s => s.guest_id)).size}
            </p>
            <p className="text-xs font-sans text-wedding-dark/50">Invitados</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-xl font-serif font-bold text-wedding-dark/70">
              {new Set(songs.map(s => s.artist)).size}
            </p>
            <p className="text-xs font-sans text-wedding-dark/50">Artistas</p>
          </div>
        </motion.div>

        {/* Song list */}
        {songs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white rounded-2xl shadow-sm"
          >
            <SpotifyLogo className="w-12 h-12 mx-auto mb-4 text-[#1DB954]/30" />
            <p className="text-wedding-dark/50 font-serif text-lg">Aún no hay canciones en la playlist</p>
            <p className="font-sans text-wedding-dark/40 text-sm mt-1">Los invitados pueden añadir desde su vista</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {songs.map((s, i) => (
              <motion.div key={s.id}
                className="bg-white rounded-xl p-4 flex items-center gap-4 group shadow-sm hover:shadow-md transition-all"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                <span className="font-sans text-wedding-dark/30 text-sm font-mono w-6 flex-shrink-0 text-center">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-semibold text-wedding-dark truncate">{s.song}</p>
                  <p className="font-sans text-sm text-wedding-dark/60 truncate">{s.artist}</p>
                  <p className="font-sans text-xs text-wedding-dark/40">Añadida por {s.guests?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {s.spotify_url && (
                    <a href={s.spotify_url} target="_blank" rel="noopener noreferrer"
                      className="text-[#1DB954] hover:text-[#1ed760] transition-colors">
                      <SpotifyLogo className="w-[18px] h-[18px]" />
                    </a>
                  )}
                  <button onClick={() => deleteSong(s.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 text-sm px-2 py-1 rounded-lg hover:bg-red-50">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
