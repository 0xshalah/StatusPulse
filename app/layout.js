import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'
import ClientLayout from '@/components/ClientLayout'

export const metadata = {
  title: 'StatusPulse — API Status Monitor',
  description: 'Real-time API endpoint monitoring, uptime tracking, public status pages and embeddable SVG badges.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
        <script dangerouslySetInnerHTML={{__html:`
(function(){try{var a=localStorage.getItem("statuspulse-accent")||"pink";var c={pink:["344 70% 55%","0 0% 100%","344 70% 55%","344 70% 55%","344 70% 61%"],violet:["263 60% 55%","0 0% 100%","263 60% 55%","263 60% 55%","263 60% 61%"],blue:["217 70% 55%","0 0% 100%","217 70% 55%","217 70% 55%","217 70% 61%"],emerald:["160 60% 45%","0 0% 100%","160 60% 45%","160 60% 45%","160 60% 51%"],amber:["43 90% 48%","0 0% 10%","43 90% 48%","43 90% 48%","43 90% 54%"],red:["0 65% 55%","0 0% 100%","0 65% 55%","0 65% 55%","0 65% 61%"],cyan:["187 70% 45%","0 0% 100%","187 70% 45%","187 70% 45%","187 70% 51%"],slate:["215 16% 45%","0 0% 100%","215 16% 45%","215 16% 45%","215 16% 51%"]};var v=c[a]||c.pink;var k=["--primary","--primary-foreground","--accent","--ring","--chart-4"];for(var i=0;i<k.length;i++)document.documentElement.style.setProperty(k[i],v[i])}catch(e){}
})();`.trim()}} />
        <script src="/embed.js" async defer data-color="#e1567c" />
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
