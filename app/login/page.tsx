'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { loginUser } from '@/lib/auth'
import { normalizeChilePhone } from '@/lib/phone'

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const role = searchParams.get('role') || 'guest'
  const isAdmin = role === 'admin'

  const [name, setName] = useState('')
  const [phoneLocal, setPhoneLocal] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isReturning, setIsReturning] = useState(false)

  function onPhoneChange(raw: string) {
    let v = raw.replace(/\D/g, '')
    if (v.startsWith('569')) v = v.slice(3)
    v = v.slice(0, 9)
    setPhoneLocal(v)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const phoneCanon = normalizeChilePhone(`569${phoneLocal}`)
    if (!phoneLocal.trim()) { setError('Ingresa tu teléfono'); setLoading(false); return }
    if (phoneCanon.length !== 11) { setError('Revisa el número: solo dígitos, sin espacios.'); setLoading(false); return }
    if (!code.trim()) { setError('Ingresa el código de acceso'); setLoading(false); return }
    if (!isReturning && !name.trim()) { setError('Ingresa tu nombre'); setLoading(false); return }

    const { user, error: loginError } = await loginUser(
      isReturning ? '' : name,
      phoneCanon,
      code,
    )

    if (loginError || !user) {
      setError(loginError || 'Error desconocido')
      setLoading(false)
      return
    }

    router.push(user.role === 'admin' ? '/dashboard' : '/guest')
  }

  const labelCls = 'block text-white/80 text-sm tracking-[0.12em] uppercase mb-2 font-sans font-semibold'
  const inputCls = 'w-full bg-transparent border-b border-white/25 pb-3 text-white placeholder-white/40 focus:outline-none focus:border-amber-300/80 transition-colors text-base font-sans'
  const subtleCls = 'text-white/65 text-sm mt-2 font-sans leading-snug'

  return (
    <div className="min-h-screen flex" style={{ background: '#0a0908' }}>

      <div className="hidden lg:flex flex-col justify-between w-1/2 p-14 relative overflow-hidden border-r border-white/[0.06]">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/hero.jpg)',
            filter: 'blur(3px) brightness(0.5)',
          }}
        />
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background: 'linear-gradient(135deg, rgba(10,9,8,0.55) 0%, rgba(10,9,8,0.35) 50%, rgba(10,9,8,0.55) 100%)',
          }}
        />

        <a href="/" className="inline-flex items-center gap-2 text-white/90 text-sm sm:text-base font-sans font-medium tracking-wide hover:text-white transition-colors z-10">
          <span aria-hidden>←</span>
          Volver
        </a>

        <div className="z-10">
          <p className="text-amber-200/95 text-sm sm:text-base tracking-[0.18em] uppercase mb-5 font-sans font-semibold">
            15 · septiembre · 2026
          </p>
          <h1 className="font-display leading-none text-white mb-4" style={{ fontSize: 'clamp(2.8rem, 4.5vw, 4.5rem)', fontWeight: 500, letterSpacing: '0.02em' }}>
            Romina<br />
            <span className="text-amber-200/95 italic font-light text-[0.5em] font-display">&amp;</span><br />
            Felipe
          </h1>
          <p className="text-white/80 text-base sm:text-lg tracking-wide font-sans font-medium">
            Cartagena de Indias, Colombia
          </p>
        </div>

        <p className="text-white/35 text-xs tracking-[0.2em] font-sans uppercase z-10">
          {isAdmin ? 'Acceso novios' : 'Acceso invitados'}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 relative min-h-screen lg:min-h-0">
        <div
          className="lg:hidden absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/hero.jpg)',
            filter: 'blur(4px) brightness(0.35)',
          }}
        />
        <div className="lg:hidden absolute inset-0 z-[1] bg-gradient-to-b from-stone-950/75 to-stone-950/88" />

        <motion.div
          className="w-full max-w-sm relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="lg:hidden mb-10">
            <a href="/" className="inline-flex items-center gap-2 text-white/90 text-sm font-sans font-semibold hover:text-white transition-colors">
              <span aria-hidden>←</span>
              Volver
            </a>
            <p className="font-display text-white text-2xl sm:text-3xl mt-6 font-semibold tracking-wide">Romina &amp; Felipe</p>
            <p className="text-amber-200/95 text-sm mt-3 font-sans font-semibold tracking-[0.15em] uppercase">
              15 · septiembre · 2026
            </p>
            <p className="text-white/75 text-base mt-2 font-sans">Cartagena de Indias, Colombia</p>
          </div>

          <p className="text-white/75 text-xs sm:text-sm tracking-[0.25em] uppercase mb-7 font-sans font-semibold">
            {isAdmin ? 'Acceso novios' : isReturning ? 'Ya estoy registrado' : 'Registro invitados'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isReturning && (
              <div>
                <label className={labelCls}>
                  Tu nombre
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={inputCls}
                  placeholder={isAdmin ? 'Romina o Felipe' : 'Tu nombre completo'}
                  autoComplete="name"
                  autoFocus
                />
              </div>
            )}

            <div>
              <label className={labelCls}>
                Teléfono
              </label>
              <div className="flex items-end gap-2 border-b border-white/25 focus-within:border-amber-300/80 transition-colors pb-3">
                <span className="text-white font-sans text-base font-semibold shrink-0 select-none">+569</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={phoneLocal}
                  onChange={e => onPhoneChange(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-white placeholder-white/40 focus:outline-none text-base font-sans font-medium tracking-wide"
                  placeholder="912345678"
                  autoFocus={isReturning}
                />
              </div>
              <p className={subtleCls}>
                Solo números, sin espacios. Ej: 912345678
              </p>
            </div>

            <div>
              <label className={labelCls}>
                Código de acceso
              </label>
              <input
                type="password"
                value={code}
                onChange={e => setCode(e.target.value)}
                className={`${inputCls} tracking-widest`}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {!isAdmin && (
                <p className={subtleCls}>Pide el código a Romina o Felipe</p>
              )}
            </div>

            {error && (
              <motion.p
                className="text-red-300 text-sm font-sans"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {error}
              </motion.p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 text-sm sm:text-base tracking-[0.15em] uppercase transition-all duration-300 disabled:opacity-40 rounded-lg font-sans font-bold"
                style={{
                  background: isAdmin ? '#B8934E' : 'transparent',
                  color: isAdmin ? '#0a0908' : 'white',
                  border: isAdmin ? 'none' : '2px solid rgba(255,255,255,0.35)',
                }}
              >
                {loading ? 'Entrando...' : isReturning ? 'Entrar' : isAdmin ? 'Entrar como novios' : 'Registrarme'}
              </button>
            </div>
          </form>

          {!isAdmin && (
            <button
              type="button"
              onClick={() => { setIsReturning(!isReturning); setError('') }}
              className="w-full mt-5 text-center text-white/70 text-sm font-sans font-medium hover:text-white/95 transition-colors"
            >
              {isReturning ? '¿Primera vez? Regístrate aquí' : '¿Ya te registraste? Entra aquí'}
            </button>
          )}

          <div className="mt-10 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/15" />
            <a
              href={isAdmin ? '/login?role=guest' : '/login?role=admin'}
              className="text-white/70 text-xs sm:text-sm tracking-[0.2em] uppercase hover:text-white transition-colors whitespace-nowrap font-sans font-semibold"
            >
              {isAdmin ? 'Soy invitado/a' : 'Soy novio/a'}
            </a>
            <div className="h-px flex-1 bg-white/15" />
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0908]">
        <div className="w-px h-12 bg-gradient-to-b from-transparent via-[#B8934E]/40 to-transparent animate-pulse" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
