'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getStoredUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

type FlightWithGuest = {
  id: string
  guest_id: string
  flight_type: string
  flight_number: string | null
  origin_airport: string | null
  datetime: string
  guests: { name: string } | null
}

function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

function getDateKey(dt: string) {
  return new Date(dt).toISOString().split('T')[0]
}

// Check if two flights are within N minutes
function areClose(a: string, b: string, minutesThreshold = 120) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) < minutesThreshold * 60000
}

export default function AdminFlightsPage() {
  const [user, setUser] = useState<any>(null)
  const [arrivals, setArrivals] = useState<FlightWithGuest[]>([])
  const [departures, setDepartures] = useState<FlightWithGuest[]>([])
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
      setArrivals(flights.filter((f: any) => f.flight_type === 'arrival'))
      setDepartures(flights.filter((f: any) => f.flight_type === 'departure'))
    }
    if (guests) setAllGuests(guests)
  }

  // Group flights by date, then sort by time within each date
  function groupByDate(flights: FlightWithGuest[]) {
    const groups: Record<string, FlightWithGuest[]> = {}
    flights.forEach(f => {
      const key = getDateKey(f.datetime)
      if (!groups[key]) groups[key] = []
      groups[key].push(f)
    })
    // Sort by time within each group
    Object.values(groups).forEach(arr => arr.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()))
    return groups
  }

  // Find proximity clusters within a day
  function findClusters(flights: FlightWithGuest[]): FlightWithGuest[][] {
    if (flights.length === 0) return []
    const sorted = [...flights].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
    const clusters: FlightWithGuest[][] = [[sorted[0]]]

    for (let i = 1; i < sorted.length; i++) {
      const lastCluster = clusters[clusters.length - 1]
      const lastFlight = lastCluster[lastCluster.length - 1]
      if (areClose(lastFlight.datetime, sorted[i].datetime, 120)) {
        lastCluster.push(sorted[i])
      } else {
        clusters.push([sorted[i]])
      }
    }
    return clusters
  }

  function exportCSV() {
    const all = [...arrivals, ...departures]
    const rows = [['Nombre', 'Tipo', 'Vuelo', 'Origen', 'Fecha/Hora']]
    all.forEach(f => rows.push([
      f.guests?.name || '', f.flight_type === 'arrival' ? 'Llegada' : 'Salida',
      f.flight_number || '', f.origin_airport || '',
      new Date(f.datetime).toLocaleString('es-CL')
    ]))
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'vuelos-boda.csv'; a.click()
  }

  const guestsWithFlights = new Set([...arrivals, ...departures].map(f => f.guest_id))
  const missingGuests = allGuests.filter(g => !guestsWithFlights.has(g.id))

  const arrivalsByDate = groupByDate(arrivals)
  const departuresByDate = groupByDate(departures)

  if (!user) return null

  return (
    <main className="min-h-screen bg-wedding-sand">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif text-wedding-dark">✈️ Hub de Vuelos</h1>
            <p className="text-wedding-dark/60 mt-1 font-sans text-sm">Visualiza quién viaja en fechas y horarios cercanos</p>
          </div>
          <button onClick={exportCSV}
            className="px-4 py-2 bg-white border-2 border-wedding-sand rounded-xl text-sm font-sans font-medium hover:border-wedding-coral transition-colors">
            📥 Exportar CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Llegadas', value: arrivals.length, icon: '🛬', color: 'text-sky-600' },
            { label: 'Salidas', value: departures.length, icon: '🛫', color: 'text-orange-600' },
            { label: 'Sin registrar', value: missingGuests.length, icon: '❓', color: 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`text-2xl font-serif font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs font-sans text-wedding-dark/50">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['arrivals', 'departures', 'missing'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-sans font-medium transition-colors ${activeTab === t ? 'bg-wedding-coral text-white shadow-sm' : 'bg-white text-wedding-dark/60 hover:bg-white/80'}`}>
              {t === 'arrivals' ? '🛬 Llegadas' : t === 'departures' ? '🛫 Salidas' : '❓ Sin vuelo'}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'arrivals' && (
          <DateGroupedFlights groups={arrivalsByDate} type="arrival" findClusters={findClusters} />
        )}
        {activeTab === 'departures' && (
          <DateGroupedFlights groups={departuresByDate} type="departure" findClusters={findClusters} />
        )}
        {activeTab === 'missing' && (
          <div className="space-y-3">
            {missingGuests.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl shadow-sm">
                <p className="text-3xl mb-2">✅</p>
                <p className="text-wedding-dark/60 font-sans">¡Todos los invitados han registrado sus vuelos!</p>
              </div>
            ) : missingGuests.map((g: any) => (
              <div key={g.id} className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-400 font-serif font-bold">
                  {g.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-sans font-medium text-wedding-dark">{g.name}</p>
                  <p className="text-xs font-sans text-red-400">Sin vuelo registrado</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function DateGroupedFlights({ groups, type, findClusters }: {
  groups: Record<string, FlightWithGuest[]>, type: string,
  findClusters: (flights: FlightWithGuest[]) => FlightWithGuest[][]
}) {
  const sortedDates = Object.keys(groups).sort()

  if (sortedDates.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-2xl shadow-sm">
        <p className="text-3xl mb-2">📭</p>
        <p className="text-wedding-dark/60 font-sans">No hay vuelos registrados aún</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {sortedDates.map(dateKey => {
        const flights = groups[dateKey]
        const clusters = findClusters(flights)
        const dateLabel = new Date(dateKey + 'T12:00:00').toLocaleDateString('es-CL', {
          weekday: 'long', day: 'numeric', month: 'long'
        })

        return (
          <motion.div key={dateKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Date header */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`px-3 py-1.5 rounded-lg text-xs font-sans font-semibold uppercase tracking-wider ${
                type === 'arrival' ? 'bg-sky-100 text-sky-700' : 'bg-orange-100 text-orange-700'
              }`}>
                📅 {dateLabel}
              </div>
              <div className="h-px flex-1 bg-wedding-sand" />
              <span className="text-xs font-sans text-wedding-dark/40">
                {flights.length} {flights.length === 1 ? 'persona' : 'personas'}
              </span>
            </div>

            {/* Clusters within this date */}
            <div className="space-y-3">
              {clusters.map((cluster, ci) => (
                <div key={ci} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Cluster header - show time range */}
                  <div className={`px-5 py-3 flex items-center justify-between ${
                    type === 'arrival' ? 'bg-sky-50/80' : 'bg-orange-50/80'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{type === 'arrival' ? '🛬' : '🛫'}</span>
                      <span className={`font-sans font-semibold text-sm ${
                        type === 'arrival' ? 'text-sky-700' : 'text-orange-700'
                      }`}>
                        {formatTime(cluster[0].datetime)}
                        {cluster.length > 1 && ` – ${formatTime(cluster[cluster.length - 1].datetime)}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {cluster.length > 1 && (
                        <span className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded-full ${
                          type === 'arrival'
                            ? 'bg-sky-200 text-sky-800'
                            : 'bg-orange-200 text-orange-800'
                        }`}>
                          {cluster.length} juntos
                        </span>
                      )}
                    </div>
                  </div>

                  {/* People in this cluster */}
                  <div className="divide-y divide-wedding-sand/50">
                    {cluster.map((f, fi) => {
                      // Check if this person is very close to someone else
                      const hasNearby = cluster.some((other, oi) =>
                        oi !== fi && areClose(f.datetime, other.datetime, 60)
                      )

                      return (
                        <div key={f.id} className="px-5 py-3 flex items-center gap-3 group hover:bg-wedding-sand/30 transition-colors">
                          {/* Avatar */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-serif font-bold text-sm flex-shrink-0 ${
                            type === 'arrival'
                              ? 'bg-sky-100 text-sky-600'
                              : 'bg-orange-100 text-orange-600'
                          }`}>
                            {f.guests?.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-sans font-semibold text-wedding-dark text-sm truncate">
                              {f.guests?.name || 'Sin nombre'}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs font-sans text-wedding-dark/50">
                              <span className="font-medium">{formatTime(f.datetime)}</span>
                              {f.flight_number && (
                                <>
                                  <span>·</span>
                                  <span>{f.flight_number}</span>
                                </>
                              )}
                              {f.origin_airport && (
                                <>
                                  <span>·</span>
                                  <span>desde {f.origin_airport}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Proximity badge */}
                          {hasNearby && (
                            <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">
                              ≈ horario similar
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Cluster summary for groups > 1 */}
                  {cluster.length > 1 && (
                    <div className={`px-5 py-2 text-[11px] font-sans ${
                      type === 'arrival' ? 'bg-sky-50/50 text-sky-600' : 'bg-orange-50/50 text-orange-600'
                    }`}>
                      💡 {cluster.length} personas {type === 'arrival' ? 'llegan' : 'salen'} en horarios cercanos — posible traslado compartido
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
