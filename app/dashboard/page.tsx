'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getStoredUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({ guests: 0, events: 0, flights: 0, songs: 0 })
  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    if (!u || u.role !== 'admin') { router.push('/'); return }
    setUser(u)
    loadStats()
  }, [])

  async function loadStats() {
    const [{ count: guests }, { count: events }, { count: flights }, { count: songs }] = await Promise.all([
      supabase.from('guests').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('flights').select('*', { count: 'exact', head: true }),
      supabase.from('playlist').select('*', { count: 'exact', head: true }),
    ])
    setStats({ guests: guests || 0, events: events || 0, flights: flights || 0, songs: songs || 0 })
  }

  if (!user) return (
    <div className="min-h-screen bg-wedding-sand flex items-center justify-center">
      <div className="text-wedding-dark/40 font-sans text-sm tracking-wide">Cargando...</div>
    </div>
  )

  const cards = [
    { title: 'Calendario', path: '/dashboard/calendar', icon: '📅', desc: 'Gestiona el itinerario semanal', color: 'from-yellow-400 to-orange-400', stat: `${stats.events} eventos` },
    { title: 'Vuelos', path: '/dashboard/flights', icon: '✈️', desc: 'Dashboard de llegadas y salidas', color: 'from-sky-400 to-blue-500', stat: `${stats.flights} registrados` },
    { title: 'Panoramas', path: '/dashboard/panoramas', icon: '🗺️', desc: 'Ranking de actividades votadas', color: 'from-teal-400 to-emerald-500', stat: 'Ver ranking' },
    { title: 'Playlist', path: '/dashboard/playlist', icon: '🎵', desc: 'Gestiona las canciones de la fiesta', color: 'from-purple-400 to-pink-500', stat: `${stats.songs} canciones` },
    { title: 'Invitados', path: '/dashboard/guests', icon: '👥', desc: 'Gestiona la lista de invitados', color: 'from-rose-400 to-red-400', stat: `${stats.guests} registrados` },
  ]

  const statItems = [
    { label: 'Invitados', value: stats.guests, icon: '👥' },
    { label: 'Eventos', value: stats.events, icon: '📅' },
    { label: 'Vuelos', value: stats.flights, icon: '✈️' },
    { label: 'Canciones', value: stats.songs, icon: '🎵' },
  ]

  return (
    <main className="min-h-screen bg-wedding-sand">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8 sm:py-12">

        {/* Header */}
        <motion.div
          className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2018] rounded-2xl p-7 sm:p-9 text-white mb-7 relative overflow-hidden"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-bl from-wedding-gold/10 to-transparent rounded-bl-full" />
          <div className="relative z-10">
            <p className="text-wedding-gold/80 font-sans text-xs tracking-[0.2em] uppercase mb-2">
              Panel de Novios
            </p>
            <h1 className="text-3xl sm:text-4xl font-serif leading-tight text-white tracking-wide mb-2">
              Hola, {user.name}
            </h1>
            <p className="text-white/50 font-sans text-sm leading-snug">
              Tienes {stats.guests} invitados registrados en la app
            </p>
          </div>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-7"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {statItems.map((s, i) => (
            <motion.div
              key={s.label}
              className="bg-white rounded-xl p-4 text-center shadow-sm border border-black/[0.04]"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 * i }}
            >
              <div className="text-xl mb-1.5">{s.icon}</div>
              <div className="text-2xl font-serif font-bold text-wedding-dark leading-none">{s.value}</div>
              <div className="text-[11px] font-sans text-wedding-dark/40 uppercase tracking-wider mt-1">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Module cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {cards.map((card, i) => (
            <motion.div
              key={card.path}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 + i * 0.07 }}
            >
              <Link
                href={card.path}
                className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-black/[0.04]"
              >
                <div className={`h-1 bg-gradient-to-r ${card.color}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-2xl">{card.icon}</div>
                    <span className="text-[11px] font-sans px-2.5 py-1 bg-wedding-sand/80 rounded-full text-wedding-dark/50">
                      {card.stat}
                    </span>
                  </div>
                  <h2 className="text-base font-serif text-wedding-dark leading-tight tracking-wide mb-1">
                    {card.title}
                  </h2>
                  <p className="text-wedding-dark/50 font-sans text-sm leading-snug">
                    {card.desc}
                  </p>
                  <div className="mt-3 text-wedding-coral font-sans text-xs font-medium tracking-wide group-hover:translate-x-1 transition-transform duration-200">
                    Abrir módulo &rarr;
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.div
          className="mt-9 bg-gradient-to-br from-[#1a1a1a] to-[#2a2018] rounded-xl py-6 px-5 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="w-8 h-px bg-wedding-gold/30 mx-auto mb-3" />
          <p className="font-serif text-white/80 text-base leading-tight tracking-wide">
            15 de Septiembre, 2026
          </p>
          <p className="font-sans text-white/30 text-xs tracking-[0.15em] uppercase mt-1">
            Cartagena de Indias
          </p>
        </motion.div>
      </div>
    </main>
  )
}
