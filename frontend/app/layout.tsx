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
      <body>
        {/* Inline script to set initial theme class before React hydrates to reduce flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');else if(t==='light')document.documentElement.classList.remove('dark');else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark');}catch(e){} })()` }} />
        {children}
      </body>
    </html>
  )
}