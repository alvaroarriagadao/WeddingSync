'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getStoredUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const WEDDING_DATE = new Date('2026-09-15T18:00:00')

function useDaysLeft() {
  const diff = WEDDING_DATE.getTime() - Date.now()
  return Math.max(0, Math.floor(diff / 86400000))
}

function GuestHomeBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-wedding-sand" />
      <div
        className="absolute -inset-[12%] opacity-[0.11]"
        style={{
          backgroundImage: 'url(/imagen3.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          filter: 'blur(32px)',
          transform: 'scale(1.05)',
        }}
      />
      <div
        className="absolute -inset-[15%] opacity-[0.07]"
        style={{
          backgroundImage: 'url(/imagen2.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 75%',
          filter: 'blur(42px)',
          mixBlendMode: 'multiply',
          transform: 'scale(1.08)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-wedding-sand/97 via-wedding-sand/94 to-[#ebe4d9]/98" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_50%_at_50%_-10%,rgba(126,200,200,0.09),transparent_60%)]" />
    </div>
  )
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

  if (!user) return (
    <div className="min-h-screen bg-wedding-sand flex items-center justify-center relative overflow-hidden">
      <GuestHomeBackdrop />
      <div className="relative z-10 text-wedding-dark/45 font-guest text-sm tracking-wide font-medium">Cargando…</div>
    </div>
  )

  const cards = [
    { title: 'Calendario', path: '/guest/calendar', icon: '📅', desc: 'Ver el itinerario de la semana', stat: `${myEvents} eventos confirmados`, color: 'from-amber-400 to-orange-500' },
    { title: 'Mis Vuelos', path: '/guest/flights', icon: '✈️', desc: 'Registra y coordina tu vuelo', stat: myFlight ? `Llego el ${new Date(myFlight.datetime).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}` : 'Sin registrar', color: 'from-sky-400 to-blue-600' },
    { title: 'Panoramas', path: '/guest/panoramas', icon: '🗺️', desc: 'Vota actividades en Cartagena', stat: `${myVotes} votos dados`, color: 'from-teal-400 to-emerald-600' },
    { title: 'Playlist', path: '/guest/playlist', icon: '🎵', desc: 'Añade canciones a la fiesta', stat: 'Ver la lista', color: 'from-fuchsia-500 to-rose-500' },
  ]

  return (
    <main className="relative min-h-screen font-guest overflow-hidden">
      <GuestHomeBackdrop />

      <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-12">

        <motion.div
          className="rounded-2xl p-7 sm:p-9 text-white mb-8 relative overflow-hidden shadow-[0_20px_50px_-15px_rgba(26,26,26,0.35)] ring-1 ring-white/10"
          initial={{ y: -18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage: 'url(/imagen3.jpeg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center 30%',
              filter: 'blur(3px)',
              transform: 'scale(1.06)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a]/95 via-[#231c18]/96 to-[#1e1814]/97" />
          <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-bl from-wedding-gold/15 to-transparent rounded-bl-full" />
          <div className="relative z-10">
            <p className="text-wedding-gold/85 font-guest text-xs tracking-[0.22em] uppercase mb-2 font-semibold">
              Bienvenido/a
            </p>
            <h1 className="text-3xl sm:text-4xl font-guest-serif font-semibold leading-tight text-white mb-2 tracking-tight">
              {user.name}
            </h1>
            <p className="text-white/65 font-guest text-sm leading-relaxed max-w-md font-medium">
              {daysLeft > 0
                ? `Faltan ${daysLeft} días para la boda en Cartagena de Indias`
                : 'Ya estamos en modo boda'}
            </p>

            <div className="flex flex-wrap gap-3 mt-7">
              {[
                { n: daysLeft, l: 'días', accent: 'text-wedding-gold' },
                { n: myEvents, l: 'eventos', accent: 'text-white' },
                { n: myVotes, l: 'votos', accent: 'text-white' },
              ].map(({ n, l, accent }) => (
                <div
                  key={l}
                  className="bg-white/[0.08] backdrop-blur-md border border-white/12 rounded-xl px-5 py-3 text-center min-w-[82px]"
                >
                  <div className={`text-2xl font-guest-serif font-bold leading-none ${accent}`}>{n}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 mt-1.5 font-guest font-semibold">
                    {l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={card.path}
              initial={{ y: 22, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.08 + i * 0.07 }}
            >
              <Link
                href={card.path}
                className="group block rounded-xl overflow-hidden bg-white/90 backdrop-blur-sm shadow-[0_4px_24px_-4px_rgba(50,42,38,0.12)] hover:shadow-[0_12px_36px_-8px_rgba(50,42,38,0.18)] transition-all duration-300 border border-white/90 ring-1 ring-stone-900/[0.04] hover:border-white"
              >
                <div className={`h-[3px] bg-gradient-to-r ${card.color}`} />
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div className="text-2xl leading-none opacity-90 group-hover:scale-105 transition-transform duration-300">
                      {card.icon}
                    </div>
                    <span className="text-[10px] font-guest font-semibold px-2.5 py-1 bg-stone-100/90 text-stone-600 rounded-full max-w-[150px] text-right leading-snug tracking-wide">
                      {card.stat}
                    </span>
                  </div>
                  <h2 className="text-[1.05rem] sm:text-lg font-guest-card font-semibold text-stone-800 leading-snug tracking-tight mb-1.5 group-hover:text-stone-900 transition-colors">
                    {card.title}
                  </h2>
                  <p className="text-stone-500 font-guest text-sm leading-relaxed font-normal">
                    {card.desc}
                  </p>
                  <p className="mt-4 text-sm font-guest-card font-semibold text-wedding-sea tracking-wide opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                    Abrir →
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-10 py-7 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <div className="w-10 h-px bg-gradient-to-r from-transparent via-wedding-gold/50 to-transparent mx-auto mb-5" />
          <p className="font-guest-serif font-semibold text-wedding-dark text-xl leading-tight tracking-wide">
            Romina &amp; Felipe
          </p>
          <p className="font-guest text-wedding-dark/45 text-xs tracking-[0.18em] uppercase mt-2 font-medium">
            15 Sep 2026 &middot; Cartagena de Indias
          </p>
        </motion.div>
      </div>
    </main>
  )
}
