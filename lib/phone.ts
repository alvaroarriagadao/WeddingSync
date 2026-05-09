/**
 * Normaliza a formato E.164 sin +: 569XXXXXXXX (11 dígitos, móvil Chile).
 * Acepta pegados "+569 45 77 95 29" y "56945779529" como el mismo número.
 */
export function normalizeChilePhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (!d) return ''

  let rest = d
  if (rest.startsWith('569')) {
    rest = rest.slice(3)
  } else if (rest.startsWith('56')) {
    rest = rest.slice(2)
    if (rest.startsWith('9')) rest = rest.slice(1)
  }

  if (rest.length === 9 && rest.startsWith('9')) {
    return '569' + rest.slice(1)
  }
  if (rest.length === 8) {
    return '569' + rest
  }
  if (rest.length === 9) {
    return '569' + rest.slice(1)
  }

  if (d.startsWith('569') && d.length >= 11) {
    return d.slice(0, 11)
  }

  return '569' + rest.replace(/^0+/, '').slice(0, 8)
}

/**
 * Valores posibles de `guests.phone` según registros viejos (sin normalizar)
 * vs formato actual 569XXXXXXXX (11 dígitos).
 */
export function chilePhoneLookupVariants(canonical11: string): string[] {
  const s = new Set<string>()
  const d = canonical11.replace(/\D/g, '')
  if (!d || !d.startsWith('569') || d.length !== 11) {
    if (d) {
      s.add(d)
      s.add(`+${d}`)
    }
    return [...s]
  }

  const eight = d.slice(3)
  const national9 = `9${eight}`

  s.add(d)
  s.add(`+${d}`)
  s.add(national9)
  s.add(eight)
  s.add(`+${national9}`)
  s.add(`+569${eight}`)
  s.add(`569 ${eight}`)
  s.add(`569-${eight}`)
  s.add(`+56 9 ${eight}`.replace(/\s/g, ''))

  return [...s].filter(Boolean)
}
