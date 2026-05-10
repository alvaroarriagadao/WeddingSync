'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

const WEDDING_DATE = new Date('2026-09-15T18:00:00')

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

export default function LandingPage() {
  const { days, hours, minutes, seconds } = useCountdown(WEDDING_DATE)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handle = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handle, { passive: true })
    return () => window.removeEventListener('scroll', handle)
  }, [])

  const units = [
    { value: days, label: 'Días' },
    { value: hours, label: 'Horas' },
    { value: minutes, label: 'Min' },
    { value: seconds, label: 'Seg' },
  ]

  return (
    <main className="bg-wedding-blush text-wedding-ink antialiased overflow-x-hidden">

      {/* ——— HERO ——— */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 -top-[8%] -bottom-[8%] -left-[8%] -right-[8%] bg-stone-900 bg-no-repeat bg-contain bg-[center_20%] md:bg-cover md:bg-[center_30%]"
            style={{
              backgroundImage: 'url(/hero.jpg)',
              filter: 'blur(2px) brightness(0.8)',
              transform: `translateY(${scrollY * 0.22}px) scale(1.08)`,
              willChange: 'transform',
            }}
          />
        </div>

        {/* Capas: legibilidad + calidez caribeña */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background:
              'linear-gradient(165deg, rgba(35,28,26,0.38) 0%, rgba(60,45,40,0.22) 42%, rgba(120,72,58,0.14) 62%, rgba(22,18,16,0.58) 100%)',
          }}
        />
        <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-t from-stone-950/70 via-stone-950/10 to-stone-950/25" />

        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl w-full py-20 sm:py-16">
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="font-display font-medium text-[clamp(2.85rem,11vw,7.5rem)] leading-[0.92] tracking-[0.02em] text-white mb-2"
            style={{ textShadow: '0 4px 48px rgba(0,0,0,0.35)' }}
          >
            Romina
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.65, delay: 0.4 }}
            className="flex items-center gap-4 my-1"
          >
            <div className="h-px w-12 sm:w-16 bg-gradient-to-r from-transparent to-amber-200/70" />
            <span className="font-display text-[clamp(1.6rem,4.5vw,3rem)] font-light italic text-amber-100/90">
              &amp;
            </span>
            <div className="h-px w-12 sm:w-16 bg-gradient-to-l from-transparent to-amber-200/70" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="font-display font-medium text-[clamp(2.85rem,11vw,7.5rem)] leading-[0.92] tracking-[0.02em] text-white mb-7"
            style={{ textShadow: '0 4px 48px rgba(0,0,0,0.35)' }}
          >
            Felipe
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.72 }}
            className="font-sans text-white/80 text-xs sm:text-[13px] tracking-[0.22em] uppercase font-medium mb-10 max-w-xl"
          >
            15 · septiembre · 2026 · Cartagena de Indias
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.85 }}
            className="mb-10"
          >
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {units.map(({ value, label }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div
                    className="w-[clamp(64px,15vw,88px)] h-[clamp(64px,15vw,88px)] rounded-2xl flex items-center justify-center
                      border border-white/25 bg-white/15 backdrop-blur-xl shadow-lg shadow-black/15"
                  >
                    <span className="font-display text-[clamp(1.35rem,4vw,2rem)] text-white font-medium tabular-nums">
                      {String(value).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-[10px] font-sans tracking-[0.2em] uppercase text-amber-100/75 font-medium">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 1 }}
            className="flex flex-col sm:flex-row gap-3 w-full max-w-md justify-center"
          >
            <Link
              href="/login?role=guest"
              className="font-sans text-center py-3.5 px-8 rounded-xl border-2 border-white/35 bg-white/10 backdrop-blur-md
                text-amber-50 text-[11px] font-semibold tracking-[0.2em] uppercase transition-all duration-300
                hover:bg-white/20 hover:border-white/50"
            >
              Soy invitado
            </Link>
            <Link
              href="/login?role=admin"
              className="font-sans text-center py-3.5 px-8 rounded-xl bg-gradient-to-br from-amber-200 to-amber-400/95 text-stone-900
                text-[11px] font-bold tracking-[0.18em] uppercase shadow-lg shadow-amber-900/25 transition-transform duration-300 hover:scale-[1.02]"
            >
              Somos los novios
            </Link>
          </motion.div>
        </div>

        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 opacity-40 cursor-pointer"
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M10 4v12M4 10l6 6 6-6" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </section>

      {/* ——— CELEBRACIÓN ——— arena / piedra (contraste claro sobre crema cálida) */}
      <section className="relative py-20 sm:py-28 px-5 sm:px-8 bg-[#DDD4C8]">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.14]"
          style={{
            backgroundImage: 'url(/hero.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 35%',
            filter: 'blur(22px)',
          }}
        />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#DDD4C8]/90 via-[#DDD4C8]/95 to-[#D4CAC0]" />

        <div className="relative max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.65 }}
            className="text-center mb-14 sm:mb-16"
          >
            <p className="font-sans text-[#8B3A2F] text-[11px] font-semibold tracking-[0.35em] uppercase mb-4">
              La celebración
            </p>
            <h2 className="font-display font-medium text-[clamp(1.85rem,4.2vw,3rem)] text-[#1C1917] leading-[1.15] text-balance">
              Los esperamos en el Caribe
            </h2>
            <p className="mt-4 font-sans text-[#44403C] text-sm sm:text-base max-w-lg mx-auto leading-relaxed font-medium">
              Una noche en el centro histórico, entre calles empedradas y brisa del mar.
            </p>
          </motion.div>

          <div className="rounded-[28px] overflow-hidden ring-1 ring-stone-900/10 shadow-[0_25px_60px_-15px_rgba(28,25,23,0.35)] bg-white">
            <div className="h-1.5 bg-gradient-to-r from-wedding-terracotta via-wedding-gold to-wedding-sea" />
            <div className="grid grid-cols-1 md:grid-cols-3 md:divide-x md:divide-stone-200">
              {[
                { icon: '⛪', label: 'Ceremonia', title: 'Iglesia Santo Toribio', detail: 'Centro Histórico, Cartagena' },
                { icon: '🌹', label: 'Recepción', title: 'Hotel Casa Nácar', detail: 'Calle del Curato, Centro Histórico' },
                { icon: '👗', label: 'Dress code', title: 'Formal · Semiformal', detail: 'Color nude' },
              ].map((item, i) => (
                <motion.article
                  key={item.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="p-8 sm:p-10 flex flex-col gap-3 bg-white hover:bg-[#FAFAF9] transition-colors"
                >
                  <span className="text-2xl" aria-hidden>{item.icon}</span>
                  <p className="font-sans text-[#8B3A2F] text-[10px] font-bold tracking-[0.28em] uppercase">
                    {item.label}
                  </p>
                  <h3 className="font-display font-medium text-lg sm:text-xl text-[#1C1917] leading-snug">
                    {item.title}
                  </h3>
                  <p className="font-sans text-sm text-[#57534E] leading-relaxed">
                    {item.detail}
                  </p>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ——— CITA ——— banda oscura elegante (rompe monotonía de claros) */}
      <section className="relative py-20 sm:py-24 px-5 bg-gradient-to-br from-[#2C2825] via-[#252019] to-[#1a1614] text-white border-y border-white/5">
        <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(ellipse_at_50%_0%,rgba(184,147,78,0.12),transparent_55%)]" />
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-2xl mx-auto text-center"
        >
          <p className="font-display text-[clamp(1.2rem,2.9vw,1.55rem)] font-light italic text-white/90 leading-[1.75]">
            &ldquo;Queridos amigos y familia, estamos emocionados de celebrar este momento tan especial rodeados de las personas que más amamos.&rdquo;
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-amber-200/40" />
            <span className="font-display text-sm sm:text-base text-amber-200/95 font-medium tracking-wide">
              Romina &amp; Felipe
            </span>
            <div className="h-px w-12 bg-amber-200/40" />
          </div>
        </motion.div>
      </section>

      {/* ——— APP / FEATURES ——— aire y color (menta / crema) */}
      <section className="py-20 sm:py-24 px-5 sm:px-8 bg-gradient-to-b from-[#E8F2F1] to-[#FAFAF8]">
        <div className="max-w-4xl mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center font-sans text-[#2D5A58] text-[11px] font-semibold tracking-[0.35em] uppercase mb-3"
          >
            Tu guía para la semana
          </motion.p>
          <p className="text-center font-display text-[#1C1917]/80 text-lg mb-12 font-medium">
            Todo en un solo lugar
          </p>

          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { icon: '📅', title: 'Itinerario', desc: 'Semana completa día a día' },
              { icon: '✈️', title: 'Vuelos', desc: 'Coordina llegadas con todos' },
              { icon: '🗺️', title: 'Panoramas', desc: 'Vota actividades en Cartagena' },
              { icon: '🎵', title: 'Playlist', desc: 'Añade tu canción a la fiesta' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="group rounded-2xl border border-[#C5D8D6]/80 bg-white/90 p-7 shadow-sm shadow-stone-900/5
                  hover:border-wedding-sea/40 hover:shadow-md hover:shadow-wedding-sea/10 transition-all duration-300"
              >
                <span className="text-2xl mb-3 block">{item.icon}</span>
                <p className="font-display font-medium text-lg text-[#1C1917] mb-2">
                  {item.title}
                </p>
                <p className="font-sans text-sm text-[#57534E] leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— FOOTER CTA ——— */}
      <section className="relative py-20 sm:py-24 px-5 overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center scale-110"
            style={{
              backgroundImage: 'url(/hero.jpg)',
              filter: 'blur(8px)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/88 to-stone-800/75" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 text-center max-w-xl mx-auto"
        >
          <p className="font-sans text-white/45 text-[10px] sm:text-[11px] tracking-[0.32em] uppercase mb-4">
            Nos vemos en
          </p>
          <h2 className="font-display font-medium text-[clamp(1.75rem,4vw,2.75rem)] text-white mb-10 leading-tight">
            Cartagena de Indias
          </h2>
          <Link
            href="/login?role=guest"
            className="inline-flex font-sans py-3.5 px-10 rounded-xl border border-white/30 bg-white/10 backdrop-blur-md
              text-white text-[11px] font-semibold tracking-[0.22em] uppercase transition-all hover:bg-white/20"
          >
            Entrar a WeddingSync
          </Link>

          <div className="mt-16 flex items-center justify-center gap-4 opacity-30">
            <div className="h-px w-12 bg-white/80" />
            <span className="font-display text-white text-sm tracking-[0.35em]">R · F</span>
            <div className="h-px w-12 bg-white/80" />
          </div>
        </motion.div>
      </section>
    </main>
  )
}
