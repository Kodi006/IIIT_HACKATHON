import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Footer from './components/Footer'
import GeneralChatbot from './components/GeneralChatbot'

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
      <body className={inter.className} style={{ background: 'transparent' }}>
        <div className="min-h-screen">
          {children}
          <GeneralChatbot />
          <Footer />
        </div>
      </body>
    </html>
  )
}
