import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/shared/Navbar'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'WeddingSync · Romina & Felipe',
  description: 'Tu guía para la boda de Romina & Felipe · 15 Septiembre 2026 · Cartagena de Indias',
  icons: { icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💍</text></svg>' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-sans bg-wedding-sand text-wedding-dark antialiased">
        <Navbar />
        {children}
        <Toaster position="top-center" toastOptions={{
          style: { background: '#1a1a1a', color: '#fff', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans', system-ui, sans-serif" },
          success: { iconTheme: { primary: '#B8934E', secondary: '#fff' } },
        }} />
      </body>
    </html>
  )
}
