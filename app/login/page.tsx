'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const role = searchParams.get('role') || 'guest'

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

    // Validar código
    const isValidCode = role === 'admin' ? code === 'ADMIN2025' : code === 'BODA2025'
    
    if (!isValidCode) {
      setError('Código inválido. Intenta de nuevo.')
      setLoading(false)
      return
    }

    // Simular guardado (después integrar con Supabase)
    localStorage.setItem('user', JSON.stringify({ name, role }))
    
    if (role === 'admin') {
      router.push('/dashboard')
    } else {
      router.push('/guest')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-wedding-sand to-wedding-coral flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <h1 className="text-3xl font-serif text-center mb-2 text-wedding-dark">
            WeddingSync
          </h1>
          <p className="text-center text-wedding-dark mb-8">
            {role === 'admin' ? 'Acceso de Novios' : 'Acceso de Invitados'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-wedding-dark mb-2">
                Tu Nombre
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border-2 border-wedding-sand rounded-lg focus:outline-none focus:border-wedding-coral"
                placeholder="Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-wedding-dark mb-2">
                Código de Acceso
              </label>
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2 border-2 border-wedding-sand rounded-lg focus:outline-none focus:border-wedding-coral"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-sm text-wedding-dark mt-6">
            <a href="/" className="text-wedding-coral hover:underline">
              ← Volver
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  )
}
