'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getStoredUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const WEDDING_DATE = new Date('2025-09-15T18:00:00')

function useDaysLeft() {
  const diff = WEDDING_DATE.getTime() - Date.now()
  return Math.max(0, Math.floor(diff / 86400000))
}

export default function GuestOverviewPage() {
  const [user, setUser] = useState<any>(null)
  const [myEvents, setMyEvents] = useState(0)
  const [myFlight, setMyFlight] = useState<any>(null)
  const [myVotes, setMyVotes] = useState(0)
  const daysLeft = useDaysLeft()
  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    if (!u) { router.push('/'); return }
    setUser(u)
    loadMyData(u.id)
  }, [])

  async function loadMyData(guestId: string) {
    const [{ count: evts }, { data: flight }, { count: votes }] = await Promise.all([
      supabase.from('event_confirmations').select('*', { count: 'exact', head: true }).eq('guest_id', guestId),
      supabase.from('flights').select('*').eq('guest_id', guestId).eq('flight_type', 'arrival').maybeSingle(),
      supabase.from('attraction_votes').select('*', { count: 'exact', head: true }).eq('guest_id', guestId),
    ])
    setMyEvents(evts || 0)
    setMyFlight(flight)
    setMyVotes(votes || 0)
  }

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div className="text-wedding-dark/50">Cargando...</div></div>

  const cards = [
    { title: 'Calendario', path: '/guest/calendar', icon: '📅', desc: 'Ver el itinerario de la semana', stat: `${myEvents} eventos confirmados`, color: 'from-yellow-400 to-orange-400' },
    { title: 'Mis Vuelos', path: '/guest/flights', icon: '✈️', desc: 'Registra y coordina tu vuelo', stat: myFlight ? `Llego el ${new Date(myFlight.datetime).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}` : 'Sin registrar', color: 'from-sky-400 to-blue-500' },
    { title: 'Panoramas', path: '/guest/panoramas', icon: '🗺️', desc: 'Vota actividades en Cartagena', stat: `${myVotes} votos dados`, color: 'from-teal-400 to-emerald-500' },
    { title: 'Playlist', path: '/guest/playlist', icon: '🎵', desc: 'Añade canciones a la fiesta', stat: 'Ver la lista', color: 'from-purple-400 to-pink-500' },
  ]

  return (
    <main className="min-h-screen bg-wedding-sand">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero personal */}
        <motion.div
          className="bg-gradient-to-br from-wedding-dark to-[#203A43] rounded-3xl p-8 text-white mb-8 relative overflow-hidden"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="absolute top-4 right-4 text-6xl opacity-20 select-none">🌴</div>
          <p className="text-white/60 text-sm mb-1">¡Bienvenido/a!</p>
          <h1 className="text-3xl sm:text-4xl font-serif mb-3">{user.name} 🎉</h1>
          <p className="text-white/70 mb-5">
            {daysLeft > 0
              ? `Faltan ${daysLeft} días para la boda más bonita del Caribe 🌊`
              : '¡Ya estamos en modo boda! 💃🕺'}
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold">{daysLeft}</div>
              <div className="text-xs text-white/60">días</div>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold">{myEvents}</div>
              <div className="text-xs text-white/60">eventos confirmados</div>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold">{myVotes}</div>
              <div className="text-xs text-white/60">panoramas votados</div>
            </div>
          </div>
        </motion.div>

        {/* Module cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {cards.map((card, i) => (
            <motion.div
              key={card.path}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.1 }}
            >
              <Link href={card.path} className="group block bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all overflow-hidden">
                <div className={`h-1.5 bg-gradient-to-r ${card.color}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">{card.icon}</div>
                    <span className="text-xs px-2.5 py-1 bg-wedding-sand rounded-full text-wedding-dark/60 max-w-[140px] text-right leading-tight">{card.stat}</span>
                  </div>
                  <h2 className="text-lg font-serif text-wedding-dark mb-1">{card.title}</h2>
                  <p className="text-wedding-dark/60 text-sm">{card.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Wedding info */}
        <motion.div
          className="mt-8 p-5 bg-white rounded-2xl text-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        >
          <p className="text-2xl mb-2">🌺</p>
          <p className="text-wedding-dark font-serif text-lg">Camila & Martín</p>
          <p className="text-wedding-dark/60 text-sm">15 de Septiembre, 2025 · Cartagena de Indias 🇨🇴</p>
        </motion.div>
      </div>
    </main>
  )
}
