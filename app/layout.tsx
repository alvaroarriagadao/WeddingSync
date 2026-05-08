import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WeddingSync 💍',
  description: 'Gestiona invitados, itinerarios y panoramas para una boda memorable',
  icons: {
    icon: '💍',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="font-sans bg-wedding-sand text-wedding-dark">
        {children}
      </body>
    </html>
  )
}
