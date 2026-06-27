import LandingClient from '@/components/landing/LandingClient'

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://statuspulse.app'),
  title: 'StatusPulse — Your APIs never sleep. Neither should your monitoring.',
  description:
    'Real-time API monitoring, instant alerts, and beautiful public status pages — all in one open-source tool. Free forever.',
  keywords: ['api monitoring', 'uptime', 'status page', 'incident', 'svg badge', 'open source'],
  openGraph: {
    title: 'StatusPulse — API status monitoring for developers',
    description: 'Real-time monitoring, instant alerts, and beautiful status pages. Free forever.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StatusPulse — API status monitoring',
    description: 'Real-time monitoring, instant alerts, and beautiful status pages. Free forever.',
  },
}

export default function Page() {
  return <LandingClient />
}
