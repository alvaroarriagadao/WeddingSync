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

function computeCalendarDates(events: any[], extraDays = 0): string[] {
  let endDate = BASE_END
  for (const ev of events) {
    if (ev.date && ev.date > endDate) endDate = ev.date
  }
  if (extraDays > 0) {
    const d = new Date(endDate + 'T00:00:00')
    d.setDate(d.getDate() + extraDays)
    endDate = d.toISOString().slice(0, 10)
  }
  // Always show at least two weeks so the compact view has something to scroll through
  const minEnd = new Date(BASE_START + 'T00:00:00')
  minEnd.setDate(minEnd.getDate() + 13)
  const minEndStr = minEnd.toISOString().slice(0, 10)
  if (endDate < minEndStr) endDate = minEndStr
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
  if (firstMonth === lastMonth) return `${first.getDate()} - ${last.getDate()} ${firstMonth} ${year}`
  return `${first.getDate()} ${firstMonth} - ${last.getDate()} ${lastMonth} ${year}`
}

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6]
const HOUR_HEIGHT_DESKTOP = 60 // pixels per hour, used only in the expanded schedule view

function timeToGridMinutes(time: string): number {
  if (!time) return 0
  const [h, m] = time.split(':').map(Number)
  const adjustedH = h >= 7 ? h - 7 : h + 17
  return adjustedH * 60 + m
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    ceremony: '#F59E0B', meal: '#F97316', activity: '#14B8A6',
    transfer: '#9CA3AF', party: '#A855F7',
  }
  return colors[category] || '#9CA3AF'
}

function getCategoryBg(category: string): string {
  const bgs: Record<string, string> = {
    ceremony: 'rgba(245, 158, 11, 0.15)', meal: 'rgba(249, 115, 22, 0.15)',
    activity: 'rgba(20, 184, 166, 0.15)', transfer: 'rgba(156, 163, 175, 0.15)',
    party: 'rgba(168, 85, 247, 0.15)',
  }
  return bgs[category] || 'rgba(156, 163, 175, 0.15)'
}

export default function GuestCalendarPage() {
  const [user, setUser] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [myConfirmations, setMyConfirmations] = useState<Set<string>>(new Set())
  const [totalConfirmations, setTotalConfirmations] = useState<Record<string, number>>({})
  const [selectedDay, setSelectedDay] = useState(WEDDING_DAY)
  const [extraDays, setExtraDays] = useState(0)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [expanded, setExpanded] = useState(false)
  const calGridRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    if (!u) { router.push('/'); return }
    setUser(u)
    loadData(u.id)
  }, [])

  useEffect(() => {
    if (calGridRef.current) calGridRef.current.scrollTop = 0
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

  const calendarDates = computeCalendarDates(events, extraDays)
  const eventsByDay = calendarDates.reduce((acc, d) => {
    acc[d] = events.filter(e => e.date === d)
    return acc
  }, {} as Record<string, any[]>)

  if (!user) return null

  return (
    <main className="min-h-screen bg-wedding-sand font-guest">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-5 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl font-guest-serif text-wedding-dark">Itinerario</h1>
            <p className="text-wedding-dark/60 mt-1">{formatSubtitleRange(calendarDates)} / Cartagena de Indias</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExtraDays(d => d + 7)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white border-2 border-wedding-sand text-wedding-dark/60 rounded-xl font-semibold hover:border-wedding-coral hover:text-wedding-coral transition-all text-sm"
            >
              + 7 días →
            </button>
            <button
              onClick={() => setExpanded(e => !e)}
              className="hidden md:flex items-center gap-1.5 px-4 py-2.5 bg-white border-2 border-wedding-sand text-wedding-dark/60 rounded-xl font-semibold hover:border-wedding-coral hover:text-wedding-coral transition-all text-sm"
            >
              {expanded ? '📋 Vista compacta' : '🕐 Expandir horario'}
            </button>
          </div>
        </motion.div>

        {/* Mobile day selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 md:hidden scrollbar-hide">
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

        {!expanded ? (
          /* ==================== DESKTOP: Compact day-card board (wraps to new rows) ==================== */
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-wedding-sand p-3">
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div className="flex flex-wrap gap-3">
                {calendarDates.map(d => {
                  const dayEvts = [...(eventsByDay[d] || [])]
                    .sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99'))
                  return (
                    <div
                      key={d}
                      className={`w-[210px] flex-shrink-0 border border-wedding-sand rounded-xl overflow-hidden flex flex-col ${
                        d === WEDDING_DAY ? 'bg-wedding-gold/5' : ''
                      }`}
                    >
                      <div className={`text-center py-2 text-sm font-semibold border-b border-wedding-sand ${
                        d === WEDDING_DAY ? 'bg-wedding-gold/10 text-wedding-gold' : 'bg-wedding-sand/30 text-wedding-dark/70'
                      }`}>
                        {getDayLabel(d)}
                        {dayEvts.length > 0 && (
                          <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                            d === WEDDING_DAY ? 'bg-wedding-gold/20' : 'bg-wedding-sand'
                          }`}>
                            {dayEvts.length}
                          </span>
                        )}
                      </div>

                      <div className="p-2 space-y-2 overflow-y-auto" style={{ maxHeight: '320px' }}>
                        {dayEvts.length === 0 ? (
                          <div className="text-center py-6 text-xs text-wedding-dark/30">Día libre</div>
                        ) : (
                          dayEvts.map((ev, idx, arr) => {
                            const cat = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.activity
                            const confirmed = myConfirmations.has(ev.id)
                            const isSelected = selectedEvent?.id === ev.id
                            const isLast = idx === arr.length - 1
                            const color = getCategoryColor(ev.category)

                            return (
                              <button
                                key={ev.id}
                                onClick={() => setSelectedEvent(isSelected ? null : ev)}
                                className={`w-full flex gap-2 text-left rounded-lg p-2 transition-all ${
                                  isSelected ? 'ring-2 ring-wedding-coral shadow-md' : ''
                                } ${confirmed ? 'ring-2 ring-green-400' : ''}`}
                                style={{ background: getCategoryBg(ev.category) }}
                              >
                                <div className="flex flex-col items-center pt-0.5 flex-shrink-0">
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                                  {!isLast && (
                                    <span className="flex-1 w-px mt-1" style={{ background: color, opacity: 0.25, minHeight: '8px' }} />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 pb-0.5">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs flex-shrink-0">{cat.icon}</span>
                                    <span className="text-[12px] font-semibold text-wedding-dark truncate leading-tight">
                                      {ev.title}
                                    </span>
                                    {confirmed && <span className="text-[10px] flex-shrink-0">✅</span>}
                                  </div>
                                  <div className="text-[10px] text-wedding-dark/50 mt-0.5">
                                    {ev.start_time
                                      ? `${formatTime(ev.start_time)}${ev.end_time ? `-${formatTime(ev.end_time)}` : ''}`
                                      : 'Por confirmar'}
                                  </div>
                                </div>
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ==================== DESKTOP: Expanded full week timeline ==================== */
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-wedding-sand overflow-hidden">
            <div ref={calGridRef} className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div style={{ minWidth: `${64 + calendarDates.length * 150}px` }}>
                {/* Day headers */}
                <div className="flex sticky top-0 z-30 bg-white border-b border-wedding-sand">
                  <div className="w-16 flex-shrink-0 border-r border-wedding-sand" />
                  {calendarDates.map(d => (
                    <div
                      key={d}
                      className={`w-[150px] flex-shrink-0 text-center py-3 text-sm font-semibold border-r border-wedding-sand last:border-r-0 ${
                        d === WEDDING_DAY ? 'bg-wedding-gold/10 text-wedding-gold' : 'text-wedding-dark/70'
                      }`}
                    >
                      {getDayLabel(d)}
                      {eventsByDay[d]?.length > 0 && (
                        <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                          d === WEDDING_DAY ? 'bg-wedding-gold/20' : 'bg-wedding-sand'
                        }`}>
                          {eventsByDay[d].length}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Time grid */}
                <div className="flex relative">
                  <div className="w-16 flex-shrink-0 border-r border-wedding-sand">
                    {HOURS.map(hour => (
                      <div
                        key={hour}
                        className="relative border-b border-wedding-sand/50"
                        style={{ height: `${HOUR_HEIGHT_DESKTOP}px` }}
                      >
                        <span className="absolute right-2 -top-2.5 text-xs text-wedding-dark/40 bg-white px-0.5 select-none">
                          {String(hour).padStart(2, '0')}:00
                        </span>
                      </div>
                    ))}
                  </div>

                  {calendarDates.map(d => {
                    const dayEvts = (eventsByDay[d] || []).filter(e => e.start_time)
                    return (
                      <div
                        key={d}
                        className={`w-[150px] flex-shrink-0 relative border-r border-wedding-sand last:border-r-0 ${
                          d === WEDDING_DAY ? 'bg-wedding-gold/5' : ''
                        }`}
                      >
                        {HOURS.map(hour => (
                          <div
                            key={hour}
                            className="border-b border-wedding-sand/50"
                            style={{ height: `${HOUR_HEIGHT_DESKTOP}px` }}
                          />
                        ))}

                        {dayEvts.map(ev => {
                          const cat = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.activity
                          const confirmed = myConfirmations.has(ev.id)
                          const startMin = timeToGridMinutes(ev.start_time)
                          const rawEnd = ev.end_time ? timeToGridMinutes(ev.end_time) : startMin + 60
                          const endMin = rawEnd >= startMin ? rawEnd : rawEnd + 24 * 60
                          const topPx = (startMin / 60) * HOUR_HEIGHT_DESKTOP
                          const heightPx = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT_DESKTOP, 28)
                          const isSelected = selectedEvent?.id === ev.id

                          return (
                            <div
                              key={ev.id}
                              className={`absolute left-1 right-1 rounded-lg cursor-pointer overflow-hidden hover:shadow-md transition-shadow z-10 ${
                                isSelected ? 'ring-2 ring-wedding-coral shadow-lg' : ''
                              } ${confirmed ? 'ring-2 ring-green-400' : ''}`}
                              style={{
                                top: `${topPx}px`,
                                height: `${heightPx}px`,
                                background: getCategoryBg(ev.category),
                                borderLeft: `3px solid ${getCategoryColor(ev.category)}`,
                              }}
                              onClick={() => setSelectedEvent(isSelected ? null : ev)}
                            >
                              <div className="px-1.5 py-1 h-full flex flex-col overflow-hidden">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs flex-shrink-0">{cat.icon}</span>
                                  <span className="text-[11px] font-semibold text-wedding-dark truncate leading-tight">
                                    {ev.title}
                                  </span>
                                  {confirmed && <span className="text-[10px] flex-shrink-0">✅</span>}
                                </div>
                                {heightPx > 35 && (
                                  <span className="text-[10px] text-wedding-dark/50 truncate">
                                    {formatTime(ev.start_time)}{ev.end_time ? `-${formatTime(ev.end_time)}` : ''}
                                  </span>
                                )}
                                {heightPx > 50 && (
                                  <span className="text-[10px] text-wedding-dark/40 truncate">
                                    {totalConfirmations[ev.id] || 0} van
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== MOBILE: Compact agenda list ==================== */}
        <div className="md:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDay}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {(eventsByDay[selectedDay] || []).length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
                  <div className="text-5xl mb-4">🏖️</div>
                  <p className="text-wedding-dark/50 text-lg font-guest-serif">Día libre</p>
                  <p className="text-wedding-dark/40 text-sm mt-1">Explora Cartagena a tu ritmo</p>
                </div>
              ) : (
                <div
                  className="bg-white rounded-2xl shadow-sm border border-wedding-sand overflow-y-auto p-3 space-y-2"
                  style={{ maxHeight: 'calc(100vh - 240px)' }}
                >
                  {[...(eventsByDay[selectedDay] || [])]
                    .sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99'))
                    .map((ev, idx, arr) => {
                      const cat = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.activity
                      const confirmed = myConfirmations.has(ev.id)
                      const isSelected = selectedEvent?.id === ev.id
                      const isLast = idx === arr.length - 1
                      const color = getCategoryColor(ev.category)

                      return (
                        <button
                          key={ev.id}
                          onClick={() => setSelectedEvent(isSelected ? null : ev)}
                          className={`w-full flex gap-3 text-left rounded-xl p-3 transition-all ${
                            isSelected ? 'ring-2 ring-wedding-coral shadow-md' : ''
                          } ${confirmed ? 'ring-2 ring-green-400' : ''}`}
                          style={{ background: getCategoryBg(ev.category) }}
                        >
                          <div className="flex flex-col items-center pt-0.5 flex-shrink-0">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                            {!isLast && (
                              <span className="flex-1 w-px mt-1" style={{ background: color, opacity: 0.25, minHeight: '10px' }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pb-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm flex-shrink-0">{cat.icon}</span>
                              <span className="font-guest-serif text-sm font-semibold text-wedding-dark truncate">
                                {ev.title}
                              </span>
                              {confirmed && <span className="text-xs flex-shrink-0">✅</span>}
                            </div>
                            <div className="text-xs text-wedding-dark/60 mt-0.5">
                              {ev.start_time
                                ? `${formatTime(ev.start_time)}${ev.end_time ? ` - ${formatTime(ev.end_time)}` : ''}`
                                : 'Hora por confirmar'}
                            </div>
                            {ev.location && (
                              <div className="text-xs text-wedding-dark/50 truncate mt-0.5">📍 {ev.location}</div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

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

      {/* Desktop event detail sidebar */}
      <AnimatePresence>
        {selectedEvent && (
          <>
            <motion.div
              className="hidden md:block fixed right-6 top-24 z-40 w-80"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
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

            {/* Mobile bottom sheet */}
            <motion.div
              className="md:hidden fixed inset-0 z-50 flex flex-col justify-end"
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
          </>
        )}
      </AnimatePresence>
    </main>
  )
}

function EventDetailPanel({ event, confirmed, count, loading, onToggle, onClose }: {
  event: any; confirmed: boolean; count: number; loading: boolean;
  onToggle: () => void; onClose: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-wedding-sand overflow-hidden">
      <div className="h-2" style={{ background: getCategoryColor(event.category) }} />
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
            className="text-wedding-dark/30 hover:text-wedding-dark/60 transition-colors ml-2 text-xl leading-none"
          >
            ×
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
            <span>{formatTime(event.start_time)}{event.end_time ? ` - ${formatTime(event.end_time)}` : ''}</span>
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
        <p className="text-sm text-wedding-dark/70 mb-4 leading-relaxed">{event.description}</p>
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
          <span>{confirmed ? 'Apuntado — cancelar' : 'Me apunto'}</span>
        </button>
      )}
    </div>
  )
}
