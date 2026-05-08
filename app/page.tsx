'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

const WEDDING_DATE = new Date('2025-09-15T18:00:00')

function useCountdown(target: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calc = () => {
      const diff = target.getTime() - Date.now()
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [target])

  return timeLeft
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mb-2 shadow-lg">
        <span className="text-3xl sm:text-4xl font-serif font-bold text-white tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-white/80 text-xs sm:text-sm uppercase tracking-widest font-medium">{label}</span>
    </motion.div>
  )
}

export default function LandingPage() {
  const { days, hours, minutes, seconds } = useCountdown(WEDDING_DATE)

  return (
    <main className="min-h-screen">
      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Background gradient (placeholder for real photo) */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background: 'linear-gradient(135deg, #2C5364 0%, #203A43 40%, #0F2027 100%)',
          }}
        />
        {/* Overlay pattern */}
        <div
          className="absolute inset-0 z-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #E8927C44 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, #C9A84C44 0%, transparent 50%),
                              radial-gradient(circle at 50% 80%, #7EC8C844 0%, transparent 50%)`,
          }}
        />

        {/* Floating petals decoration */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl sm:text-3xl pointer-events-none select-none"
            style={{
              left: `${10 + i * 16}%`,
              top: `${15 + (i % 3) * 25}%`,
            }}
            animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
          >
            {['🌸', '✨', '🌺', '💫', '🌼', '⭐'][i]}
          </motion.div>
        ))}

        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl">
          {/* Ring icon */}
          <motion.div
            className="text-5xl mb-6"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          >
            💍
          </motion.div>

          {/* Names */}
          <motion.h1
            className="text-5xl sm:text-7xl md:text-8xl font-serif text-white mb-4 leading-tight"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Camila
            <span className="text-wedding-gold mx-4 text-4xl sm:text-5xl md:text-6xl">&</span>
            Martín
          </motion.h1>

          {/* Date & location */}
          <motion.p
            className="text-wedding-gold text-lg sm:text-xl font-medium tracking-[0.3em] uppercase mb-2"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            15 de Septiembre, 2025
          </motion.p>
          <motion.p
            className="text-white/70 text-base sm:text-lg tracking-widest mb-12"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            Cartagena de Indias, Colombia 🇨🇴
          </motion.p>

          {/* Countdown */}
          <motion.div
            className="mb-14"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.9 }}
          >
            <p className="text-white/60 text-sm uppercase tracking-widest mb-5">Faltan...</p>
            <div className="flex gap-4 sm:gap-6 justify-center">
              <CountdownUnit value={days} label="días" />
              <CountdownUnit value={hours} label="horas" />
              <CountdownUnit value={minutes} label="min" />
              <CountdownUnit value={seconds} label="seg" />
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.1 }}
          >
            <Link
              href="/login?role=guest"
              className="px-8 py-4 bg-wedding-coral text-white rounded-full font-semibold text-lg hover:bg-opacity-90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            >
              🎉 Soy Invitado/a
            </Link>
            <Link
              href="/login?role=admin"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-wedding-gold text-wedding-gold rounded-full font-semibold text-lg hover:bg-wedding-gold hover:text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            >
              💍 Somos los Novios
            </Link>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </motion.div>
      </section>

      {/* WELCOME SECTION */}
      <section className="bg-wedding-sand py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <div className="text-4xl mb-6">🌺</div>
            <h2 className="text-4xl sm:text-5xl font-serif text-wedding-dark mb-6">
              ¡Los esperamos en el Caribe!
            </h2>
            <p className="text-lg text-wedding-dark/80 leading-relaxed mb-6">
              Queridos amigos y familia, estamos emocionados de celebrar este momento tan especial
              rodeados de las personas que más amamos. Cartagena de Indias nos abre sus puertas
              para una semana llena de alegría, sol, mar y mucho amor.
            </p>
            <p className="text-lg text-wedding-dark/80 leading-relaxed">
              Esta app es tu guía completa para la semana de la boda. Aquí encontrarás el itinerario,
              podrás coordinar vuelos con otros invitados, votar por actividades y ¡armar la playlist
              de la fiesta!
            </p>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            className="text-3xl sm:text-4xl font-serif text-center text-wedding-dark mb-14"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Todo lo que necesitas en un lugar
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '📅', title: 'Itinerario', desc: 'Semana completa con eventos y actividades día a día' },
              { icon: '✈️', title: 'Vuelos', desc: 'Coordina tu llegada y regreso con otros invitados' },
              { icon: '🗺️', title: 'Panoramas', desc: 'Vota las actividades que más te gustan en Cartagena' },
              { icon: '🎵', title: 'Playlist', desc: 'Añade tus canciones favoritas para la fiesta' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                className="text-center p-6 rounded-2xl border-2 border-wedding-sand hover:border-wedding-coral transition-colors"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-serif text-wedding-dark mb-2">{item.title}</h3>
                <p className="text-wedding-dark/70 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="bg-wedding-dark py-16 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-white/60 text-sm uppercase tracking-widest mb-4">¿Listo para la aventura?</p>
          <h2 className="text-3xl sm:text-4xl font-serif text-white mb-8">
            ¡Nos vemos en Cartagena! 🌴
          </h2>
          <Link
            href="/login?role=guest"
            className="inline-block px-10 py-4 bg-wedding-coral text-white rounded-full font-semibold text-lg hover:bg-opacity-90 transition-all shadow-lg"
          >
            Entrar a WeddingSync
          </Link>
        </motion.div>
      </section>
    </main>
  )
}
