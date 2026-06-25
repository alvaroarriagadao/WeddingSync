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
    if (ev.date && ev.date > endDate) {
      endDate = ev.date
    }
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
  if (firstMonth === lastMonth) {
    return `${first.getDate()} - ${last.getDate()} ${firstMonth} ${year}`
  }
  return `${first.getDate()} ${firstMonth} - ${last.getDate()} ${lastMonth} ${year}`
}

const EMPTY_EVENT = {
  title: '', date: '2026-09-15', start_time: '10:00', end_time: '11:00',
  location: '', description: '', category: 'activity', badge_type: 'optional',
}

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6]
const HOUR_HEIGHT_DESKTOP = 60 // pixels per hour, used only in the expanded schedule view

// Minutes offset from 7am (wraps: 7→0, 8→60, ..., 23→960, 0→1020, ..., 6→1380)
function timeToGridMinutes(time: string): number {
  if (!time) return 0
  const [h, m] = time.split(':').map(Number)
  const adjustedH = h >= 7 ? h - 7 : h + 17
  return adjustedH * 60 + m
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    ceremony: '#F59E0B',
    meal: '#F97316',
    activity: '#0EA5E9',
    transfer: '#9CA3AF',
    party: '#A855F7',
  }
  return colors[category] || '#9CA3AF'
}

function getCategoryBg(category: string): string {
  const bgs: Record<string, string> = {
    ceremony: 'rgba(245, 158, 11, 0.18)',
    meal: 'rgba(249, 115, 22, 0.18)',
    activity: 'rgba(14, 165, 233, 0.18)',
    transfer: 'rgba(156, 163, 175, 0.18)',
    party: 'rgba(168, 85, 247, 0.18)',
  }
  return bgs[category] || 'rgba(156, 163, 175, 0.18)'
}

export default function AdminCalendarPage() {
  const [user, setUser] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [confirmations, setConfirmations] = useState<Record<string, number>>({})
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<any>(null)
  const [form, setForm] = useState({ ...EMPTY_EVENT })
  const [saving, setSaving] = useState(false)
  const [selectedDay, setSelectedDay] = useState('2026-09-15')
  const [extraDays, setExtraDays] = useState(7)
  const [expanded, setExpanded] = useState(false)
  const router = useRouter()
  const calGridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const u = getStoredUser()
    if (!u || u.role !== 'admin') { router.push('/'); return }
    setUser(u)
    loadEvents()
  }, [])

  useEffect(() => {
    if (calGridRef.current) {
      calGridRef.current.scrollTop = 0
    }
  }, [])

  async function loadEvents() {
    const { data } = await supabase.from('events').select('*').order('date').order('start_time')
    if (data) setEvents(data)

    const { data: confs } = await supabase.from('event_confirmations').select('event_id')
    if (confs) {
      const counts: Record<string, number> = {}
      confs.forEach(c => { counts[c.event_id] = (counts[c.event_id] || 0) + 1 })
      setConfirmations(counts)
    }
  }

  function openCreate() {
    setEditingEvent(null)
    setForm({ ...EMPTY_EVENT, date: selectedDay })
    setShowModal(true)
  }

  function openEdit(event: any) {
    setEditingEvent(event)
    setForm({
      title: event.title, date: event.date,
      start_time: event.start_time || '', end_time: event.end_time || '',
      location: event.location || '', description: event.description || '',
      category: event.category, badge_type: event.badge_type,
    })
    setShowModal(true)
  }

  async function saveEvent() {
    if (!form.title.trim()) { toast.error('El titulo es obligatorio'); return }
    setSaving(true)
    const payload = { ...form, created_by: user.id }

    if (editingEvent) {
      const { error } = await supabase.from('events').update(payload).eq('id', editingEvent.id)
      if (error) { toast.error('Error al guardar'); setSaving(false); return }
      toast.success('Evento actualizado')
    } else {
      const { error } = await supabase.from('events').insert([payload])
      if (error) { toast.error('Error al crear'); setSaving(false); return }
      toast.success('Evento creado')
    }

    setShowModal(false)
    setSaving(false)
    loadEvents()
  }

  async function deleteEvent(id: string) {
    if (!confirm('Eliminar este evento?')) return
    await supabase.from('events').delete().eq('id', id)
    toast.success('Evento eliminado')
    loadEvents()
  }

  function openCreateForDay(date: string) {
    setEditingEvent(null)
    setForm({ ...EMPTY_EVENT, date })
    setShowModal(true)
  }

  function openCreateAtTime(date: string, hour: number) {
    setEditingEvent(null)
    const startH = String(hour).padStart(2, '0')
    const endH = String(hour + 1).padStart(2, '0')
    setForm({ ...EMPTY_EVENT, date, start_time: `${startH}:00`, end_time: `${endH}:00` })
    setShowModal(true)
  }

  const calendarDates = computeCalendarDates(events, extraDays)

  const eventsByDay = calendarDates.reduce((acc, d) => {
    acc[d] = events.filter(e => e.date === d)
    return acc
  }, {} as Record<string, any[]>)

  if (!user) return null

  return (
    <main className="min-h-screen bg-wedding-sand">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif text-wedding-dark">Calendario de la Boda</h1>
            <p className="text-wedding-dark/60 mt-1">{formatSubtitleRange(calendarDates)} / Cartagena de Indias</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExtraDays(d => d + 7)}
              className="flex items-center gap-1.5 px-4 py-3 bg-white border-2 border-wedding-sand text-wedding-dark/60 rounded-xl font-semibold hover:border-wedding-coral hover:text-wedding-coral transition-all text-sm"
            >
              + 7 días →
            </button>
            <button
              onClick={() => setExpanded(e => !e)}
              className="hidden md:flex items-center gap-1.5 px-4 py-3 bg-white border-2 border-wedding-sand text-wedding-dark/60 rounded-xl font-semibold hover:border-wedding-coral hover:text-wedding-coral transition-all text-sm"
            >
              {expanded ? '📋 Vista compacta' : '🕐 Expandir horario'}
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-3 bg-wedding-coral text-white rounded-xl font-semibold hover:bg-opacity-90 transition-all shadow-md"
            >
              <span className="text-lg">+</span> Nuevo Evento
            </button>
          </div>
        </div>

        {/* Mobile day selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 md:hidden scrollbar-hide">
          {calendarDates.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedDay === d
                  ? d === WEDDING_DAY
                    ? 'bg-wedding-gold text-white'
                    : 'bg-wedding-coral text-white'
                  : 'bg-white text-wedding-dark/70'
              }`}
            >
              {getDayLabel(d)}
              {eventsByDay[d]?.length > 0 && (
                <span className="ml-1 text-xs">({eventsByDay[d].length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Legend: explains category colors and badge colors */}
        <div className="hidden md:flex items-center gap-4 flex-wrap mb-3 px-3 py-2 bg-white rounded-xl border border-wedding-sand text-xs">
          <span className="text-wedding-dark/40 font-semibold">Categorías:</span>
          {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1 text-wedding-dark/60">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getCategoryColor(k) }} />
              {v.icon} {v.label}
            </span>
          ))}
          <span className="w-px h-4 bg-wedding-sand mx-1" />
          <span className="text-wedding-dark/40 font-semibold">Para quién:</span>
          {Object.entries(BADGE_CONFIG).map(([k, v]) => (
            <span key={k} className={`px-2 py-0.5 rounded-full font-medium ${v.color}`}>{v.label}</span>
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
                      <div className={`flex items-center justify-between gap-1 py-2 px-3 text-sm font-semibold border-b border-wedding-sand ${
                        d === WEDDING_DAY ? 'bg-wedding-gold/10 text-wedding-gold' : 'bg-wedding-sand/30 text-wedding-dark/70'
                      }`}>
                        <span>
                          {getDayLabel(d)}
                          {dayEvts.length > 0 && (
                            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                              d === WEDDING_DAY ? 'bg-wedding-gold/20' : 'bg-wedding-sand'
                            }`}>
                              {dayEvts.length}
                            </span>
                          )}
                        </span>
                        <button
                          onClick={() => openCreateForDay(d)}
                          className="text-wedding-dark/40 hover:text-wedding-coral text-lg leading-none flex-shrink-0"
                          title="Nuevo evento este día"
                        >
                          +
                        </button>
                      </div>

                      <div className="p-2 space-y-2 overflow-y-auto" style={{ maxHeight: '320px' }}>
                        {dayEvts.length === 0 ? (
                          <div className="text-center py-6 text-xs text-wedding-dark/30">Sin eventos</div>
                        ) : (
                          dayEvts.map((ev, idx, arr) => {
                            const cat = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.activity
                            const badge = BADGE_CONFIG[ev.badge_type] || BADGE_CONFIG.optional
                            const count = confirmations[ev.id] || 0
                            const isLast = idx === arr.length - 1
                            const color = getCategoryColor(ev.category)

                            return (
                              <div
                                key={ev.id}
                                onClick={() => openEdit(ev)}
                                className="w-full flex gap-2 text-left rounded-lg p-2 cursor-pointer hover:shadow-md transition-shadow relative group/ev"
                                style={{ background: getCategoryBg(ev.category) }}
                              >
                                <div className="flex flex-col items-center pt-0.5 flex-shrink-0">
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                                  {!isLast && (
                                    <span className="flex-1 w-px mt-1" style={{ background: color, opacity: 0.25, minHeight: '8px' }} />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 pb-0.5 pr-8">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs flex-shrink-0">{cat.icon}</span>
                                    <span className="text-[12px] font-semibold text-wedding-dark truncate leading-tight">
                                      {ev.title}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-wedding-dark/50 mt-0.5">
                                    {ev.start_time
                                      ? `${formatTime(ev.start_time)}${ev.end_time ? `-${formatTime(ev.end_time)}` : ''}`
                                      : 'Por confirmar'}
                                  </div>
                                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
                                      {badge.label}
                                    </span>
                                    <span className="text-[10px] text-wedding-dark/40">{count} conf.</span>
                                  </div>
                                </div>
                                {/* Hover actions */}
                                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover/ev:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openEdit(ev) }}
                                    className="text-[10px] bg-white/80 rounded px-1 py-0.5 hover:bg-white text-wedding-dark/60"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteEvent(ev.id) }}
                                    className="text-[10px] bg-white/80 rounded px-1 py-0.5 hover:bg-red-100 text-red-500"
                                  >
                                    🗑
                                  </button>
                                </div>
                              </div>
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
                            className="border-b border-wedding-sand/50 cursor-pointer hover:bg-wedding-coral/5 transition-colors group"
                            style={{ height: `${HOUR_HEIGHT_DESKTOP}px` }}
                            onDoubleClick={() => openCreateAtTime(d, hour)}
                          >
                            <span className="hidden group-hover:block text-[10px] text-wedding-coral/60 p-1 select-none">
                              + doble click
                            </span>
                          </div>
                        ))}

                        {dayEvts.map(ev => {
                          const cat = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.activity
                          const startMin = timeToGridMinutes(ev.start_time)
                          const rawEnd = ev.end_time ? timeToGridMinutes(ev.end_time) : startMin + 60
                          const endMin = rawEnd >= startMin ? rawEnd : rawEnd + 24 * 60
                          const topPx = (startMin / 60) * HOUR_HEIGHT_DESKTOP
                          const heightPx = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT_DESKTOP, 28)
                          const count = confirmations[ev.id] || 0

                          return (
                            <div
                              key={ev.id}
                              className="absolute left-1 right-1 rounded-lg cursor-pointer overflow-hidden group/ev hover:shadow-md transition-shadow z-10"
                              style={{
                                top: `${topPx}px`,
                                height: `${heightPx}px`,
                                background: getCategoryBg(ev.category),
                                borderLeft: `3px solid ${getCategoryColor(ev.category)}`,
                              }}
                              onClick={() => openEdit(ev)}
                            >
                              <div className="px-1.5 py-1 h-full flex flex-col overflow-hidden">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs flex-shrink-0">{cat.icon}</span>
                                  <span className="text-[11px] font-semibold text-wedding-dark truncate leading-tight">
                                    {ev.title}
                                  </span>
                                </div>
                                {heightPx > 35 && (
                                  <span className="text-[10px] text-wedding-dark/50 truncate">
                                    {formatTime(ev.start_time)}{ev.end_time ? `-${formatTime(ev.end_time)}` : ''}
                                  </span>
                                )}
                                {heightPx > 50 && (
                                  <span className="text-[10px] text-wedding-dark/40 truncate">
                                    {count} conf.
                                  </span>
                                )}
                              </div>
                              <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover/ev:opacity-100 transition-opacity z-20">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openEdit(ev) }}
                                  className="text-[10px] bg-white/80 rounded px-1 py-0.5 hover:bg-white text-wedding-dark/60"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteEvent(ev.id) }}
                                  className="text-[10px] bg-white/80 rounded px-1 py-0.5 hover:bg-red-100 text-red-500"
                                >
                                  🗑
                                </button>
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
          <div
            className="bg-white rounded-2xl shadow-sm border border-wedding-sand overflow-y-auto p-3 space-y-2"
            style={{ maxHeight: 'calc(100vh - 220px)' }}
          >
            {(eventsByDay[selectedDay] || []).length === 0 ? (
              <div className="text-center py-10 text-wedding-dark/40 text-sm">Sin eventos este día</div>
            ) : (
              [...(eventsByDay[selectedDay] || [])]
                .sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99'))
                .map((ev, idx, arr) => {
                  const cat = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.activity
                  const badge = BADGE_CONFIG[ev.badge_type] || BADGE_CONFIG.optional
                  const count = confirmations[ev.id] || 0
                  const isLast = idx === arr.length - 1
                  const color = getCategoryColor(ev.category)

                  return (
                    <div
                      key={ev.id}
                      onClick={() => openEdit(ev)}
                      className="w-full flex gap-3 text-left rounded-xl p-3 cursor-pointer hover:shadow-md transition-shadow relative"
                      style={{ background: getCategoryBg(ev.category) }}
                    >
                      <div className="flex flex-col items-center pt-0.5 flex-shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        {!isLast && (
                          <span className="flex-1 w-px mt-1" style={{ background: color, opacity: 0.25, minHeight: '10px' }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-0.5 pr-12">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm flex-shrink-0">{cat.icon}</span>
                          <span className="font-serif text-sm font-semibold text-wedding-dark truncate">
                            {ev.title}
                          </span>
                        </div>
                        <div className="text-xs text-wedding-dark/60 mt-0.5">
                          {ev.start_time
                            ? `${formatTime(ev.start_time)}${ev.end_time ? ` - ${formatTime(ev.end_time)}` : ''}`
                            : 'Hora por confirmar'}
                        </div>
                        {ev.location && (
                          <div className="text-xs text-wedding-dark/50 truncate mt-0.5">📍 {ev.location}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="text-[10px] text-wedding-dark/40">{count} conf.</span>
                        </div>
                      </div>
                      {/* Action buttons */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(ev) }}
                          className="text-xs bg-white/70 rounded-lg px-1.5 py-0.5 text-wedding-dark/50"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteEvent(ev.id) }}
                          className="text-xs bg-white/70 rounded-lg px-1.5 py-0.5 text-red-400"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  )
                })
            )}
          </div>

          {/* Mobile add button */}
          <button
            onClick={openCreate}
            className="w-full mt-3 py-3 border-2 border-dashed border-wedding-sand text-wedding-dark/50 rounded-xl hover:border-wedding-coral hover:text-wedding-coral transition-colors font-medium"
          >
            + Nuevo evento este dia
          </button>
        </div>
      </div>

      {/* ==================== MODAL ==================== */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 z-10 max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            >
              <h2 className="text-2xl font-serif text-wedding-dark mb-6">
                {editingEvent ? 'Editar Evento' : 'Nuevo Evento'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-wedding-dark/70 mb-1">Titulo *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral"
                    placeholder="Ej: Ceremonia de boda" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-wedding-dark/70 mb-1">Fecha</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      min="2026-09-01"
                      max="2027-12-31"
                      className="w-full px-4 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-wedding-dark/70 mb-1">Categoria</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-4 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral bg-white">
                      {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.icon} {v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-wedding-dark/70 mb-1">Hora inicio</label>
                    <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                      className="w-full px-4 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-wedding-dark/70 mb-1">Hora fin</label>
                    <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                      className="w-full px-4 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-wedding-dark/70 mb-1">Lugar</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral"
                    placeholder="Ej: Hotel Santa Clara" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-wedding-dark/70 mb-1">Descripcion</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral resize-none"
                    placeholder="Detalles del evento..." />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-wedding-dark/70 mb-1">Badge</label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(BADGE_CONFIG).map(([k, v]) => (
                      <button key={k} type="button"
                        onClick={() => setForm(f => ({ ...f, badge_type: k }))}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border-2 ${
                          form.badge_type === k ? 'border-wedding-coral bg-wedding-coral text-white' : `border-transparent ${v.color}`
                        }`}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border-2 border-wedding-sand rounded-xl font-semibold text-wedding-dark/60 hover:bg-wedding-sand transition-colors">
                  Cancelar
                </button>
                <button onClick={saveEvent} disabled={saving}
                  className="flex-1 py-3 bg-wedding-coral text-white rounded-xl font-semibold hover:bg-opacity-90 transition-all disabled:opacity-50">
                  {saving ? 'Guardando...' : editingEvent ? 'Actualizar' : 'Crear Evento'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
