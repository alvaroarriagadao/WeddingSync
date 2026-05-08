import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/shared/Navbar'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'WeddingSync 💍',
  description: 'Tu guía para la boda de Camila & Martín en Cartagena de Indias',
  icons: { icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💍</text></svg>' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-sans bg-wedding-sand text-wedding-dark">
        <Navbar />
        {children}
        <Toaster position="top-center" toastOptions={{
          style: { background: '#2C2C2C', color: '#fff', borderRadius: '12px' },
          success: { iconTheme: { primary: '#7EC8C8', secondary: '#fff' } },
        }} />
      </body>
    </html>
  )
}
