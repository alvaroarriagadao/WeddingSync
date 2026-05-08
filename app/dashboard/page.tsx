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

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div className="text-wedding-dark/50">Cargando...</div></div>

  const cards = [
    { title: 'Calendario', path: '/dashboard/calendar', icon: '📅', desc: 'Gestiona el itinerario semanal', color: 'from-yellow-400 to-orange-400', stat: `${stats.events} eventos` },
    { title: 'Vuelos', path: '/dashboard/flights', icon: '✈️', desc: 'Dashboard de llegadas y salidas', color: 'from-sky-400 to-blue-500', stat: `${stats.flights} registrados` },
    { title: 'Panoramas', path: '/dashboard/panoramas', icon: '🗺️', desc: 'Ranking de actividades votadas', color: 'from-teal-400 to-emerald-500', stat: 'Ver ranking' },
    { title: 'Playlist', path: '/dashboard/playlist', icon: '🎵', desc: 'Gestiona las canciones de la fiesta', color: 'from-purple-400 to-pink-500', stat: `${stats.songs} canciones` },
  ]

  return (
    <main className="min-h-screen bg-wedding-sand">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-10">
          <p className="text-wedding-coral font-medium mb-1">Panel de Novios ✨</p>
          <h1 className="text-4xl sm:text-5xl font-serif text-wedding-dark">
            Hola, {user.name} 💍
          </h1>
          <p className="text-wedding-dark/60 mt-2">Tienes {stats.guests} invitados registrados en la app.</p>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        >
          {[
            { label: 'Invitados', value: stats.guests, icon: '👥' },
            { label: 'Eventos', value: stats.events, icon: '📅' },
            { label: 'Vuelos', value: stats.flights, icon: '✈️' },
            { label: 'Canciones', value: stats.songs, icon: '🎵' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              className="bg-white rounded-2xl p-5 text-center shadow-sm"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 * i }}
            >
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-3xl font-serif font-bold text-wedding-dark">{s.value}</div>
              <div className="text-sm text-wedding-dark/50">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Module cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={card.path}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <Link href={card.path} className="group block bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${card.color}`} />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">{card.icon}</div>
                    <span className="text-xs px-3 py-1 bg-wedding-sand rounded-full text-wedding-dark/60">{card.stat}</span>
                  </div>
                  <h2 className="text-xl font-serif text-wedding-dark mb-1">{card.title}</h2>
                  <p className="text-wedding-dark/60 text-sm">{card.desc}</p>
                  <div className="mt-4 text-wedding-coral text-sm font-medium group-hover:underline">
                    Abrir módulo →
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Wedding countdown */}
        <motion.div
          className="mt-10 bg-wedding-dark rounded-2xl p-6 text-center text-white"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        >
          <p className="text-white/60 text-sm mb-2">La boda es el</p>
          <p className="text-2xl font-serif">15 de Septiembre, 2025 🌴</p>
          <p className="text-white/60 text-sm mt-1">Cartagena de Indias, Colombia</p>
        </motion.div>
      </div>
    </main>
  )
}
