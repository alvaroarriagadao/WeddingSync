'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function GuestPage() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>
  }

  return (
    <main className="min-h-screen bg-wedding-sand">
      <div className="container-custom py-12">
        <h1 className="text-5xl font-serif mb-4 text-wedding-dark">
          ¡Hola, {user.name}!
        </h1>
        <p className="text-xl text-wedding-dark mb-12">
          Bienvenido a la boda
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Calendario', path: '/guest/calendar', icon: '📅' },
            { title: 'Registra tu Vuelo', path: '/guest/flights', icon: '✈️' },
            { title: 'Qué Hacer en Cartagena', path: '/guest/panoramas', icon: '🗺️' },
            { title: 'Playlist Colaborativa', path: '/guest/playlist', icon: '🎵' },
          ].map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className="card p-6 text-center hover:shadow-xl transition-all"
            >
              <div className="text-4xl mb-4">{item.icon}</div>
              <h2 className="text-xl font-serif text-wedding-dark">{item.title}</h2>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a href="/" className="text-wedding-coral hover:underline">
            ← Salir
          </a>
        </div>
      </div>
    </main>
  )
}
