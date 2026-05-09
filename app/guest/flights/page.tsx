'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getStoredUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

type FlightForm = { flight_number: string; origin_airport: string; datetime: string }
const EMPTY_FORM: FlightForm = { flight_number: '', origin_airport: '', datetime: '' }

export default function GuestFlightsPage() {
  const [user, setUser] = useState<any>(null)
  const [arrival, setArrival] = useState<any>(null)
  const [departure, setDeparture] = useState<any>(null)
  const [arrivalForm, setArrivalForm] = useState<FlightForm>({ ...EMPTY_FORM })
  const [departureForm, setDepartureForm] = useState<FlightForm>({ ...EMPTY_FORM })
  const [editingArrival, setEditingArrival] = useState(false)
  const [editingDeparture, setEditingDeparture] = useState(false)
  const [companions, setCompanions] = useState<any[]>([])
  const [saving, setSaving] = useState<'arrival' | 'departure' | null>(null)
  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    if (!u) { router.push('/'); return }
    setUser(u)
    loadData(u.id)
  }, [])

  async function loadData(guestId: string) {
    const [{ data: myFlights }, { data: allFlights }] = await Promise.all([
      supabase.from('flights').select('*').eq('guest_id', guestId),
      supabase.from('flights').select('*, guests(name)').neq('guest_id', guestId),
    ])

    if (myFlights) {
      const arr = myFlights.find(f => f.flight_type === 'arrival')
      const dep = myFlights.find(f => f.flight_type === 'departure')
      setArrival(arr || null)
      setDeparture(dep || null)
      if (arr) setArrivalForm({ flight_number: arr.flight_number || '', origin_airport: arr.origin_airport || '', datetime: arr.datetime?.slice(0, 16) || '' })
      if (dep) setDepartureForm({ flight_number: dep.flight_number || '', origin_airport: dep.origin_airport || '', datetime: dep.datetime?.slice(0, 16) || '' })
    }

    if (allFlights && myFlights) {
      const myArr = myFlights.find(f => f.flight_type === 'arrival')
      if (myArr) {
        const myTime = new Date(myArr.datetime).getTime()
        const close = allFlights.filter(f => {
          if (f.flight_type !== 'arrival') return false
          const diff = Math.abs(new Date(f.datetime).getTime() - myTime)
          return diff < 2 * 3600000 // within 2 hours
        })
        setCompanions(close)
      }
    }
  }

  async function saveFlight(type: 'arrival' | 'departure') {
    const form = type === 'arrival' ? arrivalForm : departureForm
    const existing = type === 'arrival' ? arrival : departure

    if (!form.datetime) { toast.error('La fecha y hora son obligatorias'); return }
    setSaving(type)

    const payload = {
      guest_id: user.id,
      flight_type: type,
      flight_number: form.flight_number,
      origin_airport: form.origin_airport,
      datetime: form.datetime,
    }

    if (existing) {
      await supabase.from('flights').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('flights').insert([payload])
    }

    toast.success(`Vuelo de ${type === 'arrival' ? 'llegada' : 'salida'} guardado ✈️`)
    setSaving(null)
    if (type === 'arrival') setEditingArrival(false)
    else setEditingDeparture(false)
    loadData(user.id)
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-wedding-sand font-guest">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-guest-serif text-wedding-dark">✈️ Mis Vuelos</h1>
          <p className="text-wedding-dark/60 mt-1">Registra tu llegada y salida para coordinar con otros</p>
        </motion.div>

        {/* Arrival */}
        <FlightSection
          type="arrival"
          title="Vuelo de Llegada"
          icon="🛬"
          subtitle="Llegando a Cartagena (CTG)"
          existing={arrival}
          form={arrivalForm}
          setForm={setArrivalForm}
          editing={editingArrival}
          setEditing={setEditingArrival}
          saving={saving === 'arrival'}
          onSave={() => saveFlight('arrival')}
        />

        {/* Companions alert */}
        {companions.length > 0 && (
          <motion.div
            className="my-4 p-4 bg-wedding-turquoise/20 border-2 border-wedding-turquoise rounded-2xl"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm font-semibold text-teal-800 mb-2">
              🛬 ¡Llegas cerca de estos invitados!
            </p>
            {companions.map(c => (
              <div key={c.id} className="flex items-center gap-2 text-sm text-teal-700">
                <div className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold">
                  {c.guests?.name?.charAt(0)?.toUpperCase()}
                </div>
                <span className="font-medium">{c.guests?.name}</span>
                <span className="text-teal-500">·</span>
                <span>{new Date(c.datetime).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Departure */}
        <div className="mt-6">
          <FlightSection
            type="departure"
            title="Vuelo de Regreso"
            icon="🛫"
            subtitle="Saliendo desde Cartagena (CTG)"
            existing={departure}
            form={departureForm}
            setForm={setDepartureForm}
            editing={editingDeparture}
            setEditing={setEditingDeparture}
            saving={saving === 'departure'}
            onSave={() => saveFlight('departure')}
          />
        </div>

        {/* Info */}
        <motion.div className="mt-6 p-4 bg-white rounded-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <p className="text-sm text-wedding-dark/60 text-center">
            💡 Registra tu vuelo para que los novios puedan coordinar traslados y ver quiénes llegan juntos.
          </p>
        </motion.div>
      </div>
    </main>
  )
}

function FlightSection({ type, title, icon, subtitle, existing, form, setForm, editing, setEditing, saving, onSave }: any) {
  const hasData = existing && existing.datetime

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
    >
      <div className={`h-1.5 ${type === 'arrival' ? 'bg-gradient-to-r from-sky-400 to-blue-500' : 'bg-gradient-to-r from-orange-400 to-red-400'}`} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-guest-serif text-wedding-dark flex items-center gap-2">
              <span className="text-2xl">{icon}</span> {title}
            </h2>
            <p className="text-xs text-wedding-dark/50 mt-0.5">{subtitle}</p>
          </div>
          {hasData && !editing && (
            <button onClick={() => setEditing(true)}
              className="text-xs px-3 py-1.5 border border-wedding-sand rounded-lg text-wedding-dark/60 hover:border-wedding-coral hover:text-wedding-coral transition-colors">
              Editar
            </button>
          )}
        </div>

        {hasData && !editing ? (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3 p-3 bg-wedding-sand rounded-xl">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-wedding-dark">
                  {new Date(existing.datetime).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </p>
                {existing.flight_number && <p className="text-wedding-dark/60">Vuelo {existing.flight_number}</p>}
                {existing.origin_airport && <p className="text-wedding-dark/60">Desde {existing.origin_airport}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-wedding-dark/60 mb-1">
                {type === 'arrival' ? 'Fecha y hora de llegada *' : 'Fecha y hora de salida *'}
              </label>
              <input type="datetime-local"
                value={form.datetime}
                onChange={e => setForm((f: FlightForm) => ({ ...f, datetime: e.target.value }))}
                min="2026-09-11T00:00" max="2026-09-19T23:59"
                className="w-full px-4 py-2.5 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-wedding-dark/60 mb-1">Número de vuelo</label>
                <input value={form.flight_number}
                  onChange={e => setForm((f: FlightForm) => ({ ...f, flight_number: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral text-sm"
                  placeholder="LA504" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-wedding-dark/60 mb-1">Ciudad origen</label>
                <input value={form.origin_airport}
                  onChange={e => setForm((f: FlightForm) => ({ ...f, origin_airport: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral text-sm"
                  placeholder="Santiago (SCL)" />
              </div>
            </div>
            <div className="flex gap-2">
              {editing && (
                <button onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 border-2 border-wedding-sand rounded-xl text-sm font-medium text-wedding-dark/60 hover:bg-wedding-sand transition-colors">
                  Cancelar
                </button>
              )}
              <button onClick={onSave} disabled={saving}
                className={`py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 ${editing ? 'flex-1' : 'w-full'} ${type === 'arrival' ? 'bg-sky-500 hover:bg-sky-600' : 'bg-orange-500 hover:bg-orange-600'}`}>
                {saving ? 'Guardando...' : `Guardar ${type === 'arrival' ? 'llegada' : 'salida'}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
