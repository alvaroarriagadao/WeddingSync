'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, type AppUser } from '@/lib/auth'
import MediaGallery from '@/components/gallery/MediaGallery'

export default function GuestGalleryPage() {
  const [user, setUser] = useState<AppUser | null>(null)
  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    // El enlace de la galería se comparte suelto por WhatsApp: quien llegue sin
    // sesión entra por el login y vuelve aquí solo.
    if (!u) { router.replace('/login?role=guest&next=/guest/gallery'); return }
    setUser(u)
  }, [router])

  if (!user) return <main className="min-h-screen bg-wedding-sand" />

  return <MediaGallery user={user} />
}
