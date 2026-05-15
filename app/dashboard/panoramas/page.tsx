'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getStoredUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const ACTIVITY_OPTIONS = [
  { value: 'low', label: 'Relajado' },
  { value: 'medium', label: 'Moderado' },
  { value: 'high', label: 'Activo' },
]

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

const emptyForm = {
  name: '',
  description: '',
  admin_notes: '',
  activity_level: 'medium',
  duration_hours: '',
  price_cop: '',
  price_clp: '',
  suggested_date: '',
  suggested_time: '',
  image_url: '',
  photo_url: '',
}

export default function AdminPanoramasPage() {
  const [user, setUser] = useState<any>(null)
  const [ranking, setRanking] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    if (!u || u.role !== 'admin') { router.push('/'); return }
    setUser(u)
    loadRanking()
  }, [])

  async function loadRanking() {
    const [{ data: attrs }, { data: votes }] = await Promise.all([
      supabase.from('attractions').select('*'),
      supabase.from('attraction_votes').select('attraction_id, rating'),
    ])

    if (attrs && votes) {
      const sums: Record<string, number> = {}
      const counts: Record<string, number> = {}
      votes.forEach(v => {
        sums[v.attraction_id] = (sums[v.attraction_id] || 0) + (v.rating ?? 5)
        counts[v.attraction_id] = (counts[v.attraction_id] || 0) + 1
      })
      const ranked = attrs
        .map(a => ({
          ...a,
          ratingCount: counts[a.id] || 0,
          avgRating: counts[a.id] ? sums[a.id] / counts[a.id] : 0,
        }))
        .sort((a, b) => b.avgRating - a.avgRating || b.ratingCount - a.ratingCount)
      setRanking(ranked)
    }
  }

  function openCreateModal() {
    setEditingId(null)
    setForm(emptyForm)
    setPhotos([])
    setShowModal(true)
  }

  function openEditModal(attr: any) {
    setEditingId(attr.id)
    setForm({
      name: attr.name || '',
      description: attr.description || '',
      admin_notes: attr.admin_notes || '',
      activity_level: attr.activity_level || 'medium',
      duration_hours: attr.duration_hours?.toString() || '',
      price_cop: attr.price_cop?.toString() || '',
      price_clp: attr.price_clp?.toString() || '',
      suggested_date: attr.suggested_date || '',
      suggested_time: attr.suggested_time || '',
      image_url: attr.image_url || '',
      photo_url: attr.photo_url || '',
    })
    setPhotos(attr.photos || [])
    setShowModal(true)
  }

  async function uploadPhotos(files: FileList) {
    setUploading(true)
    const newUrls: string[] = []

    for (const file of Array.from(files)) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}" no es una imagen`)
        continue
      }
      // Validate size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" es muy grande (máx 5MB)`)
        continue
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error } = await supabase.storage
        .from('panoramas')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (error) {
        toast.error(`Error subiendo "${file.name}"`)
        console.error(error)
        continue
      }

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/panoramas/${fileName}`
      newUrls.push(publicUrl)
    }

    if (newUrls.length > 0) {
      setPhotos(prev => [...prev, ...newUrls])
      toast.success(`${newUrls.length} foto${newUrls.length > 1 ? 's' : ''} subida${newUrls.length > 1 ? 's' : ''}`)
    }
    setUploading(false)
  }

  function removePhoto(url: string) {
    setPhotos(prev => prev.filter(p => p !== url))
  }

  async function saveForm() {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      admin_notes: form.admin_notes.trim() || null,
      activity_level: form.activity_level || null,
      duration_hours: form.duration_hours ? parseFloat(form.duration_hours) : null,
      price_cop: form.price_cop ? parseInt(form.price_cop) : null,
      price_clp: form.price_clp ? parseInt(form.price_clp) : null,
      suggested_date: form.suggested_date || null,
      suggested_time: form.suggested_time || null,
      image_url: form.image_url.trim() || null,
      photo_url: photos.length > 0 ? photos[0] : (form.photo_url.trim() || null),
      photos: photos,
    }

    if (editingId) {
      const { error } = await supabase.from('attractions').update(payload).eq('id', editingId)
      if (error) { toast.error('Error al actualizar'); setSaving(false); return }
      toast.success('Panorama actualizado')
    } else {
      const { error } = await supabase.from('attractions').insert([payload])
      if (error) { toast.error('Error al crear'); setSaving(false); return }
      toast.success('Panorama creado')
    }

    setSaving(false)
    setShowModal(false)
    loadRanking()
  }

  async function deleteAttraction(id: string) {
    if (!confirm('Seguro que quieres eliminar este panorama? Se perderan sus votos.')) return
    setDeleting(id)
    // Delete votes first, then the attraction
    await supabase.from('attraction_votes').delete().eq('attraction_id', id)
    const { error } = await supabase.from('attractions').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); setDeleting(null); return }
    toast.success('Panorama eliminado')
    setDeleting(null)
    loadRanking()
  }

  const totalRatings = ranking.reduce((s, a) => s + a.ratingCount, 0)

  function rankAccent(idx: number): { rail: string; label: string | null; labelClass: string } {
    if (idx === 0) {
      return {
        rail: 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 shadow-sm shadow-amber-200/50',
        label: 'Favorito',
        labelClass: 'bg-amber-100 text-amber-800 border-amber-200/80',
      }
    }
    if (idx === 1) {
      return {
        rail: 'bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500',
        label: 'Muy valorado',
        labelClass: 'bg-slate-100 text-slate-700 border-slate-200/80',
      }
    }
    if (idx === 2) {
      return {
        rail: 'bg-gradient-to-b from-orange-300 via-orange-400 to-orange-500',
        label: 'Destacado',
        labelClass: 'bg-orange-50 text-orange-900 border-orange-200/80',
      }
    }
    return {
      rail: 'bg-stone-200/90',
      label: null,
      labelClass: '',
    }
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-wedding-sand">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-serif text-wedding-dark tracking-wide">
                Ranking de Panoramas
              </h1>
              <p className="font-sans text-wedding-dark/60 mt-1 text-sm">
                Los panoramas mejor calificados por los invitados
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="px-5 py-2.5 bg-wedding-coral text-white rounded-xl font-sans font-semibold text-sm hover:bg-wedding-coral/90 transition-all shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Añadir Panorama
            </button>
          </div>
        </motion.div>

        {/* Summary stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4 mb-8"
        >
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/[0.04] flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-wedding-coral/10 flex items-center justify-center text-lg" aria-hidden>
              🗺️
            </div>
            <div className="text-left min-w-0">
              <p className="text-2xl font-sans font-bold text-wedding-dark tabular-nums leading-none">{ranking.length}</p>
              <p className="text-xs font-sans text-wedding-dark/50 mt-1 font-medium tracking-wide">Panoramas en la lista</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/[0.04] flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-wedding-gold/15 flex items-center justify-center text-lg" aria-hidden>
              ⭐
            </div>
            <div className="text-left min-w-0">
              <p className="text-2xl font-sans font-bold text-wedding-dark tabular-nums leading-none">{totalRatings}</p>
              <p className="text-xs font-sans text-wedding-dark/50 mt-1 font-medium tracking-wide">Calificaciones</p>
            </div>
          </div>
        </motion.div>

        {/* Ranking list — podio visual, sin badges numéricos grandes */}
        <div className="space-y-4">
          {ranking.map((attr, i) => {
            const { rail, label, labelClass } = rankAccent(i)
            const barWidth = attr.avgRating > 0 ? (attr.avgRating / 5) * 100 : 0

            return (
            <motion.div
              key={attr.id}
              className={`bg-white rounded-2xl shadow-sm border border-black/[0.04] group hover:shadow-md hover:border-wedding-coral/15 transition-all overflow-hidden flex ${
                i === 0 ? 'ring-1 ring-amber-200/60 bg-gradient-to-r from-amber-50/40 via-white to-white' : ''
              }`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.35) }}
            >
              <div className={`w-1.5 sm:w-2 flex-shrink-0 ${rail}`} aria-hidden />

              <div className="flex-1 min-w-0 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {label && (
                        <span className={`text-[10px] font-sans font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border ${labelClass}`}>
                          {label}
                        </span>
                      )}
                      {attr.activity_level && (
                        <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-wedding-dark/40 bg-wedding-sand/80 px-2 py-0.5 rounded-full">
                          {attr.activity_level === 'low' ? 'Relajado' : attr.activity_level === 'high' ? 'Activo' : 'Moderado'}
                        </span>
                      )}
                    </div>
                    <p className="font-sans font-semibold text-wedding-dark text-base sm:text-lg leading-snug tracking-tight pr-2">
                      {attr.name}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-1 sm:text-right flex-shrink-0">
                    <p className="text-xl font-sans font-bold text-amber-500 tabular-nums leading-none">
                      {attr.avgRating > 0 ? attr.avgRating.toFixed(1) : '—'}★
                    </p>
                    <p className="text-[11px] font-sans text-wedding-dark/45 font-medium">
                      {attr.ratingCount === 1 ? '1 persona' : `${attr.ratingCount} personas`}
                    </p>
                  </div>
                </div>

                {/* Barra de intensidad relativa (respecto al más votado) */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] font-sans font-semibold uppercase tracking-wider text-wedding-dark/35 mb-1.5">
                    <span>Calificación promedio</span>
                    <span className="tabular-nums">{attr.avgRating > 0 ? `${attr.avgRating.toFixed(1)}/5` : 'Sin datos'}</span>
                  </div>
                  <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden ring-1 ring-inset ring-black/[0.04]">
                    <motion.div
                      className={`h-full rounded-full ${
                        i === 0
                          ? 'bg-gradient-to-r from-amber-500 via-wedding-coral to-wedding-gold'
                          : 'bg-gradient-to-r from-wedding-coral to-wedding-gold'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 }}
                    />
                  </div>
                </div>

                {/* Meta + acciones */}
                <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-wedding-sand/80">
                  <div className="flex items-center gap-2 text-xs font-sans text-wedding-dark/45 min-w-0 truncate">
                    {attr.suggested_date && (
                      <span className="truncate">
                        Ideal {attr.suggested_date}
                        {attr.suggested_time ? ` · ${attr.suggested_time}` : ''}
                      </span>
                    )}
                    {attr.admin_notes && (
                      <span className="italic text-wedding-dark/35 truncate max-w-[220px] hidden sm:inline" title={attr.admin_notes}>
                        · {attr.admin_notes}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => openEditModal(attr)}
                      className="px-3 py-1.5 text-xs font-sans font-semibold text-wedding-gold hover:bg-wedding-gold/10 rounded-lg transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAttraction(attr.id)}
                      disabled={deleting === attr.id}
                      className="px-3 py-1.5 text-xs font-sans font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deleting === attr.id ? '…' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
            )
          })}
        </div>

        {ranking.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white rounded-2xl shadow-sm"
          >
            <svg className="w-16 h-16 mx-auto mb-4 text-wedding-coral/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            <p className="text-wedding-dark/50 font-serif text-lg mb-3">No hay panoramas todavía</p>
            <button onClick={openCreateModal} className="font-sans text-wedding-coral hover:underline text-sm">
              Crear el primero
            </button>
          </motion.div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
            />

            {/* Modal content */}
            <motion.div
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-serif text-wedding-dark">
                    {editingId ? 'Editar Panorama' : 'Nuevo Panorama'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-wedding-sand transition-colors text-wedding-dark/50"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-sans font-semibold text-wedding-dark/60 mb-1">
                      Nombre *
                    </label>
                    <input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral/50 text-sm font-sans"
                      placeholder="Ej: Tour por el centro histórico"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-sans font-semibold text-wedding-dark/60 mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral/50 text-sm font-sans resize-none"
                      placeholder="Describe la actividad..."
                    />
                  </div>

                  {/* Admin notes */}
                  <div>
                    <label className="block text-xs font-sans font-semibold text-wedding-dark/60 mb-1">
                      Notas de los novios
                    </label>
                    <textarea
                      value={form.admin_notes}
                      onChange={e => setForm(f => ({ ...f, admin_notes: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral/50 text-sm font-sans resize-none"
                      placeholder="Ej: Aca fue donde comimos, es entretenido porque..."
                    />
                    <p className="text-xs font-sans text-wedding-dark/40 mt-1">
                      Estas notas son visibles para los invitados como recomendación
                    </p>
                  </div>

                  {/* Activity level + Duration */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-sans font-semibold text-wedding-dark/60 mb-1">
                        Nivel de actividad
                      </label>
                      <select
                        value={form.activity_level}
                        onChange={e => setForm(f => ({ ...f, activity_level: e.target.value }))}
                        className="w-full px-3 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral/50 text-sm font-sans bg-white"
                      >
                        {ACTIVITY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-sans font-semibold text-wedding-dark/60 mb-1">
                        Duración (horas) (opcional)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={form.duration_hours}
                        onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))}
                        className="w-full px-3 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral/50 text-sm font-sans"
                        placeholder="Ej: 2.5"
                      />
                    </div>
                  </div>

                  {/* Photos upload */}
                  <div>
                    <label className="block text-xs font-sans font-semibold text-wedding-dark/60 mb-1">
                      Fotos
                    </label>

                    {/* Photo previews */}
                    {photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {photos.map((url, idx) => (
                          <div key={idx} className="relative group rounded-xl overflow-hidden border-2 border-wedding-sand aspect-square">
                            <img
                              src={url}
                              alt={`Foto ${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f5f0eb" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23999" font-size="12">Error</text></svg>' }}
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(url)}
                              className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Quitar foto"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            {idx === 0 && (
                              <span className="absolute bottom-1.5 left-1.5 text-[9px] font-sans font-bold bg-wedding-coral text-white px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                                Principal
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload area */}
                    <label
                      className={`flex flex-col items-center justify-center w-full py-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                        uploading
                          ? 'border-wedding-coral/40 bg-wedding-coral/5'
                          : 'border-wedding-sand hover:border-wedding-coral/40 hover:bg-wedding-coral/5'
                      }`}
                    >
                      {uploading ? (
                        <div className="flex items-center gap-2 text-wedding-coral">
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="text-sm font-sans font-medium">Subiendo...</span>
                        </div>
                      ) : (
                        <>
                          <svg className="w-8 h-8 text-wedding-dark/25 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                          </svg>
                          <span className="text-sm font-sans font-medium text-wedding-dark/50">
                            Haz clic para subir fotos
                          </span>
                          <span className="text-xs font-sans text-wedding-dark/30 mt-0.5">
                            JPG, PNG, WebP · Máx 5MB cada una
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={uploading}
                        onChange={e => {
                          if (e.target.files && e.target.files.length > 0) {
                            uploadPhotos(e.target.files)
                            e.target.value = ''
                          }
                        }}
                      />
                    </label>
                    {photos.length > 0 && (
                      <p className="text-xs font-sans text-wedding-dark/40 mt-1.5">
                        {photos.length} foto{photos.length > 1 ? 's' : ''} · La primera se usa como portada
                      </p>
                    )}
                  </div>

                  {/* Prices */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-sans font-semibold text-wedding-dark/60 mb-1">
                        Precio COP
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.price_cop}
                        onChange={e => setForm(f => ({ ...f, price_cop: e.target.value }))}
                        className="w-full px-3 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral/50 text-sm font-sans"
                        placeholder="Ej: 50000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-sans font-semibold text-wedding-dark/60 mb-1">
                        Precio CLP
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.price_clp}
                        onChange={e => setForm(f => ({ ...f, price_clp: e.target.value }))}
                        className="w-full px-3 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral/50 text-sm font-sans"
                        placeholder="Ej: 12000"
                      />
                    </div>
                  </div>

                  {/* Date and time suggestion */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-sans font-semibold text-wedding-dark/60 mb-1">
                        Fecha sugerida (opcional)
                      </label>
                      <input
                        type="date"
                        value={form.suggested_date}
                        onChange={e => setForm(f => ({ ...f, suggested_date: e.target.value }))}
                        className="w-full px-3 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral/50 text-sm font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-sans font-semibold text-wedding-dark/60 mb-1">
                        Hora sugerida (opcional)
                      </label>
                      <input
                        type="time"
                        value={form.suggested_time}
                        onChange={e => setForm(f => ({ ...f, suggested_time: e.target.value }))}
                        className="w-full px-3 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral/50 text-sm font-sans"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-4 border-t border-wedding-sand">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 border-2 border-wedding-sand rounded-xl text-sm font-sans font-medium text-wedding-dark/60 hover:bg-wedding-sand transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveForm}
                    disabled={saving}
                    className="flex-1 py-2.5 bg-wedding-coral text-white rounded-xl text-sm font-sans font-semibold hover:bg-wedding-coral/90 transition-all disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear panorama'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
