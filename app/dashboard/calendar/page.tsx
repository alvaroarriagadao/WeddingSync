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

const EMPTY_EVENT = {
  title: '', date: '2025-09-15', start_time: '10:00', end_time: '11:00',
  location: '', description: '', category: 'activity', badge_type: 'optional',
}

export default function AdminCalendarPage() {
  const [user, setUser] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [confirmations, setConfirmations] = useState<Record<string, number>>({})
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<any>(null)
  const [form, setForm] = useState({ ...EMPTY_EVENT })
  const [saving, setSaving] = useState(false)
  const [selectedDay, setSelectedDay] = useState('2025-09-15')
  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    if (!u || u.role !== 'admin') { router.push('/'); return }
    setUser(u)
    loadEvents()
  }, [])

  async function loadEvents() {
    const { data } = await supabase.from('events').select('*').order('date').order('start_time')
    if (data) setEvents(data)

    // Load confirmation counts
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
    if (!form.title.trim()) { toast.error('El título es obligatorio'); return }
    setSaving(true)
    const payload = { ...form, created_by: user.id }

    if (editingEvent) {
      const { error } = await supabase.from('events').update(payload).eq('id', editingEvent.id)
      if (error) { toast.error('Error al guardar'); setSaving(false); return }
      toast.success('Evento actualizado ✅')
    } else {
      const { error } = await supabase.from('events').insert([payload])
      if (error) { toast.error('Error al crear'); setSaving(false); return }
      toast.success('Evento creado 🎉')
    }

    setShowModal(false)
    setSaving(false)
    loadEvents()
  }

  async function deleteEvent(id: string) {
    if (!confirm('¿Eliminar este evento?')) return
    await supabase.from('events').delete().eq('id', id)
    toast.success('Evento eliminado')
    loadEvents()
  }

  const eventsByDay = WEEK_DATES.reduce((acc, d) => {
    acc[d] = events.filter(e => e.date === d)
    return acc
  }, {} as Record<string, any[]>)

  if (!user) return null

  return (
    <main className="min-h-screen bg-wedding-sand">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif text-wedding-dark">📅 Calendario de la Boda</h1>
            <p className="text-wedding-dark/60 mt-1">12–19 de Septiembre, 2025 · Cartagena de Indias</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-3 bg-wedding-coral text-white rounded-xl font-semibold hover:bg-opacity-90 transition-all shadow-md"
          >
            <span className="text-lg">+</span> Nuevo Evento
          </button>
        </div>

        {/* Day selector (mobile) */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 md:hidden scrollbar-hide">
          {WEEK_DATES.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedDay === d ? 'bg-wedding-coral text-white' : 'bg-white text-wedding-dark/70'
              }`}
            >
              {DAY_LABELS[d]}
              {eventsByDay[d].length > 0 && (
                <span className="ml-1 text-xs">({eventsByDay[d].length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Desktop: full week grid */}
        <div className="hidden md:grid grid-cols-8 gap-3">
          {WEEK_DATES.map(d => (
            <div key={d} className="min-h-[300px]">
              <div className={`text-center text-sm font-semibold py-2 px-1 rounded-t-xl mb-2 ${
                d === '2025-09-15' ? 'bg-wedding-gold text-white' : 'bg-white text-wedding-dark/70'
              }`}>
                {DAY_LABELS[d]}
              </div>
              <div className="space-y-2">
                {eventsByDay[d].map(ev => (
                  <EventChip key={ev.id} event={ev} count={confirmations[ev.id] || 0} onEdit={() => openEdit(ev)} onDelete={() => deleteEvent(ev.id)} admin />
                ))}
                <button
                  onClick={() => { setSelectedDay(d); openCreate() }}
                  className="w-full text-xs py-2 border-2 border-dashed border-wedding-sand text-wedding-dark/40 rounded-lg hover:border-wedding-coral hover:text-wedding-coral transition-colors"
                >
                  + añadir
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: selected day */}
        <div className="md:hidden space-y-3">
          {eventsByDay[selectedDay].length === 0 && (
            <div className="text-center py-10 text-wedding-dark/40">
              <div className="text-4xl mb-3">📭</div>
              <p>Sin eventos este día</p>
            </div>
          )}
          {eventsByDay[selectedDay].map(ev => (
            <EventCard key={ev.id} event={ev} count={confirmations[ev.id] || 0} onEdit={() => openEdit(ev)} onDelete={() => deleteEvent(ev.id)} admin />
          ))}
          <button
            onClick={openCreate}
            className="w-full py-3 border-2 border-dashed border-wedding-sand text-wedding-dark/50 rounded-xl hover:border-wedding-coral hover:text-wedding-coral transition-colors font-medium"
          >
            + Nuevo evento este día
          </button>
        </div>
      </div>

      {/* Modal */}
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
                {editingEvent ? '✏️ Editar Evento' : '✨ Nuevo Evento'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-wedding-dark/70 mb-1">Título *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral"
                    placeholder="Ej: Ceremonia de boda" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-wedding-dark/70 mb-1">Fecha</label>
                    <select value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full px-4 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral bg-white">
                      {WEEK_DATES.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-wedding-dark/70 mb-1">Categoría</label>
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
                  <label className="block text-sm font-semibold text-wedding-dark/70 mb-1">Descripción</label>
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

function EventChip({ event, count, onEdit, onDelete, admin }: any) {
  const cat = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.activity
  return (
    <div className={`p-2 rounded-lg border text-xs cursor-pointer group relative ${cat.bg}`} onClick={() => onEdit()}>
      <div className="font-semibold truncate">{cat.icon} {event.title}</div>
      {event.start_time && <div className="text-gray-500">{formatTime(event.start_time)}</div>}
      <div className="text-gray-500">{count} ✓</div>
      {admin && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="absolute top-1 right-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
        >✕</button>
      )}
    </div>
  )
}

function EventCard({ event, count, onEdit, onDelete, admin }: any) {
  const cat = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.activity
  const badge = BADGE_CONFIG[event.badge_type] || BADGE_CONFIG.optional
  return (
    <div className={`p-4 rounded-2xl border-2 ${cat.bg}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xl">{cat.icon}</span>
            <h3 className={`font-serif font-semibold text-lg ${cat.color}`}>{event.title}</h3>
          </div>
          {event.start_time && (
            <p className="text-sm text-gray-600 mb-1">
              🕐 {formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}
            </p>
          )}
          {event.location && <p className="text-sm text-gray-600 mb-2">📍 {event.location}</p>}
          {event.description && <p className="text-sm text-gray-500 mb-3">{event.description}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>{badge.label}</span>
            <span className="text-xs text-gray-500">{count} confirmados ✓</span>
          </div>
        </div>
        {admin && (
          <div className="flex flex-col gap-1">
            <button onClick={onEdit} className="text-xs px-2 py-1 bg-white/50 rounded-lg hover:bg-white transition-colors text-gray-600">✏️</button>
            <button onClick={onDelete} className="text-xs px-2 py-1 bg-white/50 rounded-lg hover:bg-red-100 transition-colors text-red-500">🗑</button>
          </div>
        )}
      </div>
    </div>
  )
}
