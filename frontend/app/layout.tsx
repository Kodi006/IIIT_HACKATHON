import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Footer from './components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Clinical Co-Pilot - AI-Powered Clinical Decision Support',
  description: 'Modern clinical decision support system with RAG-powered analysis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
          {children}
          <Footer />
        </div>
      </body>
    </html>
  )
}
