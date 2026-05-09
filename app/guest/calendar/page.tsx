'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getStoredUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { CATEGORY_CONFIG, BADGE_CONFIG, formatTime } from '@/lib/utils'
import toast from 'react-hot-toast'

const BASE_START = '2026-09-11'
const BASE_END = '2026-09-18'
const WEDDING_DAY = '2026-09-15'

const SPANISH_DAY_ABBR = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const current = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const abbr = SPANISH_DAY_ABBR[d.getDay()]
  const day = d.getDate()
  return dateStr === WEDDING_DAY ? `${abbr} ${day} 🎊` : `${abbr} ${day}`
}

function computeCalendarDates(events: any[]): string[] {
  let endDate = BASE_END
  for (const ev of events) {
    if (ev.date && ev.date > endDate) {
      endDate = ev.date
    }
  }
  return generateDateRange(BASE_START, endDate)
}

function formatSubtitleRange(dates: string[]): string {
  if (dates.length === 0) return ''
  const first = new Date(dates[0] + 'T00:00:00')
  const last = new Date(dates[dates.length - 1] + 'T00:00:00')
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const firstMonth = monthNames[first.getMonth()]
  const lastMonth = monthNames[last.getMonth()]
  const year = first.getFullYear()
  if (firstMonth === lastMonth) {
    return `${first.getDate()} - ${last.getDate()} ${firstMonth} ${year}`
  }
  return `${first.getDate()} ${firstMonth} - ${last.getDate()} ${lastMonth} ${year}`
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8) // 8:00 through 23:00
const HOUR_HEIGHT = 80 // pixels per hour

function timeToMinutes(time: string): number {
  if (!time) return 0
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function getEventStyle(startTime: string, endTime: string) {
  const startMin = timeToMinutes(startTime)
  const endMin = endTime ? timeToMinutes(endTime) : startMin + 60
  const topOffset = ((startMin - 8 * 60) / 60) * HOUR_HEIGHT
  const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 40)
  return { top: `${topOffset}px`, height: `${height}px` }
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    ceremony: '#F59E0B',
    meal: '#F97316',
    activity: '#14B8A6',
    transfer: '#9CA3AF',
    party: '#A855F7',
  }
  return colors[category] || '#9CA3AF'
}

function getCategoryBg(category: string): string {
  const bgs: Record<string, string> = {
    ceremony: 'rgba(245, 158, 11, 0.15)',
    meal: 'rgba(249, 115, 22, 0.15)',
    activity: 'rgba(20, 184, 166, 0.15)',
    transfer: 'rgba(156, 163, 175, 0.15)',
    party: 'rgba(168, 85, 247, 0.15)',
  }
  return bgs[category] || 'rgba(156, 163, 175, 0.15)'
}

export default function GuestCalendarPage() {
  const [user, setUser] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [myConfirmations, setMyConfirmations] = useState<Set<string>>(new Set())
  const [totalConfirmations, setTotalConfirmations] = useState<Record<string, number>>({})
  const [selectedDay, setSelectedDay] = useState('2026-09-15')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    if (!u) { router.push('/'); return }
    setUser(u)
    loadData(u.id)
  }, [])

  // Scroll to 8am area on mount
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = 0
    }
  }, [selectedDay])

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

  const calendarDates = computeCalendarDates(events)

  const eventsByDay = calendarDates.reduce((acc, d) => {
    acc[d] = events.filter(e => e.date === d)
    return acc
  }, {} as Record<string, any[]>)

  const dayEvents = eventsByDay[selectedDay] || []

  // Detect overlapping events for column layout
  function getEventColumns(evts: any[]) {
    const sorted = [...evts]
      .filter(e => e.start_time)
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))

    const columns: any[][] = []
    sorted.forEach(ev => {
      const evStart = timeToMinutes(ev.start_time)
      let placed = false
      for (const col of columns) {
        const last = col[col.length - 1]
        const lastEnd = last.end_time ? timeToMinutes(last.end_time) : timeToMinutes(last.start_time) + 60
        if (evStart >= lastEnd) {
          col.push(ev)
          placed = true
          break
        }
      }
      if (!placed) columns.push([ev])
    })
    return columns
  }

  const columns = getEventColumns(dayEvents)
  const totalColumns = Math.max(columns.length, 1)

  // Map event id to column index
  const eventColumnMap = new Map<string, number>()
  columns.forEach((col, idx) => {
    col.forEach(ev => eventColumnMap.set(ev.id, idx))
  })

  if (!user) return null

  return (
    <main className="min-h-screen bg-wedding-sand font-guest">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-5">
          <h1 className="text-3xl sm:text-4xl font-guest-serif text-wedding-dark">Itinerario</h1>
          <p className="text-wedding-dark/60 mt-1">{formatSubtitleRange(calendarDates)} / Cartagena de Indias</p>
        </motion.div>

        {/* Day tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {calendarDates.map(d => (
            <button
              key={d}
              onClick={() => { setSelectedDay(d); setSelectedEvent(null) }}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                selectedDay === d
                  ? d === WEDDING_DAY
                    ? 'bg-wedding-gold text-white shadow-md'
                    : 'bg-wedding-coral text-white shadow-md'
                  : 'bg-white text-wedding-dark/70 hover:bg-white/80'
              }`}
            >
              {getDayLabel(d)}
              {eventsByDay[d]?.length > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${selectedDay === d ? 'bg-white/30' : 'bg-wedding-sand'}`}>
                  {eventsByDay[d].length}
                </span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {dayEvents.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🏖️</div>
                <p className="text-wedding-dark/50 text-lg font-guest-serif">Día libre</p>
                <p className="text-wedding-dark/40 text-sm mt-1">Explora Cartagena a tu ritmo</p>
              </div>
            ) : (
              <div className="flex gap-0">
                {/* Timeline view */}
                <div
                  ref={timelineRef}
                  className="flex-1 bg-white rounded-2xl shadow-sm overflow-y-auto overflow-x-hidden border border-wedding-sand"
                  style={{ maxHeight: 'calc(100vh - 220px)' }}
                >
                  <div className="relative" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
                    {/* Hour rows */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t border-wedding-sand/60"
                        style={{ top: `${(hour - 8) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                      >
                        <span className="absolute left-2 sm:left-4 -top-3 text-xs text-wedding-dark/40 font-medium bg-white px-1 select-none">
                          {hour}:00
                        </span>
                      </div>
                    ))}

                    {/* Half-hour lines */}
                    {HOURS.map((hour) => (
                      <div
                        key={`half-${hour}`}
                        className="absolute left-16 sm:left-20 right-2 border-t border-dashed border-wedding-sand/40"
                        style={{ top: `${(hour - 8) * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }}
                      />
                    ))}

                    {/* Event blocks */}
                    {dayEvents.filter(e => e.start_time).map((event) => {
                      const cat = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.activity
                      const confirmed = myConfirmations.has(event.id)
                      const style = getEventStyle(event.start_time, event.end_time)
                      const colIdx = eventColumnMap.get(event.id) || 0
                      const colWidth = (100 - 15) / totalColumns // 15% for hour labels
                      const leftPercent = 15 + colIdx * colWidth
                      const isSelected = selectedEvent?.id === event.id

                      return (
                        <motion.div
                          key={event.id}
                          className={`absolute rounded-xl cursor-pointer transition-all overflow-hidden group ${
                            isSelected ? 'ring-2 ring-wedding-coral z-20 shadow-lg' : 'z-10 hover:shadow-md'
                          } ${confirmed ? 'ring-2 ring-green-400' : ''}`}
                          style={{
                            top: style.top,
                            height: style.height,
                            left: `${leftPercent}%`,
                            width: `${colWidth - 1}%`,
                            background: getCategoryBg(event.category),
                            borderLeft: `4px solid ${getCategoryColor(event.category)}`,
                          }}
                          onClick={() => setSelectedEvent(isSelected ? null : event)}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          layout
                        >
                          <div className="p-2 sm:p-3 h-full flex flex-col justify-start overflow-hidden">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-sm sm:text-base flex-shrink-0">{cat.icon}</span>
                              <span className="font-guest-serif text-xs sm:text-sm font-semibold text-wedding-dark truncate">
                                {event.title}
                              </span>
                              {confirmed && <span className="text-xs flex-shrink-0">✅</span>}
                            </div>
                            <span className="text-[10px] sm:text-xs text-wedding-dark/60 truncate">
                              {formatTime(event.start_time)}
                              {event.end_time ? ` - ${formatTime(event.end_time)}` : ''}
                            </span>
                            {event.location && (
                              <span className="text-[10px] sm:text-xs text-wedding-dark/50 truncate mt-0.5 hidden sm:block">
                                {event.location}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}

                    {/* Events without time (shown at bottom) */}
                    {dayEvents.filter(e => !e.start_time).map((event, i) => {
                      const cat = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.activity
                      const confirmed = myConfirmations.has(event.id)
                      const isSelected = selectedEvent?.id === event.id
                      return (
                        <div
                          key={event.id}
                          className={`absolute left-[15%] right-2 rounded-xl cursor-pointer p-2 sm:p-3 ${
                            isSelected ? 'ring-2 ring-wedding-coral shadow-lg' : 'hover:shadow-md'
                          } ${confirmed ? 'ring-2 ring-green-400' : ''}`}
                          style={{
                            bottom: `${i * 50 + 8}px`,
                            height: '44px',
                            background: getCategoryBg(event.category),
                            borderLeft: `4px solid ${getCategoryColor(event.category)}`,
                          }}
                          onClick={() => setSelectedEvent(isSelected ? null : event)}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{cat.icon}</span>
                            <span className="font-guest-serif text-xs sm:text-sm font-semibold text-wedding-dark truncate">{event.title}</span>
                            {confirmed && <span className="text-xs">✅</span>}
                          </div>
                          <span className="text-[10px] text-wedding-dark/50">Hora por confirmar</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Event detail panel (desktop) */}
                <AnimatePresence>
                  {selectedEvent && (
                    <motion.div
                      initial={{ opacity: 0, x: 30, width: 0 }}
                      animate={{ opacity: 1, x: 0, width: 320 }}
                      exit={{ opacity: 0, x: 30, width: 0 }}
                      className="hidden sm:block ml-4 flex-shrink-0 overflow-hidden"
                    >
                      <EventDetailPanel
                        event={selectedEvent}
                        confirmed={myConfirmations.has(selectedEvent.id)}
                        count={totalConfirmations[selectedEvent.id] || 0}
                        loading={loadingId === selectedEvent.id}
                        onToggle={() => toggleConfirmation(selectedEvent.id)}
                        onClose={() => setSelectedEvent(null)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Mobile event detail bottom sheet */}
        <AnimatePresence>
          {selectedEvent && (
            <motion.div
              className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedEvent(null)} />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative bg-white rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto"
              >
                <div className="w-12 h-1.5 bg-wedding-sand rounded-full mx-auto mt-3 mb-2" />
                <div className="px-5 pb-6">
                  <EventDetailContent
                    event={selectedEvent}
                    confirmed={myConfirmations.has(selectedEvent.id)}
                    count={totalConfirmations[selectedEvent.id] || 0}
                    loading={loadingId === selectedEvent.id}
                    onToggle={() => toggleConfirmation(selectedEvent.id)}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary */}
        <motion.div
          className="mt-6 p-4 bg-white rounded-2xl text-center shadow-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-wedding-dark/60 text-sm">
            Has confirmado <span className="font-bold text-wedding-coral">{myConfirmations.size}</span> eventos esta semana
          </p>
        </motion.div>
      </div>
    </main>
  )
}

function EventDetailPanel({ event, confirmed, count, loading, onToggle, onClose }: {
  event: any; confirmed: boolean; count: number; loading: boolean;
  onToggle: () => void; onClose: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-wedding-sand overflow-hidden h-fit sticky top-4">
      <div
        className="h-2"
        style={{ background: getCategoryColor(event.category) }}
      />
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <EventDetailContent
              event={event}
              confirmed={confirmed}
              count={count}
              loading={loading}
              onToggle={onToggle}
            />
          </div>
          <button
            onClick={onClose}
            className="text-wedding-dark/30 hover:text-wedding-dark/60 transition-colors ml-2 text-lg"
          >
            x
          </button>
        </div>
      </div>
    </div>
  )
}

function EventDetailContent({ event, confirmed, count, loading, onToggle }: {
  event: any; confirmed: boolean; count: number; loading: boolean;
  onToggle: () => void;
}) {
  const cat = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.activity
  const badge = BADGE_CONFIG[event.badge_type] || BADGE_CONFIG.optional

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{cat.icon}</span>
        <h3 className="text-lg font-guest-serif font-semibold text-wedding-dark">{event.title}</h3>
      </div>

      <div className="space-y-2 mb-4">
        {event.start_time && (
          <div className="flex items-center gap-2 text-sm text-wedding-dark/60">
            <span className="w-5 text-center">🕐</span>
            <span>
              {formatTime(event.start_time)}
              {event.end_time ? ` - ${formatTime(event.end_time)}` : ''}
            </span>
          </div>
        )}
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-wedding-dark/60">
            <span className="w-5 text-center">📍</span>
            <span>{event.location}</span>
          </div>
        )}
      </div>

      {event.description && (
        <p className="text-sm text-wedding-dark/70 mb-4 leading-relaxed">
          {event.description}
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap mb-4">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.color}`}>
          {badge.label}
        </span>
        <span className="text-xs text-wedding-dark/40">
          {count} {count === 1 ? 'persona' : 'personas'} confirmadas
        </span>
      </div>

      {event.badge_type !== 'couple_only' && (
        <button
          onClick={onToggle}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
            confirmed
              ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600'
              : 'bg-wedding-sand text-wedding-dark/70 hover:bg-wedding-coral hover:text-white'
          } disabled:opacity-50`}
        >
          <span className="text-lg">{loading ? '...' : confirmed ? '✅' : '👋'}</span>
          <span>{confirmed ? 'Apuntado' : 'Me apunto'}</span>
        </button>
      )}
    </div>
  )
}
