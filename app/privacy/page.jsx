import Link from 'next/link'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Privacy Policy — StatusPulse',
  description: 'How StatusPulse handles your data. AI chat, monitoring, and embed privacy.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[720px] px-4 py-16 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to StatusPulse
        </Link>

        <h1 className="font-display text-3xl font-bold sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: July 3, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Data We Collect</h2>
            <p>StatusPulse is an API monitoring tool. We collect:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Endpoint URLs & names</strong> — you provide these for monitoring</li>
              <li><strong>Ping data</strong> — response time, status codes, uptime percentages</li>
              <li><strong>AI chat messages</strong> — sent to our AI provider for processing (not stored permanently)</li>
              <li><strong>Page context</strong> — when using the embed widget (max 1000 characters, optional)</li>
            </ul>
            <p className="mt-2">We <strong>never</strong> collect request bodies, credentials, passwords, or personal data beyond what you explicitly configure as endpoint URLs.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. AI Data Processing</h2>
            <p>When you use the AI Chat Assistant:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your messages are sent to our <strong>AI provider</strong> for processing</li>
              <li>Web search queries are sent to our <strong>search provider</strong></li>
              <li>Conversations are stored encrypted (AES-GCM 256-bit) in your browser</li>
              <li>Server-side conversation data auto-deletes after 30 minutes of inactivity</li>
              <li>You can delete your data anytime via the "Clear chat" button</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Data Storage & Security</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Endpoint data stored in MongoDB Atlas (encrypted at rest)</li>
              <li>Conversations stored in Redis with 30-minute TTL</li>
              <li>IP addresses are SHA-256 hashed before logging — never stored in raw form</li>
              <li>All traffic encrypted via HTTPS/TLS 1.3</li>
              <li>API keys stored in platform secrets manager, never in source code</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Embed Widget Privacy</h2>
            <p>The StatusPulse AI embed widget may extract page context (title, URL, text content) from the host page to provide context-aware answers. Site owners can disable this with <code className="px-1.5 py-0.5 rounded bg-muted text-xs">data-context="off"</code> on the script tag. Page context is limited to 1000 characters and URL query parameters are stripped.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Your Rights</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Delete your data</strong> — Clear chat button or DELETE /api/chat/delete</li>
              <li><strong>Export your data</strong> — GET /api/chat/export?cid=xxx</li>
              <li><strong>Opt out of AI</strong> — Don't use the AI chat widget</li>
              <li><strong>Opt out of page context</strong> — Use data-context="off" attribute</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Contact</h2>
            <p>For privacy concerns, open an issue on <a href="https://github.com/0xshalah/StatusPulse" className="text-primary hover:underline">GitHub</a>.</p>
          </section>
        </div>

        <div className="mt-12 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>StatusPulse is committed to data privacy and transparency.</span>
        </div>
      </div>
    </div>
  )
}
