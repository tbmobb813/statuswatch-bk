import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}