'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, type AppUser } from '@/lib/auth'
import MediaGallery from '@/components/gallery/MediaGallery'

export default function DashboardGalleryPage() {
  const [user, setUser] = useState<AppUser | null>(null)
  const router = useRouter()

  useEffect(() => {
    const u = getStoredUser()
    if (!u) { router.replace('/login?role=admin&next=/dashboard/gallery'); return }
    setUser(u)
  }, [router])

  if (!user) return <main className="min-h-screen bg-wedding-sand" />

  return <MediaGallery user={user} />
}
