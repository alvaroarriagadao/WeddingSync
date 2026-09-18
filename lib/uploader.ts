/**
 * Identidad para subir a la galería pública.
 *
 * La galería se ve sin cuenta: basta el enlace. Para subir hay que poner el
 * nombre y el código de la boda, y eso queda guardado en el teléfono para no
 * volver a pedirlo. Es un filtro de cortesía, no de seguridad: como el resto
 * de los códigos de la app, viaja en el navegador.
 */

export const UPLOAD_CODE = 'CARTAGENA26'

export type Uploader = {
  name: string
  /** id del invitado cuando entró con su cuenta; null si subió solo con el código. */
  guestId: string | null
}

const KEY = 'weddingsync_uploader'

/** "cartagena 26", "Cartagena-26" y "CARTAGENA26" son todos válidos. */
export function normalizeCode(raw: string): string {
  return raw.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

export function isValidCode(raw: string): boolean {
  return normalizeCode(raw) === UPLOAD_CODE
}

export function getStoredUploader(): Uploader | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.name ? { name: String(parsed.name), guestId: parsed.guestId ?? null } : null
  } catch {
    return null
  }
}

export function storeUploader(uploader: Uploader) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(uploader))
  } catch {
    // Modo incógnito sin almacenamiento: se pedirá el código de nuevo.
  }
}
