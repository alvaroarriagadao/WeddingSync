import { supabase } from './supabase'

export const GUEST_CODE = 'BODA2025'
export const ADMIN_CODE = 'ADMIN2025'

export type AppUser = {
  id: string
  name: string
  role: 'guest' | 'admin'
}

export async function loginUser(name: string, code: string): Promise<{ user: AppUser | null; error: string | null }> {
  const isAdmin = code === ADMIN_CODE
  const isGuest = code === GUEST_CODE

  if (!isAdmin && !isGuest) {
    return { user: null, error: 'Código inválido. Intenta de nuevo.' }
  }

  // Upsert guest record in Supabase
  const { data, error } = await supabase
    .from('guests')
    .upsert({ name: name.trim(), code_used: code, is_admin: isAdmin }, { onConflict: 'name' })
    .select()
    .single()

  if (error) {
    // If upsert fails (e.g. name conflict different code), just fetch existing
    const { data: existing } = await supabase
      .from('guests')
      .select()
      .eq('name', name.trim())
      .single()

    if (existing) {
      const user: AppUser = { id: existing.id, name: existing.name, role: existing.is_admin ? 'admin' : 'guest' }
      if (typeof window !== 'undefined') localStorage.setItem('weddingsync_user', JSON.stringify(user))
      return { user, error: null }
    }
    return { user: null, error: 'Error al iniciar sesión. Intenta de nuevo.' }
  }

  const user: AppUser = { id: data.id, name: data.name, role: isAdmin ? 'admin' : 'guest' }
  if (typeof window !== 'undefined') localStorage.setItem('weddingsync_user', JSON.stringify(user))
  return { user, error: null }
}

export function getStoredUser(): AppUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('weddingsync_user')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function logout() {
  if (typeof window !== 'undefined') localStorage.removeItem('weddingsync_user')
}
