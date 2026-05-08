'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getStoredUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { CATEGORY_CONFIG, BADGE_CONFIG, formatTime } from '@/lib/utils'
import toast from 'react-hot-toast'

const WEEK_DATES = [
  '2025-09-12', '2025-09-13', '2025-09-14', '2025-09-15',
  '2025-09-16', '2025-09-17', '2025-09-18', '2025-09-19',
]

const DAY_LABELS: Record<string, string> = {
  '2025-09-12': 'Vie 12',
  '2025-09-13': 'Sáb 13',
  '2025-09-14': 'Dom 14',
  '2025-09-15': 'Lun 15 🎊',
  '2025-09-16': 'Mar 16',
  '2025-09-17': 'Mié 17',
  '2025-09-18': 'Jue 18',
  '2025-09-19': 'Vie 19',
}

export default function GuestCalendarPage() {
  const [user, setUser] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [myConfirmations, setMyConfirmations] = useState<Set<string>>(new Set())
  const [totalConfirmations, setTotalConfirmations] = useState<Record<string, number>>({})
  const [selectedDay, setSelectedDay] = useState('2025-09-15')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    if (!u) { router.push('/'); return }
    setUser(u)
    loadData(u.id)
  }, [])

  async function loadData(guestId: string) {
    const [{ data: evts }, { data: myConf }, { data: allConf }] = await Promise.all([
      supabase.from('events').select('*').order('date').order('start_time'),
      supabase.from('event_confirmations').select('event_id').eq('guest_id', guestId),
      supabase.from('event_confirmations').select('event_id'),
    ])

    if (evts) setEvents(evts)
    if (myConf) setMyConfirmations(new Set(myConf.map((c: any) => c.event_id)))
    if (allConf) {
      const counts: Record<string, number> = {}
      allConf.forEach((c: any) => { counts[c.event_id] = (counts[c.event_id] || 0) + 1 })
      setTotalConfirmations(counts)
    }
  }

  async function toggleConfirmation(eventId: string) {
    if (!user) return
    setLoadingId(eventId)
    const confirmed = myConfirmations.has(eventId)

    if (confirmed) {
      await supabase.from('event_confirmations').delete()
        .eq('guest_id', user.id).eq('event_id', eventId)
      setMyConfirmations(prev => { const s = new Set(prev); s.delete(eventId); return s })
      setTotalConfirmations(prev => ({ ...prev, [eventId]: Math.max(0, (prev[eventId] || 1) - 1) }))
      toast('Confirmación eliminada', { icon: '👋' })
    } else {
      await supabase.from('event_confirmations').insert([{ guest_id: user.id, event_id: eventId }])
      setMyConfirmations(prev => new Set([...prev, eventId]))
      setTotalConfirmations(prev => ({ ...prev, [eventId]: (prev[eventId] || 0) + 1 }))
      toast.success('¡Me apunto! 🎉')
    }
    setLoadingId(null)
  }

  const eventsByDay = WEEK_DATES.reduce((acc, d) => {
    acc[d] = events.filter(e => e.date === d)
    return acc
  }, {} as Record<string, any[]>)

  if (!user) return null

  return (
    <main className="min-h-screen bg-wedding-sand">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-serif text-wedding-dark">📅 Itinerario</h1>
          <p className="text-wedding-dark/60 mt-1">12–19 Sep · Cartagena de Indias</p>
        </motion.div>

        {/* Day tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {WEEK_DATES.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                selectedDay === d
                  ? d === '2025-09-15'
                    ? 'bg-wedding-gold text-white shadow-md'
                    : 'bg-wedding-coral text-white shadow-md'
                  : 'bg-white text-wedding-dark/70 hover:bg-wedding-sand'
              }`}
            >
              {DAY_LABELS[d]}
              {eventsByDay[d].length > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${selectedDay === d ? 'bg-white/30' : 'bg-wedding-sand'}`}>
                  {eventsByDay[d].length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Events for selected day */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {eventsByDay[selectedDay].length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🏖️</div>
                <p className="text-wedding-dark/50 text-lg font-serif">Día libre</p>
                <p className="text-wedding-dark/40 text-sm mt-1">¡Explora Cartagena a tu ritmo!</p>
              </div>
            ) : (
              eventsByDay[selectedDay].map((event, i) => {
                const cat = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.activity
                const badge = BADGE_CONFIG[event.badge_type] || BADGE_CONFIG.optional
                const confirmed = myConfirmations.has(event.id)
                const count = totalConfirmations[event.id] || 0
                const loading = loadingId === event.id

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${confirmed ? 'border-green-300 shadow-md' : 'border-transparent shadow-sm'}`}
                  >
                    {/* Category color bar */}
                    <div className={`h-1 ${cat.bg.replace('bg-', 'bg-').split(' ')[0]}`}
                      style={{ background: cat.bg.includes('yellow') ? '#F59E0B' : cat.bg.includes('orange') ? '#F97316' : cat.bg.includes('teal') ? '#14B8A6' : cat.bg.includes('purple') ? '#A855F7' : '#9CA3AF' }} />

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-2xl">{cat.icon}</span>
                            <h3 className="text-lg font-serif text-wedding-dark">{event.title}</h3>
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-wedding-dark/60 mb-3">
                            {event.start_time && (
                              <span>🕐 {formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}</span>
                            )}
                            {event.location && <span>📍 {event.location}</span>}
                          </div>
                          {event.description && (
                            <p className="text-sm text-wedding-dark/70 mb-3 leading-relaxed">{event.description}</p>
                          )}
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.color}`}>{badge.label}</span>
                            <span className="text-xs text-wedding-dark/40">{count} {count === 1 ? 'persona' : 'personas'} confirmadas</span>
                          </div>
                        </div>

                        {event.badge_type !== 'couple_only' && (
                          <button
                            onClick={() => toggleConfirmation(event.id)}
                            disabled={loading}
                            className={`flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                              confirmed
                                ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600'
                                : 'bg-wedding-sand text-wedding-dark/70 hover:bg-wedding-coral hover:text-white'
                            } disabled:opacity-50`}
                          >
                            <span className="text-xl">{loading ? '⏳' : confirmed ? '✅' : '👋'}</span>
                            <span>{confirmed ? 'Apuntado' : 'Me apunto'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })
            )}
          </motion.div>
        </AnimatePresence>

        {/* Summary */}
        <motion.div className="mt-8 p-4 bg-white rounded-2xl text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <p className="text-wedding-dark/60 text-sm">
            Has confirmado <span className="font-bold text-wedding-coral">{myConfirmations.size}</span> eventos esta semana
          </p>
        </motion.div>
      </div>
    </main>
  )
}
