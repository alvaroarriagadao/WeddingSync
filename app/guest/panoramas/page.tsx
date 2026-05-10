'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getStoredUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const ACTIVITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
}

const ACTIVITY_LABELS: Record<string, string> = {
  low: 'Relajado',
  medium: 'Moderado',
  high: 'Activo',
}

const PANORAMA_EMOJIS = ['🏰', '🤿', '🏖️', '🌅', '🎺', '🏛️', '🎨', '⚔️', '🍽️', '🥘', '🛶', '👩‍🍳', '⛵', '💆', '💃']

export default function GuestPanoramasPage() {
  const [user, setUser] = useState<any>(null)
  const [attractions, setAttractions] = useState<any[]>([])
  const [votes, setVotes] = useState<Set<string>>(new Set())
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'my'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
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
      const { error } = await supabase
        .from('attraction_votes')
        .delete()
        .eq('guest_id', user.id)
        .eq('attraction_id', attractionId)
      if (error) {
        toast.error('Error al quitar el voto')
        setLoading(null)
        return
      }
      setVotes(prev => { const s = new Set(prev); s.delete(attractionId); return s })
      setVoteCounts(prev => ({ ...prev, [attractionId]: Math.max(0, (prev[attractionId] || 1) - 1) }))
    } else {
      const { error } = await supabase
        .from('attraction_votes')
        .insert([{ guest_id: user.id, attraction_id: attractionId }])
      if (error) {
        toast.error('Error al votar')
        setLoading(null)
        return
      }
      setVotes(prev => new Set([...prev, attractionId]))
      setVoteCounts(prev => ({ ...prev, [attractionId]: (prev[attractionId] || 0) + 1 }))
      toast.success('Votado!')
    }
    setLoading(null)
  }

  const displayed = filter === 'my' ? attractions.filter(a => votes.has(a.id)) : attractions
  const totalVotes = Object.values(voteCounts).reduce((s, c) => s + c, 0)

  if (!user) return null

  return (
    <main className="min-h-screen bg-wedding-sand font-guest">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-guest-serif text-wedding-dark tracking-wide">
            Panoramas en Cartagena
          </h1>
          <p className="font-guest text-wedding-dark/60 mt-2 text-sm">
            Vota las actividades que más te gustan para que los novios organicen el viaje
          </p>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-4 mb-6 shadow-sm flex items-center justify-between flex-wrap gap-3"
        >
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-guest-serif font-bold text-wedding-coral">{attractions.length}</p>
              <p className="text-xs font-guest text-wedding-dark/50">Panoramas</p>
            </div>
            <div className="w-px h-8 bg-wedding-sand" />
            <div className="text-center">
              <p className="text-2xl font-guest-serif font-bold text-wedding-gold">{votes.size}</p>
              <p className="text-xs font-guest text-wedding-dark/50">Tus votos</p>
            </div>
            <div className="w-px h-8 bg-wedding-sand" />
            <div className="text-center">
              <p className="text-2xl font-guest-serif font-bold text-wedding-dark/70">{totalVotes}</p>
              <p className="text-xs font-guest text-wedding-dark/50">Votos totales</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            {(['all', 'my'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-guest font-medium transition-all duration-200 ${
                  filter === f
                    ? 'bg-wedding-coral text-white shadow-sm'
                    : 'bg-wedding-sand text-wedding-dark/60 hover:bg-wedding-coral/10'
                }`}
              >
                {f === 'all' ? `Todos (${attractions.length})` : `Mis votos (${votes.size})`}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Empty state */}
        {displayed.length === 0 && filter === 'my' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white rounded-2xl shadow-sm"
          >
            <svg className="w-16 h-16 mx-auto mb-4 text-wedding-coral/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            <p className="text-wedding-dark/50 font-guest-serif text-lg mb-2">Aún no has votado ningún panorama</p>
            <button onClick={() => setFilter('all')} className="font-guest text-wedding-coral hover:underline text-sm mt-1">
              Ver todos los panoramas
            </button>
          </motion.div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayed.map((attr, i) => {
            const voted = votes.has(attr.id)
            const count = voteCounts[attr.id] || 0
            const isLoading = loading === attr.id
            const isExpanded = expandedId === attr.id

            return (
              <motion.div
                key={attr.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border-2 ${
                  voted ? 'border-wedding-coral/40' : 'border-transparent'
                }`}
              >
                {/* Image / visual header */}
                <div
                  className="h-36 relative overflow-hidden cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : attr.id)}
                  style={{
                    background: attr.photos?.length > 0 || attr.photo_url
                      ? undefined
                      : `linear-gradient(135deg, ${['#C97B6B', '#B8934E', '#7EC8C8', '#a78bba', '#d4956b'][i % 5]}44, ${['#B8934E', '#7EC8C8', '#C97B6B', '#d4956b', '#a78bba'][i % 5]}66)`,
                  }}
                >
                  {attr.photos?.length > 0 || attr.photo_url ? (
                    <img
                      src={attr.photos?.length > 0 ? attr.photos[0] : attr.photo_url}
                      alt={attr.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.style.background = `linear-gradient(135deg, #C97B6B44, #B8934E66)` }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-80">
                      {PANORAMA_EMOJIS[i % PANORAMA_EMOJIS.length]}
                    </div>
                  )}
                  {voted && (
                    <div className="absolute top-3 right-3 bg-wedding-coral text-white text-xs px-2.5 py-1 rounded-full font-guest font-semibold shadow-sm">
                      Votado
                    </div>
                  )}
                  {count > 0 && (
                    <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-wedding-dark text-xs px-2 py-1 rounded-full font-guest font-medium">
                      {count} {count === 1 ? 'voto' : 'votos'}
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-guest-serif text-wedding-dark font-semibold text-base mb-1 leading-tight">
                    {attr.name}
                  </h3>
                  <p className="text-xs font-guest text-wedding-dark/60 mb-3 leading-relaxed line-clamp-2">
                    {attr.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {attr.activity_level && (
                      <span className={`text-xs font-guest px-2 py-0.5 rounded-full font-medium ${ACTIVITY_COLORS[attr.activity_level]}`}>
                        {ACTIVITY_LABELS[attr.activity_level]}
                      </span>
                    )}
                    {attr.duration_hours && (
                      <span className="text-xs font-guest px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {attr.duration_hours}h
                      </span>
                    )}
                    {attr.day_suggestion && (
                      <span className="text-xs font-guest px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                        {attr.day_suggestion}
                      </span>
                    )}
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-wedding-sand pt-3 mb-3 space-y-2">
                          {/* Photo gallery */}
                          {attr.photos?.length > 1 && (
                            <div className="grid grid-cols-3 gap-1.5 rounded-lg overflow-hidden">
                              {attr.photos.map((url: string, pi: number) => (
                                <div key={pi} className="aspect-square relative overflow-hidden rounded-lg">
                                  <img
                                    src={url}
                                    alt={`${attr.name} foto ${pi + 1}`}
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          {attr.admin_notes && (
                            <p className="text-xs font-guest text-wedding-dark/70 italic bg-wedding-sand/50 rounded-lg p-2">
                              {attr.admin_notes}
                            </p>
                          )}
                          {(attr.price_usd || attr.price_cop) && (
                            <div className="flex items-center gap-2 text-xs font-guest text-wedding-dark/60">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>
                                {attr.price_usd ? `~$${attr.price_usd} USD` : ''}
                                {attr.price_usd && attr.price_cop ? ' / ' : ''}
                                {attr.price_cop ? `$${attr.price_cop.toLocaleString('es-CO')} COP` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Price + vote button */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-guest text-wedding-dark/40">
                      {!isExpanded && attr.price_usd ? `~$${attr.price_usd} USD` : ''}
                    </div>
                    <button
                      onClick={() => toggleVote(attr.id)}
                      disabled={!!isLoading}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-guest font-semibold transition-all duration-200 disabled:opacity-50 ${
                        voted
                          ? 'bg-wedding-coral/10 text-wedding-coral hover:bg-wedding-coral/20'
                          : 'bg-wedding-sand text-wedding-dark/60 hover:bg-wedding-coral/10 hover:text-wedding-coral'
                      }`}
                    >
                      {isLoading ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill={voted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                      )}
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
