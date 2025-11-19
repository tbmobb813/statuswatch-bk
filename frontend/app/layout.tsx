import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/Providers'

export const metadata: Metadata = {
  title: 'StatusWatch - Real-time Service Monitoring',
  description: 'Monitor the status of your favorite developer tools in real-time',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // suppressHydrationWarning prevents React from logging a hydration mismatch
    // when the HTML <html> class is toggled by the inline script before hydration.
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Accessible skip link for keyboard users - becomes visible on focus */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-white p-2 rounded border">Skip to main content</a>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}