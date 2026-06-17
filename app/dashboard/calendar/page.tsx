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
    ceremony: 'rgba(245, 158, 11, 0.18)',
    meal: 'rgba(249, 115, 22, 0.18)',
    activity: 'rgba(20, 184, 166, 0.18)',
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

        {/* ==================== DESKTOP: Compact agenda board ==================== */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-wedding-sand overflow-hidden">
          <div ref={calGridRef} className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <div className="flex" style={{ minWidth: `${calendarDates.length * 210}px` }}>
              {calendarDates.map(d => {
                const dayEvts = [...(eventsByDay[d] || [])]
                  .sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99'))
                return (
                  <div
                    key={d}
                    className={`w-[210px] flex-shrink-0 border-r border-wedding-sand last:border-r-0 flex flex-col ${
                      d === WEDDING_DAY ? 'bg-wedding-gold/5' : ''
                    }`}
                  >
                    <div className={`sticky top-0 z-10 flex items-center justify-between gap-1 py-2 px-3 text-sm font-semibold border-b border-wedding-sand ${
                      d === WEDDING_DAY ? 'bg-wedding-gold/10 text-wedding-gold' : 'bg-white text-wedding-dark/70'
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

                    <div className="p-2 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                      {dayEvts.length === 0 ? (
                        <div className="text-center py-8 text-xs text-wedding-dark/30">Sin eventos</div>
                      ) : (
                        dayEvts.map((ev, idx, arr) => {
                          const cat = CATEGORY_CONFIG[ev.category] || CATEGORY_CONFIG.activity
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
                                <div className="text-[10px] text-wedding-dark/40 mt-0.5">{count} conf.</div>
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
