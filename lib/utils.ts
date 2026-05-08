import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function formatTime(time: string): string {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'pm' : 'am'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

export function formatDateTime(dt: string): string {
  const d = new Date(dt)
  return d.toLocaleString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const CATEGORY_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  ceremony: { label: 'Ceremonia', icon: '🎊', color: 'text-yellow-700', bg: 'bg-yellow-100 border-yellow-300' },
  meal: { label: 'Cena/Comida', icon: '🍽️', color: 'text-orange-700', bg: 'bg-orange-100 border-orange-300' },
  activity: { label: 'Actividad libre', icon: '🏖️', color: 'text-teal-700', bg: 'bg-teal-100 border-teal-300' },
  transfer: { label: 'Traslado', icon: '🚌', color: 'text-gray-700', bg: 'bg-gray-100 border-gray-300' },
  party: { label: 'Fiesta', icon: '🎉', color: 'text-purple-700', bg: 'bg-purple-100 border-purple-300' },
}

export const BADGE_CONFIG: Record<string, { label: string; color: string }> = {
  everyone: { label: 'Todos van', color: 'bg-green-100 text-green-800' },
  optional: { label: 'Opcional', color: 'bg-blue-100 text-blue-800' },
  couple_only: { label: 'Solo novios', color: 'bg-pink-100 text-pink-800' },
}
