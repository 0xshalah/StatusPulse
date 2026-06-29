'use client'

import { useState, useEffect } from 'react'
import { Bell, Settings, Check, X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '@/lib/statuspulse'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export default function SlackSettings({ open, onOpenChange }) {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [notifyOnDown, setNotifyOnDown] = useState(true)
  const [notifyOnDegraded, setNotifyOnDegraded] = useState(true)
  const [notifyOnRecovery, setNotifyOnRecovery] = useState(true)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (open) {
      api('/settings').then((s) => {
        if (s) {
          setWebhookUrl(s.slackWebhookUrl || '')
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
        body: JSON.stringify({ slackWebhookUrl: webhookUrl, notifyOnDown, notifyOnDegraded, notifyOnRecovery }),
      })
      toast.success('Alert settings saved')
      onOpenChange(false)
    } catch { toast.error('Save failed') }
    setLoading(false)
  }

  const testWebhook = async () => {
    setTesting(true)
    try {
      const r = await api('/settings/test', { method: 'POST' })
      if (r.sent) toast.success('Test notification sent to Slack!')
      else toast.error(r.error || 'Test failed')
    } catch { toast.error('Test failed') }
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
                <h2 className="font-display text-lg font-bold">Alert Settings</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="slack-url" className="text-sm font-medium">Slack Webhook URL</Label>
                <Input
                  id="slack-url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="mt-1.5 font-mono text-xs"
                />
              </div>

              <div className="space-y-3">
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

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={testWebhook} disabled={testing || !webhookUrl} className="gap-1.5">
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Test
                </Button>
                <Button onClick={save} disabled={loading} className="flex-1 gap-1.5">
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Settings className="h-3.5 w-3.5" />}
                  Save
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
