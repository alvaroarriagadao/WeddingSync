'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getStoredUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AdminGuestsPage() {
  const [user, setUser] = useState<any>(null)
  const [guests, setGuests] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    if (!u || u.role !== 'admin') { router.push('/'); return }
    setUser(u)
    loadGuests()
  }, [])

  async function loadGuests() {
    const { data } = await supabase
      .from('guests')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setGuests(data)
  }

  async function deleteGuest(id: string, name: string) {
    if (!confirm(`¿Eliminar a "${name}" de la lista?`)) return
    // Delete related records first
    await Promise.all([
      supabase.from('event_confirmations').delete().eq('guest_id', id),
      supabase.from('attraction_votes').delete().eq('guest_id', id),
      supabase.from('flights').delete().eq('guest_id', id),
      supabase.from('playlist').delete().eq('guest_id', id),
    ])
    await supabase.from('guests').delete().eq('id', id)
    toast.success(`${name} eliminado`)
    loadGuests()
  }

  const filtered = guests.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.phone && g.phone.includes(search))
  )

  const guestCount = guests.filter(g => !g.is_admin).length
  const adminCount = guests.filter(g => g.is_admin).length

  if (!user) return null

  return (
    <main className="min-h-screen bg-wedding-sand">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-serif text-wedding-dark tracking-wide">Invitados Registrados</h1>
          <p className="text-wedding-dark/50 mt-1 text-sm">{guestCount} invitados · {adminCount} novios</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-serif font-semibold text-wedding-dark">{guests.length}</div>
            <div className="text-xs text-wedding-dark/40 mt-0.5">Total</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-serif font-semibold text-wedding-coral">{guestCount}</div>
            <div className="text-xs text-wedding-dark/40 mt-0.5">Invitados</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-serif font-semibold text-wedding-gold">{adminCount}</div>
            <div className="text-xs text-wedding-dark/40 mt-0.5">Novios</div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-5">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full px-4 py-3 bg-white border border-wedding-sand rounded-xl text-sm focus:outline-none focus:border-wedding-gold transition-colors shadow-sm"
          />
        </div>

        {/* Info box */}
        <div className="bg-wedding-gold/10 border border-wedding-gold/20 rounded-xl p-4 mb-5">
          <p className="text-sm text-wedding-dark/70">
            <span className="font-semibold">Cómo funciona:</span> Los invitados se registran con su nombre, teléfono y el código <span className="font-mono bg-white px-1.5 py-0.5 rounded text-xs">BODA2025</span>. El teléfono es su identificador único — no pueden registrarse dos veces con el mismo número.
          </p>
        </div>

        {/* Guest list */}
        <div className="space-y-2">
          {filtered.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="bg-white rounded-xl p-4 flex items-center gap-4 group shadow-sm hover:shadow-md transition-all"
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                g.is_admin ? 'bg-wedding-gold' : 'bg-wedding-coral'
              }`}>
                {g.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-wedding-dark text-sm truncate">{g.name}</p>
                  {g.is_admin && (
                    <span className="text-[10px] px-2 py-0.5 bg-wedding-gold/15 text-wedding-gold rounded-full font-semibold tracking-wide">
                      NOVIO/A
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-wedding-dark/40 mt-0.5">
                  {g.phone && <span>📱 {g.phone}</span>}
                  <span>
                    {new Date(g.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Delete */}
              {!g.is_admin && (
                <button
                  onClick={() => deleteGuest(g.id, g.name)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 text-xs px-2 py-1.5 rounded-lg hover:bg-red-50"
                >
                  Eliminar
                </button>
              )}
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-wedding-dark/40 text-sm">
              {search ? 'No se encontraron invitados' : 'Aún no hay invitados registrados'}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
