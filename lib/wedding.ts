/**
 * Instante exacto de la ceremonia: 15 de septiembre de 2026, 15:30
 * en Cartagena de Indias (Colombia, UTC-5 todo el año).
 *
 * El offset es obligatorio: sin él, `new Date('2026-09-15T15:30:00')` se
 * interpreta en la zona horaria del dispositivo de quien mira la página,
 * así que la cuenta regresiva daba una hora distinta para cada invitado.
 */
export const WEDDING_DATE = new Date('2026-09-15T15:30:00-05:00')
