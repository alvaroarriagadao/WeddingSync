'use client'

import { useEffect, useState } from 'react'
import { getStoredUser, type AppUser } from '@/lib/auth'
import MediaGallery from '@/components/gallery/MediaGallery'

/**
 * Galería pública: este es el enlace que se comparte. Se ve sin cuenta; para
 * subir se pide el código de la boda. Si quien entra ya tiene sesión, se usa
 * su nombre y sus permisos.
 */
export default function PublicGalleryPage() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setUser(getStoredUser())
    setReady(true)
  }, [])

  if (!ready) return <main className="min-h-screen bg-wedding-sand" />

  return <MediaGallery user={user} />
}
