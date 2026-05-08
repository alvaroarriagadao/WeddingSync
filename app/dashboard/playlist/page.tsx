'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getStoredUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AdminPlaylistPage() {
  const [user, setUser] = useState<any>(null)
  const [songs, setSongs] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    if (!u || u.role !== 'admin') { router.push('/'); return }
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

  async function deleteSong(id: string) {
    await supabase.from('playlist').delete().eq('id', id)
    setSongs(prev => prev.filter(s => s.id !== id))
    toast.success('Canción eliminada')
  }

  function copyAll() {
    const text = songs.map(s => `${s.artist} - ${s.song}${s.spotify_url ? ` (${s.spotify_url})` : ''}`).join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Lista copiada 📋')
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-wedding-sand">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif text-wedding-dark">🎵 Playlist Colaborativa</h1>
            <p className="text-wedding-dark/60 mt-1">{songs.length} canciones añadidas por invitados</p>
          </div>
          {songs.length > 0 && (
            <button onClick={copyAll}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-all">
              📋 Copiar todo
            </button>
          )}
        </div>

        {songs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl">
            <div className="text-5xl mb-4">🎙️</div>
            <p className="text-wedding-dark/50">Aún no hay canciones en la playlist</p>
          </div>
        ) : (
          <div className="space-y-2">
            {songs.map((s, i) => (
              <motion.div key={s.id}
                className="bg-white rounded-xl p-4 flex items-center gap-4 group shadow-sm"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                <span className="text-wedding-dark/30 text-sm font-mono w-6 flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-wedding-dark truncate">{s.song}</p>
                  <p className="text-sm text-wedding-dark/60 truncate">{s.artist}</p>
                  <p className="text-xs text-wedding-dark/40">Añadida por {s.guests?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {s.spotify_url && (
                    <a href={s.spotify_url} target="_blank" rel="noopener noreferrer"
                      className="text-green-500 hover:text-green-600">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                    </a>
                  )}
                  <button onClick={() => deleteSong(s.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 text-sm px-2 py-1 rounded-lg hover:bg-red-50">
                    🗑
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
