'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
    if (phoneCanon.length !== 11) { setError('Revisa el número'); setLoading(false); return }
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

  const fieldCls = 'w-full bg-transparent border-b border-white/20 py-3.5 text-white placeholder-white/35 focus:outline-none focus:border-amber-300/60 transition-colors text-base font-sans'

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#0a0908' }}>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/hero.jpg)', filter: 'blur(5px) brightness(0.28)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/50 to-stone-950/80" />

      <motion.div
        className="relative z-10 w-full max-w-xs px-6"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-white/45 text-sm font-sans hover:text-white/80 transition-colors mb-12"
        >
          ← Volver
        </a>

        {/* Toggle — solo para invitados */}
        {!isAdmin && (
          <div className="flex bg-white/[0.07] rounded-xl p-1 mb-8 gap-1">
            <button
              type="button"
              onClick={() => { setIsReturning(false); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-sans font-semibold transition-all ${
                !isReturning ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/65'
              }`}
            >
              Primera vez
            </button>
            <button
              type="button"
              onClick={() => { setIsReturning(true); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-sans font-semibold transition-all ${
                isReturning ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/65'
              }`}
            >
              Ya tengo cuenta
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-1">
          <AnimatePresence initial={false}>
            {!isReturning && (
              <motion.div
                key="name-field"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{ overflow: 'hidden' }}
              >
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={fieldCls}
                  placeholder={isAdmin ? 'Romina o Felipe' : 'Tu nombre completo'}
                  autoComplete="name"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end border-b border-white/20 focus-within:border-amber-300/60 transition-colors">
            <span className="text-white/50 font-sans text-sm font-semibold shrink-0 pb-3.5 pr-1.5 select-none">+569</span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phoneLocal}
              onChange={e => onPhoneChange(e.target.value)}
              className="flex-1 min-w-0 bg-transparent pb-3.5 text-white placeholder-white/35 focus:outline-none text-base font-sans"
              placeholder="912345678"
            />
          </div>

          <input
            type="password"
            value={code}
            onChange={e => setCode(e.target.value)}
            className={`${fieldCls} tracking-widest`}
            placeholder="Código de acceso"
            autoComplete="current-password"
          />

          {error && (
            <motion.p
              className="text-red-300/90 text-sm font-sans pt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.p>
          )}

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl text-sm font-sans font-bold tracking-[0.12em] uppercase transition-all duration-300 disabled:opacity-40 ${
                isAdmin
                  ? 'bg-[#B8934E] text-[#0a0908]'
                  : isReturning
                    ? 'border border-white/25 bg-white/[0.08] text-white hover:bg-white/[0.14]'
                    : 'bg-amber-400/90 text-stone-900 hover:bg-amber-400'
              }`}
            >
              {loading ? '···' : isReturning ? 'Entrar' : isAdmin ? 'Entrar' : 'Registrarme'}
            </button>
          </div>
        </form>

        <div className="mt-8 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/[0.08]" />
          <a
            href={isAdmin ? '/login?role=guest' : '/login?role=admin'}
            className="text-white/30 text-xs tracking-[0.18em] uppercase font-sans font-medium hover:text-white/60 transition-colors whitespace-nowrap"
          >
            {isAdmin ? 'Soy invitado/a' : 'Soy novio/a'}
          </a>
          <div className="h-px flex-1 bg-white/[0.08]" />
        </div>
      </motion.div>
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
