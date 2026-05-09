import { supabase } from './supabase'
import { normalizeChilePhone, chilePhoneLookupVariants } from './phone'

export const GUEST_CODE = 'BODA2026'
export const ADMIN_CODE = 'ADMIN2026'

export type AppUser = {
  id: string
  name: string
  phone: string
  role: 'guest' | 'admin'
}

/**
 * Login flow:
 * 1. Try phone lookup first (returning user)
 * 2. If not found by phone, try name lookup (legacy user without phone) → update their phone
 * 3. If neither found, register new guest
 * Phone becomes the unique identifier after first login.
 */
export async function loginUser(
  name: string,
  phone: string,
  code: string
): Promise<{ user: AppUser | null; error: string | null }> {
  const normalizedCode = code.trim().toUpperCase()
  const isAdmin = normalizedCode === ADMIN_CODE
  const isGuest = normalizedCode === GUEST_CODE

  if (!isAdmin && !isGuest) {
    return { user: null, error: 'Código inválido. Verifica con los novios.' }
  }

  const cleanPhone = normalizeChilePhone(phone)
  if (!cleanPhone || cleanPhone.length !== 11 || !cleanPhone.startsWith('569')) {
    return { user: null, error: 'Ingresa un teléfono móvil válido (Chile +569).' }
  }

  const phoneVariants = chilePhoneLookupVariants(cleanPhone)

  // 1. Buscar invitado por teléfono (coincide con formatos antiguos: +569…, solo 9 dígitos, etc.)
  const { data: byPhoneRows, error: phoneLookupErr } = await supabase
    .from('guests')
    .select('*')
    .in('phone', phoneVariants)
    .limit(3)

  if (phoneLookupErr) {
    return { user: null, error: 'Error al buscar tu cuenta. Intenta de nuevo.' }
  }

  let byPhone = byPhoneRows && byPhoneRows.length > 0 ? byPhoneRows[0] : null

  if (byPhone && byPhone.phone !== cleanPhone) {
    await supabase.from('guests').update({ phone: cleanPhone }).eq('id', byPhone.id)
    byPhone = { ...byPhone, phone: cleanPhone }
  }

  if (byPhone) {
    // Returning user — still validate the code
    if (!isAdmin && !isGuest) {
      return { user: null, error: 'Código inválido. Verifica con los novios.' }
    }
    const user: AppUser = {
      id: byPhone.id,
      name: byPhone.name,
      phone: byPhone.phone,
      role: byPhone.is_admin ? 'admin' : 'guest',
    }
    if (typeof window !== 'undefined') localStorage.setItem('weddingsync_user', JSON.stringify(user))
    return { user, error: null }
  }

  // 2. Try name lookup (legacy user who registered without phone)
  const cleanName = name.trim()
  if (cleanName) {
    const { data: byName } = await supabase
      .from('guests')
      .select('*')
      .eq('name', cleanName)
      .maybeSingle()

    if (byName) {
      // Update their phone for future logins
      if (!byName.phone) {
        await supabase.from('guests').update({ phone: cleanPhone }).eq('id', byName.id)
      }
      const user: AppUser = {
        id: byName.id,
        name: byName.name,
        phone: cleanPhone,
        role: byName.is_admin ? 'admin' : 'guest',
      }
      if (typeof window !== 'undefined') localStorage.setItem('weddingsync_user', JSON.stringify(user))
      return { user, error: null }
    }
  }

  // 3. New registration — need a name
  if (!cleanName) {
    return { user: null, error: 'No encontramos ese teléfono. Regístrate con tu nombre.' }
  }

  const { data: existingRows } = await supabase
    .from('guests')
    .select('id')
    .in('phone', phoneVariants)
    .limit(1)

  if (existingRows && existingRows.length > 0) {
    return { user: null, error: 'Este teléfono ya está registrado. Inicia sesión sin nombre.' }
  }

  // Insert new guest
  const { data: inserted, error: insertError } = await supabase
    .from('guests')
    .insert([{
      name: cleanName,
      phone: cleanPhone,
      code_used: normalizedCode,
      is_admin: isAdmin,
    }])
    .select()
    .single()

  if (insertError || !inserted) {
    if (insertError?.message?.includes('phone')) {
      return { user: null, error: 'Este teléfono ya está registrado.' }
    }
    if (insertError?.message?.includes('name')) {
      return { user: null, error: 'Este nombre ya existe. Contacta a los novios.' }
    }
    return { user: null, error: 'Error al registrarte. Intenta de nuevo.' }
  }

  const user: AppUser = {
    id: inserted.id,
    name: inserted.name,
    phone: inserted.phone || cleanPhone,
    role: isAdmin ? 'admin' : 'guest',
  }
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
