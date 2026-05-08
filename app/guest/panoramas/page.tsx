'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getStoredUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const ACTIVITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
}

const ACTIVITY_LABELS: Record<string, string> = {
  low: '😌 Relajado',
  medium: '🚶 Moderado',
  high: '🏃 Activo',
}

export default function GuestPanoramasPage() {
  const [user, setUser] = useState<any>(null)
  const [attractions, setAttractions] = useState<any[]>([])
  const [votes, setVotes] = useState<Set<string>>(new Set())
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'my'>('all')
  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    if (!u) { router.push('/'); return }
    setUser(u)
    loadData(u.id)
  }, [])

  async function loadData(guestId: string) {
    const [{ data: attrs }, { data: myVotes }, { data: allVotes }] = await Promise.all([
      supabase.from('attractions').select('*').order('name'),
      supabase.from('attraction_votes').select('attraction_id').eq('guest_id', guestId),
      supabase.from('attraction_votes').select('attraction_id'),
    ])

    if (attrs) setAttractions(attrs)
    if (myVotes) setVotes(new Set(myVotes.map((v: any) => v.attraction_id)))
    if (allVotes) {
      const counts: Record<string, number> = {}
      allVotes.forEach((v: any) => { counts[v.attraction_id] = (counts[v.attraction_id] || 0) + 1 })
      setVoteCounts(counts)
    }
  }

  async function toggleVote(attractionId: string) {
    if (!user) return
    setLoading(attractionId)
    const voted = votes.has(attractionId)

    if (voted) {
      await supabase.from('attraction_votes').delete().eq('guest_id', user.id).eq('attraction_id', attractionId)
      setVotes(prev => { const s = new Set(prev); s.delete(attractionId); return s })
      setVoteCounts(prev => ({ ...prev, [attractionId]: Math.max(0, (prev[attractionId] || 1) - 1) }))
    } else {
      await supabase.from('attraction_votes').insert([{ guest_id: user.id, attraction_id: attractionId }])
      setVotes(prev => new Set([...prev, attractionId]))
      setVoteCounts(prev => ({ ...prev, [attractionId]: (prev[attractionId] || 0) + 1 }))
      toast.success('¡Votado! ❤️')
    }
    setLoading(null)
  }

  const displayed = filter === 'my' ? attractions.filter(a => votes.has(a.id)) : attractions

  if (!user) return null

  return (
    <main className="min-h-screen bg-wedding-sand">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-serif text-wedding-dark">🗺️ Panoramas Cartagena</h1>
          <p className="text-wedding-dark/60 mt-1">Vota las actividades que más te gustan · {votes.size} votos dados</p>
        </motion.div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {(['all', 'my'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f ? 'bg-wedding-coral text-white' : 'bg-white text-wedding-dark/60'}`}>
              {f === 'all' ? `🗺️ Todos (${attractions.length})` : `❤️ Mis votos (${votes.size})`}
            </button>
          ))}
        </div>

        {displayed.length === 0 && filter === 'my' && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">💔</div>
            <p className="text-wedding-dark/50 font-serif text-lg">Aún no has votado ningún panorama</p>
            <button onClick={() => setFilter('all')} className="mt-3 text-wedding-coral hover:underline text-sm">Ver todos →</button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayed.map((attr, i) => {
            const voted = votes.has(attr.id)
            const count = voteCounts[attr.id] || 0
            const isLoading = loading === attr.id

            return (
              <motion.div
                key={attr.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border-2 ${voted ? 'border-pink-300' : 'border-transparent'}`}
              >
                {/* Image placeholder */}
                <div className="h-36 relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${['#E8927C', '#C9A84C', '#7EC8C8', '#a855f7', '#F59E0B'][i % 5]}44, ${['#C9A84C', '#7EC8C8', '#E8927C', '#F59E0B', '#a855f7'][i % 5]}66)` }}>
                  <div className="absolute inset-0 flex items-center justify-center text-6xl">
                    {['🏰', '🤿', '🏖️', '🌅', '🎺', '🏛️', '🎨', '⚔️', '🍽️', '🥘', '🛶', '👩‍🍳', '⛵', '💆', '💃'][i % 15]}
                  </div>
                  {voted && (
                    <div className="absolute top-2 right-2 bg-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      ❤️ Votado
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-serif text-wedding-dark font-semibold mb-1 leading-tight">{attr.name}</h3>
                  <p className="text-xs text-wedding-dark/60 mb-3 leading-relaxed line-clamp-2">{attr.description}</p>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {attr.activity_level && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTIVITY_COLORS[attr.activity_level]}`}>
                        {ACTIVITY_LABELS[attr.activity_level]}
                      </span>
                    )}
                    {attr.duration_hours && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">⏱ {attr.duration_hours}h</span>
                    )}
                    {attr.day_suggestion && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">📅 {attr.day_suggestion}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-wedding-dark/50">
                      {attr.price_usd ? `~$${attr.price_usd} USD` : ''}
                      {attr.price_cop ? ` · $${attr.price_cop.toLocaleString('es-CO')} COP` : ''}
                    </div>
                    <button
                      onClick={() => toggleVote(attr.id)}
                      disabled={!!isLoading}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
                        voted
                          ? 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                          : 'bg-wedding-sand text-wedding-dark/70 hover:bg-pink-100 hover:text-pink-700'
                      }`}
                    >
                      <span>{isLoading ? '⏳' : voted ? '❤️' : '🤍'}</span>
                      <span>{count}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
