import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import QueryProvider from '@/components/providers/QueryProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Data Room',
  description: 'Modern Data Room',
  icons: {
    icon: '/images/favicon.png',
  },
}

interface RootLayoutProps {
  readonly children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap"
          rel="stylesheet"
          referrerPolicy="no-referrer"
        />
      </head>
      <body style={{ fontFamily: 'var(--base-fm)' }}>
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              fontFamily: 'var(--base-fm)',
              borderRadius: '9999px',
              fontSize: '14px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              color: '#1e293b',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 16px -6px rgba(0, 0, 0, 0.05)',
              padding: '10px 24px',
              fontWeight: 500,
            },
            success: {
              iconTheme: {
                primary: '#007aff',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
