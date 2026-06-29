import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'
import ClientLayout from '@/components/ClientLayout'

export const metadata = {
  title: 'StatusPulse — API Status Monitor',
  description: 'Real-time API endpoint monitoring, uptime tracking, public status pages and embeddable SVG badges.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
