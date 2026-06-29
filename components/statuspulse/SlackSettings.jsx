'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, X, Loader2, Link2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '@/lib/statuspulse'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AlertSettings({ open, onOpenChange }) {
  const [tab, setTab] = useState('slack')
  const [slackUrl, setSlackUrl] = useState('')
  const [discordUrl, setDiscordUrl] = useState('')
  const [notifyOnDown, setNotifyOnDown] = useState(true)
  const [notifyOnDegraded, setNotifyOnDegraded] = useState(true)
  const [notifyOnRecovery, setNotifyOnRecovery] = useState(true)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (open) {
      api('/settings').then((s) => {
        if (s) {
          setSlackUrl(s.slackWebhookUrl || '')
          setDiscordUrl(s.discordWebhookUrl || '')
          setNotifyOnDown(s.notifyOnDown !== false)
          setNotifyOnDegraded(s.notifyOnDegraded !== false)
          setNotifyOnRecovery(s.notifyOnRecovery !== false)
        }
      }).catch(() => {})
    }
  }, [open])

  const save = async () => {
    setLoading(true)
    try {
      await api('/settings', {
        method: 'PUT',
        body: JSON.stringify({ slackWebhookUrl: slackUrl, discordWebhookUrl: discordUrl, notifyOnDown, notifyOnDegraded, notifyOnRecovery }),
      })
      toast.success('Alert settings saved')
      onOpenChange(false)
    } catch { toast.error('Save failed') }
    setLoading(false)
  }

  const testChannel = async (channel) => {
    setTesting(true)
    try {
      const body = channel === 'slack'
        ? JSON.stringify({ text: ':white_check_mark: *StatusPulse* — Webhook test successful!' })
        : JSON.stringify({ content: ':white_check_mark: **StatusPulse** — Webhook test successful!' })
      const url = channel === 'slack' ? slackUrl : discordUrl
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      if (res.ok) toast.success(`${channel === 'slack' ? 'Slack' : 'Discord'} test sent!`)
      else toast.error('Webhook rejected')
    } catch { toast.error('Connection failed') }
    setTesting(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink/10">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-display text-lg font-bold">Alert Channels</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Tabs value={tab} onValueChange={setTab} className="mb-4">
              <TabsList className="w-full">
                <TabsTrigger value="slack" className="flex-1">Slack</TabsTrigger>
                <TabsTrigger value="discord" className="flex-1">Discord</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-4">
              {tab === 'slack' && (
                <div>
                  <Label htmlFor="slack-url" className="text-sm font-medium">Slack Webhook URL</Label>
                  <Input
                    id="slack-url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={slackUrl}
                    onChange={(e) => setSlackUrl(e.target.value)}
                    className="mt-1.5 font-mono text-xs"
                  />
                  <Button variant="outline" size="sm" onClick={() => testChannel('slack')} disabled={testing || !slackUrl} className="mt-2 gap-1.5">
                    {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                    Test Slack
                  </Button>
                </div>
              )}
              {tab === 'discord' && (
                <div>
                  <Label htmlFor="discord-url" className="text-sm font-medium">Discord Webhook URL</Label>
                  <Input
                    id="discord-url"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={discordUrl}
                    onChange={(e) => setDiscordUrl(e.target.value)}
                    className="mt-1.5 font-mono text-xs"
                  />
                  <Button variant="outline" size="sm" onClick={() => testChannel('discord')} disabled={testing || !discordUrl} className="mt-2 gap-1.5">
                    {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                    Test Discord
                  </Button>
                </div>
              )}

              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Notify on Down</Label>
                  <Switch id="notify-down" checked={notifyOnDown} onCheckedChange={setNotifyOnDown} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Notify on Degraded</Label>
                  <Switch id="notify-degraded" checked={notifyOnDegraded} onCheckedChange={setNotifyOnDegraded} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Notify on Recovery</Label>
                  <Switch id="notify-recovery" checked={notifyOnRecovery} onCheckedChange={setNotifyOnRecovery} />
                </div>
              </div>

              <Button onClick={save} disabled={loading} className="w-full gap-1.5">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save Settings
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
