export const validateGuestCode = (code: string): boolean => {
  return code === 'BODA2025'
}

export const validateAdminCode = (code: string): boolean => {
  return code === process.env.NEXT_PUBLIC_ADMIN_CODE || 'ADMIN2025'
}

export type User = {
  id: string
  name: string
  role: 'guest' | 'admin'
  createdAt: string
}
