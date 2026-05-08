'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getStoredUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function AdminFlightsPage() {
  const [user, setUser] = useState<any>(null)
  const [arrivals, setArrivals] = useState<any[]>([])
  const [departures, setDepartures] = useState<any[]>([])
  const [allGuests, setAllGuests] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'arrivals' | 'departures' | 'missing'>('arrivals')
  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    if (!u || u.role !== 'admin') { router.push('/'); return }
    setUser(u)
    loadData()
  }, [])

  async function loadData() {
    const [{ data: flights }, { data: guests }] = await Promise.all([
      supabase.from('flights').select('*, guests(name)').order('datetime'),
      supabase.from('guests').select('id, name').eq('is_admin', false),
    ])

    if (flights) {
      setArrivals(flights.filter(f => f.flight_type === 'arrival'))
      setDepartures(flights.filter(f => f.flight_type === 'departure'))
    }
    if (guests) setAllGuests(guests)
  }

  function groupBySlot(flights: any[]) {
    const groups: Record<string, any[]> = {}
    flights.forEach(f => {
      const d = new Date(f.datetime)
      const h = d.getHours()
      const slot = Math.floor(h / 2) * 2
      const key = `${d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} ${String(slot).padStart(2, '0')}:00–${String(slot + 2).padStart(2, '0')}:00`
      if (!groups[key]) groups[key] = []
      groups[key].push(f)
    })
    return groups
  }

  function exportCSV() {
    const all = [...arrivals, ...departures]
    const rows = [['Nombre', 'Tipo', 'Vuelo', 'Origen', 'Fecha/Hora']]
    all.forEach(f => rows.push([
      f.guests?.name || '', f.flight_type === 'arrival' ? 'Llegada' : 'Salida',
      f.flight_number || '', f.origin_airport || '',
      new Date(f.datetime).toLocaleString('es-ES')
    ]))
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'vuelos-boda.csv'; a.click()
  }

  const guestsWithFlights = new Set([...arrivals, ...departures].map(f => f.guest_id))
  const missingGuests = allGuests.filter(g => !guestsWithFlights.has(g.id))

  const arrivalGroups = groupBySlot(arrivals)
  const departureGroups = groupBySlot(departures)

  if (!user) return null

  return (
    <main className="min-h-screen bg-wedding-sand">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif text-wedding-dark">✈️ Hub de Vuelos</h1>
            <p className="text-wedding-dark/60 mt-1">Grupos de llegada y salida de invitados</p>
          </div>
          <button onClick={exportCSV}
            className="px-4 py-2 bg-white border-2 border-wedding-sand rounded-xl text-sm font-medium hover:border-wedding-coral transition-colors">
            📥 Exportar CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Llegadas', value: arrivals.length, icon: '🛬' },
            { label: 'Salidas', value: departures.length, icon: '🛫' },
            { label: 'Sin registrar', value: missingGuests.length, icon: '❓' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-serif font-bold text-wedding-dark">{s.value}</div>
              <div className="text-xs text-wedding-dark/50">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['arrivals', 'departures', 'missing'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === t ? 'bg-wedding-coral text-white' : 'bg-white text-wedding-dark/60'}`}>
              {t === 'arrivals' ? '🛬 Llegadas' : t === 'departures' ? '🛫 Salidas' : '❓ Sin vuelo'}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'arrivals' && (
          <FlightGroups groups={arrivalGroups} type="arrival" />
        )}
        {activeTab === 'departures' && (
          <FlightGroups groups={departureGroups} type="departure" />
        )}
        {activeTab === 'missing' && (
          <div className="space-y-3">
            {missingGuests.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl">
                <p className="text-3xl mb-2">✅</p>
                <p className="text-wedding-dark/60">¡Todos los invitados han registrado sus vuelos!</p>
              </div>
            ) : missingGuests.map(g => (
              <div key={g.id} className="bg-white rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                  {g.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-wedding-dark">{g.name}</p>
                  <p className="text-xs text-gray-400">Sin vuelo registrado</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function FlightGroups({ groups, type }: { groups: Record<string, any[]>, type: string }) {
  if (Object.keys(groups).length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-2xl">
        <p className="text-3xl mb-2">📭</p>
        <p className="text-wedding-dark/60">No hay vuelos registrados aún</p>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([slot, flights]) => (
        <motion.div key={slot} className="bg-white rounded-2xl shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className={`px-5 py-3 ${type === 'arrival' ? 'bg-sky-50' : 'bg-orange-50'}`}>
            <p className={`font-semibold text-sm ${type === 'arrival' ? 'text-sky-700' : 'text-orange-700'}`}>
              {type === 'arrival' ? '🛬' : '🛫'} {slot}
              <span className="ml-2 text-xs font-normal opacity-70">{flights.length} {flights.length === 1 ? 'persona' : 'personas'}</span>
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {flights.map(f => (
              <div key={f.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-wedding-sand flex items-center justify-center font-bold text-wedding-dark text-sm">
                  {f.guests?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-wedding-dark text-sm">{f.guests?.name}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(f.datetime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    {f.flight_number && ` · ${f.flight_number}`}
                    {f.origin_airport && ` · desde ${f.origin_airport}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
