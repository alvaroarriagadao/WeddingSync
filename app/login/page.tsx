'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { loginUser } from '@/lib/auth'

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const role = searchParams.get('role') || 'guest'
  const isAdmin = role === 'admin'

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!name.trim()) {
      setError('Por favor ingresa tu nombre')
      setLoading(false)
      return
    }
    if (!code.trim()) {
      setError('Por favor ingresa el código de acceso')
      setLoading(false)
      return
    }

    const { user, error: loginError } = await loginUser(name, code)

    if (loginError || !user) {
      setError(loginError || 'Error desconocido')
      setLoading(false)
      return
    }

    // Role check: if they picked admin role but used guest code, redirect to guest
    if (user.role === 'admin') {
      router.push('/dashboard')
    } else {
      router.push('/guest')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #2C5364 0%, #203A43 40%, #0F2027 100%)' }}
    >
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-20"
          style={{ background: '#E8927C', filter: 'blur(80px)' }} />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-20"
          style={{ background: '#C9A84C', filter: 'blur(80px)' }} />
      </div>

      <motion.div
        className="relative w-full max-w-md"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">💍</div>
            <h1 className="text-3xl font-serif text-wedding-dark mb-1">WeddingSync</h1>
            <p className="text-wedding-dark/60 text-sm">
              {isAdmin ? '✨ Acceso exclusivo novios' : '🎉 ¡Bienvenido/a, invitado!'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-wedding-dark/80 mb-2">
                Tu Nombre Completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral transition-colors text-wedding-dark placeholder-gray-400"
                placeholder={isAdmin ? 'Novio/Novia' : 'Tu nombre completo'}
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-wedding-dark/80 mb-2">
                Código de Acceso
              </label>
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-3 border-2 border-wedding-sand rounded-xl focus:outline-none focus:border-wedding-coral transition-colors text-wedding-dark placeholder-gray-400"
                placeholder={isAdmin ? 'Código secreto de novios' : 'BODA2025'}
                autoComplete="current-password"
              />
              {!isAdmin && (
                <p className="text-xs text-wedding-dark/50 mt-1 ml-1">
                  Pregunta el código a los novios 💌
                </p>
              )}
            </div>

            {error && (
              <motion.div
                className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                ⚠️ {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: isAdmin ? 'linear-gradient(135deg, #C9A84C, #a8883d)' : 'linear-gradient(135deg, #E8927C, #d4745c)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Entrando...
                </span>
              ) : isAdmin ? '✨ Entrar como Novios' : '🎉 ¡Entrar a la Fiesta!'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-wedding-coral hover:underline">
              ← Volver al inicio
            </a>
            {isAdmin ? (
              <span className="mx-3 text-wedding-dark/30">·</span>
            ) : null}
            {isAdmin ? (
              <a href="/login?role=guest" className="text-sm text-wedding-dark/50 hover:text-wedding-dark">
                Soy invitado/a
              </a>
            ) : (
              <>
                <span className="mx-3 text-wedding-dark/30">·</span>
                <a href="/login?role=admin" className="text-sm text-wedding-dark/50 hover:text-wedding-dark">
                  Soy novio/a
                </a>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #2C5364, #0F2027)' }}>
        <div className="text-white text-xl">Cargando...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
