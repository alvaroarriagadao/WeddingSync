'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getStoredUser, logout, type AppUser } from '@/lib/auth'

const GUEST_LINKS = [
  { href: '/guest', label: 'Inicio', icon: '🏠' },
  { href: '/guest/calendar', label: 'Calendario', icon: '📅' },
  { href: '/guest/flights', label: 'Vuelos', icon: '✈️' },
  { href: '/guest/panoramas', label: 'Panoramas', icon: '🗺️' },
  { href: '/guest/playlist', label: 'Playlist', icon: '🎵' },
]

const ADMIN_LINKS = [
  { href: '/dashboard', label: 'Inicio', icon: '🏠' },
  { href: '/dashboard/calendar', label: 'Calendario', icon: '📅' },
  { href: '/dashboard/flights', label: 'Vuelos', icon: '✈️' },
  { href: '/dashboard/panoramas', label: 'Panoramas', icon: '🗺️' },
  { href: '/dashboard/playlist', label: 'Playlist', icon: '🎵' },
]

export default function Navbar() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setUser(getStoredUser())
  }, [pathname])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  if (!user) return null

  const links = user.role === 'admin' ? ADMIN_LINKS : GUEST_LINKS

  return (
    <>
      {/* Desktop navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-wedding-sand shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={user.role === 'admin' ? '/dashboard' : '/guest'} className="flex items-center gap-2">
            <span className="text-2xl">💍</span>
            <span className="font-serif text-xl text-wedding-dark hidden sm:block">WeddingSync</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-wedding-coral text-white'
                      : 'text-wedding-dark/70 hover:text-wedding-dark hover:bg-wedding-sand'
                  }`}
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-wedding-coral flex items-center justify-center text-white text-sm font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-wedding-dark/70 hidden lg:block">{user.name}</span>
              {user.role === 'admin' && (
                <span className="text-xs px-2 py-0.5 bg-wedding-gold/20 text-wedding-gold rounded-full font-medium">
                  Admin
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-wedding-dark/50 hover:text-wedding-coral transition-colors hidden sm:block"
            >
              Salir
            </button>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-wedding-sand transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <div className="w-5 h-0.5 bg-wedding-dark mb-1 transition-all" style={{ transform: menuOpen ? 'rotate(45deg) translate(3px, 3px)' : '' }} />
              <div className="w-5 h-0.5 bg-wedding-dark mb-1" style={{ opacity: menuOpen ? 0 : 1 }} />
              <div className="w-5 h-0.5 bg-wedding-dark transition-all" style={{ transform: menuOpen ? 'rotate(-45deg) translate(3px, -3px)' : '' }} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="md:hidden bg-white border-t border-wedding-sand px-4 py-3"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {links.map((link) => {
                const active = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors mb-1 ${
                      active
                        ? 'bg-wedding-coral text-white'
                        : 'text-wedding-dark/70 hover:bg-wedding-sand'
                    }`}
                  >
                    <span className="text-lg">{link.icon}</span>
                    {link.label}
                  </Link>
                )
              })}
              <div className="border-t border-wedding-sand mt-3 pt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-wedding-coral flex items-center justify-center text-white text-sm font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-wedding-dark">{user.name}</span>
                </div>
                <button onClick={handleLogout} className="text-sm text-wedding-coral">Salir →</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  )
}
