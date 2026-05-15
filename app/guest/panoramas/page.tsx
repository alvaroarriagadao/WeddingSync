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

function StarRating({ value, onChange, disabled, large = false }: {
  value: number
  onChange: (star: number) => void
  disabled?: boolean
  large?: boolean
}) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map(star => {
        const active = star <= (hovered || value)
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            className={`transition-transform ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:scale-125 active:scale-95'} ${large ? 'w-7 h-7' : 'w-5 h-5'}`}
          >
            <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5}
              className={`w-full h-full transition-colors ${active ? 'text-amber-400' : 'text-stone-300'}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

export default function GuestPanoramasPage() {
  const [user, setUser] = useState<any>(null)
  const [attractions, setAttractions] = useState<any[]>([])
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [ratingStats, setRatingStats] = useState<Record<string, { avg: number; count: number }>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'my'>('all')
  const [selectedAttr, setSelectedAttr] = useState<any | null>(null)
  const [activePhotoIdx, setActivePhotoIdx] = useState(0)
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
      supabase.from('attraction_votes').select('attraction_id, rating').eq('guest_id', guestId),
      supabase.from('attraction_votes').select('attraction_id, rating'),
    ])

    if (attrs) setAttractions(attrs)
    if (myVotes) {
      const r: Record<string, number> = {}
      myVotes.forEach((v: any) => { r[v.attraction_id] = v.rating })
      setRatings(r)
    }
    if (allVotes) {
      const sums: Record<string, { sum: number; count: number }> = {}
      allVotes.forEach((v: any) => {
        if (!sums[v.attraction_id]) sums[v.attraction_id] = { sum: 0, count: 0 }
        sums[v.attraction_id].sum += (v.rating || 5)
        sums[v.attraction_id].count += 1
      })
      const stats: Record<string, { avg: number; count: number }> = {}
      Object.entries(sums).forEach(([id, { sum, count }]) => {
        stats[id] = { avg: sum / count, count }
      })
      setRatingStats(stats)
    }
  }

  async function rateAttraction(attractionId: string, star: number) {
    if (!user) return
    setLoading(attractionId)
    const prevRating = ratings[attractionId] || 0

    if (prevRating === star) {
      // Misma estrella → quitar calificación
      const { error } = await supabase.from('attraction_votes')
        .delete().eq('guest_id', user.id).eq('attraction_id', attractionId)
      if (error) { toast.error('Error al quitar la calificación'); setLoading(null); return }
      setRatings(prev => { const r = { ...prev }; delete r[attractionId]; return r })
      setRatingStats(prev => {
        const s = prev[attractionId]
        if (!s || s.count <= 1) { const r = { ...prev }; delete r[attractionId]; return r }
        return { ...prev, [attractionId]: { avg: (s.avg * s.count - prevRating) / (s.count - 1), count: s.count - 1 } }
      })
    } else {
      // Nueva calificación o cambio
      const { error } = await supabase.from('attraction_votes')
        .upsert([{ guest_id: user.id, attraction_id: attractionId, rating: star }], { onConflict: 'guest_id,attraction_id' })
      if (error) { toast.error('Error al calificar'); setLoading(null); return }
      setRatings(prev => ({ ...prev, [attractionId]: star }))
      setRatingStats(prev => {
        const s = prev[attractionId]
        if (!s) return { ...prev, [attractionId]: { avg: star, count: 1 } }
        const newCount = prevRating > 0 ? s.count : s.count + 1
        const newAvg = (s.avg * s.count - prevRating + star) / newCount
        return { ...prev, [attractionId]: { avg: newAvg, count: newCount } }
      })
      if (!prevRating) toast.success(`¡${star} estrella${star !== 1 ? 's' : ''}!`)
    }
    setLoading(null)
  }

  function openModal(attr: any) {
    setSelectedAttr(attr)
    setActivePhotoIdx(0)
  }

  function closeModal() {
    setSelectedAttr(null)
  }

  const myRatedCount = Object.keys(ratings).length
  const totalRatings = Object.values(ratingStats).reduce((s, r) => s + r.count, 0)
  const displayed = filter === 'my' ? attractions.filter(a => ratings[a.id] > 0) : attractions

  const modalPhotos: string[] = selectedAttr
    ? (selectedAttr.photos?.length > 0
        ? selectedAttr.photos
        : selectedAttr.photo_url
          ? [selectedAttr.photo_url]
          : [])
    : []

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
            Califica cada actividad con estrellas para que los novios sepan qué te gusta más
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
              <p className="text-2xl font-guest-serif font-bold text-wedding-gold">{myRatedCount}</p>
              <p className="text-xs font-guest text-wedding-dark/50">Calificados</p>
            </div>
            <div className="w-px h-8 bg-wedding-sand" />
            <div className="text-center">
              <p className="text-2xl font-guest-serif font-bold text-wedding-dark/70">{totalRatings}</p>
              <p className="text-xs font-guest text-wedding-dark/50">Calificaciones</p>
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
                {f === 'all' ? `Todos (${attractions.length})` : `Mis calificaciones (${myRatedCount})`}
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
            <div className="flex justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map(s => (
                <svg key={s} className="w-8 h-8 text-wedding-coral/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              ))}
            </div>
            <p className="text-wedding-dark/50 font-guest-serif text-lg mb-2">Aún no has calificado ningún panorama</p>
            <button onClick={() => setFilter('all')} className="font-guest text-wedding-coral hover:underline text-sm mt-1">
              Ver todos los panoramas
            </button>
          </motion.div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayed.map((attr, i) => {
            const myRating = ratings[attr.id] || 0
            const stats = ratingStats[attr.id]
            const isLoading = loading === attr.id
            const coverPhoto = attr.photos?.length > 0 ? attr.photos[0] : attr.photo_url || null

            return (
              <motion.div
                key={attr.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border-2 cursor-pointer ${
                  myRating > 0 ? 'border-amber-400/50' : 'border-transparent'
                }`}
              >
                {/* Image / visual header — click opens modal */}
                <div
                  className="h-40 relative overflow-hidden"
                  onClick={() => openModal(attr)}
                  style={!coverPhoto ? {
                    background: `linear-gradient(135deg, ${['#C97B6B', '#B8934E', '#7EC8C8', '#a78bba', '#d4956b'][i % 5]}44, ${['#B8934E', '#7EC8C8', '#C97B6B', '#d4956b', '#a78bba'][i % 5]}66)`,
                  } : undefined}
                >
                  {coverPhoto ? (
                    <img
                      src={coverPhoto}
                      alt={attr.name}
                      className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-80">
                      {PANORAMA_EMOJIS[i % PANORAMA_EMOJIS.length]}
                    </div>
                  )}
                  {coverPhoto && <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />}

                  {myRating > 0 && (
                    <div className="absolute top-3 right-3 bg-amber-400 text-white text-xs px-2.5 py-1 rounded-full font-guest font-semibold shadow-sm flex items-center gap-1">
                      {myRating}
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    </div>
                  )}
                  {attr.photos?.length > 1 && (
                    <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-guest flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                      {attr.photos.length}
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3
                    className="font-guest-serif text-wedding-dark font-semibold text-base mb-1 leading-tight cursor-pointer hover:text-wedding-coral transition-colors"
                    onClick={() => openModal(attr)}
                  >
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

                  {/* Price + star rating */}
                  <div className="flex items-end justify-between gap-2">
                    <div className="text-xs font-guest text-wedding-dark/40">
                      {attr.price_cop ? `$${Number(attr.price_cop).toLocaleString('es-CO')} COP` : attr.price_clp ? `$${Number(attr.price_clp).toLocaleString('es-CL')} CLP` : ''}
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <StarRating value={myRating} onChange={(s) => rateAttraction(attr.id, s)} disabled={isLoading} />
                      {stats ? (
                        <span className="text-[10px] font-guest text-wedding-dark/35">
                          {stats.avg.toFixed(1)}★ · {stats.count} {stats.count === 1 ? 'opinión' : 'opiniones'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-guest text-wedding-dark/25">Sin calificaciones</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedAttr && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            />

            {/* Modal */}
            <motion.div
              className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] sm:max-h-[85vh] flex flex-col"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              {/* Photo gallery */}
              {modalPhotos.length > 0 ? (
                <div className="relative flex-shrink-0">
                  <div className="h-56 sm:h-72 relative overflow-hidden bg-wedding-sand">
                    <img
                      src={modalPhotos[activePhotoIdx]}
                      alt={selectedAttr.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                    {/* Close button */}
                    <button
                      onClick={closeModal}
                      className="absolute top-4 right-4 w-9 h-9 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    {/* Arrow navigation */}
                    {modalPhotos.length > 1 && (
                      <>
                        <button
                          onClick={() => setActivePhotoIdx(i => (i - 1 + modalPhotos.length) % modalPhotos.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                        </button>
                        <button
                          onClick={() => setActivePhotoIdx(i => (i + 1) % modalPhotos.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                        </button>
                        {/* Dots */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {modalPhotos.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setActivePhotoIdx(idx)}
                              className={`rounded-full transition-all ${idx === activePhotoIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Thumbnails strip */}
                  {modalPhotos.length > 1 && (
                    <div className="flex gap-2 px-4 py-2 bg-white border-b border-wedding-sand overflow-x-auto scrollbar-none">
                      {modalPhotos.map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActivePhotoIdx(idx)}
                          className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                            idx === activePhotoIdx ? 'border-wedding-coral' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* No photo header */
                <div
                  className="h-32 flex-shrink-0 relative flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #C97B6B44, #B8934E66)' }}
                >
                  <span className="text-6xl">{PANORAMA_EMOJIS[attractions.indexOf(selectedAttr) % PANORAMA_EMOJIS.length]}</span>
                  <button
                    onClick={closeModal}
                    className="absolute top-4 right-4 w-9 h-9 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {/* Title + star rating */}
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-guest-serif text-wedding-dark text-2xl leading-tight flex-1">
                    {selectedAttr.name}
                  </h2>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <StarRating
                      value={ratings[selectedAttr.id] || 0}
                      onChange={(s) => rateAttraction(selectedAttr.id, s)}
                      disabled={!!loading}
                      large
                    />
                    {ratingStats[selectedAttr.id] ? (
                      <p className="text-xs text-wedding-dark/50">
                        {ratingStats[selectedAttr.id].avg.toFixed(1)}★ · {ratingStats[selectedAttr.id].count} {ratingStats[selectedAttr.id].count === 1 ? 'opinión' : 'opiniones'}
                      </p>
                    ) : (
                      <p className="text-xs text-wedding-dark/30">Sé el primero en calificar</p>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {selectedAttr.activity_level && (
                    <span className={`text-xs font-guest px-3 py-1 rounded-full font-medium ${ACTIVITY_COLORS[selectedAttr.activity_level]}`}>
                      {ACTIVITY_LABELS[selectedAttr.activity_level]}
                    </span>
                  )}
                  {selectedAttr.duration_hours && (
                    <span className="text-xs font-guest px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                      ⏱ {selectedAttr.duration_hours}h
                    </span>
                  )}
                  {selectedAttr.suggested_date && (
                    <span className="text-xs font-guest px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                      📅 {new Date(selectedAttr.suggested_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                      {selectedAttr.suggested_time ? ` · ${selectedAttr.suggested_time.slice(0, 5)}` : ''}
                    </span>
                  )}
                </div>

                {/* Description */}
                {selectedAttr.description && (
                  <p className="font-guest text-wedding-dark/70 text-sm leading-relaxed">
                    {selectedAttr.description}
                  </p>
                )}

                {/* Admin notes */}
                {selectedAttr.admin_notes && (
                  <div className="bg-wedding-sand/60 rounded-2xl p-4">
                    <p className="text-xs font-guest font-semibold text-wedding-dark/50 uppercase tracking-wider mb-1">💌 Nota de los novios</p>
                    <p className="font-guest text-wedding-dark/80 text-sm leading-relaxed italic">
                      {selectedAttr.admin_notes}
                    </p>
                  </div>
                )}

                {/* Prices */}
                {(selectedAttr.price_cop || selectedAttr.price_clp) && (
                  <div className="flex items-center gap-3 text-sm font-guest">
                    <svg className="w-4 h-4 text-wedding-dark/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-wedding-dark/70">
                      {selectedAttr.price_cop ? `$${Number(selectedAttr.price_cop).toLocaleString('es-CO')} COP` : ''}
                      {selectedAttr.price_cop && selectedAttr.price_clp ? ' · ' : ''}
                      {selectedAttr.price_clp ? `$${Number(selectedAttr.price_clp).toLocaleString('es-CL')} CLP` : ''}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
