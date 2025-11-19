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
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}