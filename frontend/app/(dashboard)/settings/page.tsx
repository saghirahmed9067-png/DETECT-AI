'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Bell, Shield, Save, Loader2, Trash2,
  Sliders, Palette, Globe, Download, AlertTriangle,
  Moon, Sun, Volume2, VolumeX, History, Eye, EyeOff,
  BarChart2, Lock, Mail, Smartphone, ChevronRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth-provider'
import { toast } from 'sonner'
import Link from 'next/link'

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button onClick={onChange} disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-primary' : 'bg-border'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
      <motion.div animate={{ x: checked ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm" />
    </button>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="card p-0 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-surface/50">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h2 className="font-bold text-text-primary">{title}</h2>
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </motion.div>
  )
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary">{label}</div>
        {description && <div className="text-xs text-text-muted mt-0.5">{description}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const { user: currentUser, signOut } = useAuth()
  const supabase = createClient()

  // Notification prefs
  const [emailNotif,   setEmailNotif]   = useState(true)
  const [batchAlerts,  setBatchAlerts]  = useState(true)
  const [weeklyReport, setWeeklyReport] = useState(false)

  // Privacy prefs
  const [saveHistory,   setSaveHistory]   = useState(true)
  const [publicProfile, setPublicProfile] = useState(false)
  const [analytics,     setAnalytics]     = useState(true)

  // Detection prefs
  const [autoDetectType, setAutoDetectType] = useState(true)
  const [showConfidence, setShowConfidence] = useState(true)
  const [showSignals,    setShowSignals]    = useState(true)
  const [deepScan,       setDeepScan]       = useState(false)

  // Appearance
  const [language, setLanguage] = useState('en')
  const [timezone, setTimezone] = useState('UTC+5')

  const [saving,         setSaving]         = useState(false)
  const [deleteConfirm,  setDeleteConfirm]  = useState('')

  useEffect(() => {
    if (!currentUser?.uid) return
    ;(supabase as any).from('profiles').select('metadata').eq('id', currentUser.uid).single()
      .then(({ data: p }: any) => {
        const prefs = p?.metadata?.preferences || {}
        if (prefs.emailNotif    !== undefined) setEmailNotif(prefs.emailNotif)
        if (prefs.batchAlerts   !== undefined) setBatchAlerts(prefs.batchAlerts)
        if (prefs.weeklyReport  !== undefined) setWeeklyReport(prefs.weeklyReport)
        if (prefs.saveHistory   !== undefined) setSaveHistory(prefs.saveHistory)
        if (prefs.publicProfile !== undefined) setPublicProfile(prefs.publicProfile)
        if (prefs.analytics     !== undefined) setAnalytics(prefs.analytics)
        if (prefs.autoDetectType!== undefined) setAutoDetectType(prefs.autoDetectType)
        if (prefs.showConfidence!== undefined) setShowConfidence(prefs.showConfidence)
        if (prefs.showSignals   !== undefined) setShowSignals(prefs.showSignals)
        if (prefs.deepScan      !== undefined) setDeepScan(prefs.deepScan)
        if (prefs.language      !== undefined) setLanguage(prefs.language)
        if (prefs.timezone      !== undefined) setTimezone(prefs.timezone)
      })
  }, [currentUser])

  const save = async () => {
    if (!currentUser?.uid) return
    setSaving(true)
    try {
      await (supabase as any).from('profiles').upsert({
        id: currentUser.uid,
        metadata: { preferences: {
          emailNotif, batchAlerts, weeklyReport,
          saveHistory, publicProfile, analytics,
          autoDetectType, showConfidence, showSignals, deepScan,
          language, timezone,
        }}
      }, { onConflict: 'id' })
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally { setSaving(false) }
  }

  const exportData = async () => {
    try {
      const { data } = await (supabase as any).from('scans')
        .select('*').eq('user_id', currentUser?.uid).order('created_at', { ascending: false })
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
      a.download = `aiscern-export-${Date.now()}.json`; a.click()
      toast.success('Data exported successfully')
    } catch { toast.error('Export failed') }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Settings</h1>
          <p className="text-sm text-text-muted mt-0.5">Customize your Aiscern experience</p>
        </div>
        <button onClick={save} disabled={saving || !currentUser}
          className="btn-primary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Notifications */}
      <Section title="Notifications" icon={Bell}>
        <SettingRow label="Email notifications" description="Receive results and alerts via email">
          <Toggle checked={emailNotif} onChange={() => setEmailNotif(v => !v)} />
        </SettingRow>
        <SettingRow label="Batch scan alerts" description="Notify when batch jobs complete">
          <Toggle checked={batchAlerts} onChange={() => setBatchAlerts(v => !v)} />
        </SettingRow>
        <SettingRow label="Weekly summary report" description="Receive a weekly digest of your scans">
          <Toggle checked={weeklyReport} onChange={() => setWeeklyReport(v => !v)} />
        </SettingRow>
      </Section>

      {/* Detection Preferences */}
      <Section title="Detection Preferences" icon={Sliders}>
        <SettingRow label="Auto-detect content type" description="Automatically identify text, image, audio or video">
          <Toggle checked={autoDetectType} onChange={() => setAutoDetectType(v => !v)} />
        </SettingRow>
        <SettingRow label="Show confidence score" description="Display percentage certainty on results">
          <Toggle checked={showConfidence} onChange={() => setShowConfidence(v => !v)} />
        </SettingRow>
        <SettingRow label="Show detection signals" description="Show detailed breakdown of AI indicators">
          <Toggle checked={showSignals} onChange={() => setShowSignals(v => !v)} />
        </SettingRow>
        <SettingRow label="Deep scan mode" description="Run extended analysis (slower but more thorough)">
          <Toggle checked={deepScan} onChange={() => setDeepScan(v => !v)} />
        </SettingRow>
      </Section>

      {/* Privacy & Data */}
      <Section title="Privacy & Data" icon={Shield}>
        <SettingRow label="Save scan history" description="Keep a record of your past detections">
          <Toggle checked={saveHistory} onChange={() => setSaveHistory(v => !v)} />
        </SettingRow>
        <SettingRow label="Anonymous analytics" description="Help improve Aiscern with anonymized usage data">
          <Toggle checked={analytics} onChange={() => setAnalytics(v => !v)} />
        </SettingRow>
        <SettingRow label="Public profile" description="Allow your profile to be discoverable">
          <Toggle checked={publicProfile} onChange={() => setPublicProfile(v => !v)} />
        </SettingRow>
      </Section>

      {/* Account */}
      <Section title="Account" icon={Lock}>
        <div className="rounded-xl bg-surface p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-text-primary">{currentUser?.email || '—'}</div>
            <div className="text-xs text-text-muted mt-0.5">Signed in via Clerk</div>
          </div>
          <Link href="/profile" className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5">
            Edit profile <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <SettingRow label="Export your data" description="Download all your scans as JSON">
          <button onClick={exportData} className="btn-ghost py-1.5 px-3 text-sm flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />Export
          </button>
        </SettingRow>

        <SettingRow label="Clear scan history" description="Permanently delete all your past scans">
          {deleteConfirm === 'history' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Sure?</span>
              <button onClick={async () => {
                await (supabase as any).from('scans').delete().eq('user_id', currentUser?.uid)
                toast.success('History cleared'); setDeleteConfirm('')
              }} className="text-xs text-rose font-bold hover:underline">Yes, delete</button>
              <button onClick={() => setDeleteConfirm('')} className="text-xs text-text-muted">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setDeleteConfirm('history')} className="btn-ghost py-1.5 px-3 text-sm text-rose flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />Clear
            </button>
          )}
        </SettingRow>
      </Section>

      {/* Danger Zone */}
      <Section title="Danger Zone" icon={AlertTriangle}>
        <div className="rounded-xl border border-rose/20 bg-rose/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-rose">Delete Account</div>
              <div className="text-xs text-text-muted mt-0.5">Permanently remove your account and all data. This cannot be undone.</div>
            </div>
            {deleteConfirm === 'account' ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={async () => {
                  await (supabase as any).from('profiles').delete().eq('id', currentUser?.uid)
                  toast.success('Account deleted')
                  signOut()
                }} className="text-xs text-rose font-bold border border-rose/40 px-3 py-1.5 rounded-lg hover:bg-rose/10">
                  Confirm Delete
                </button>
                <button onClick={() => setDeleteConfirm('')} className="text-xs text-text-muted">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setDeleteConfirm('account')}
                className="flex-shrink-0 text-sm font-semibold text-rose border border-rose/30 px-3 py-1.5 rounded-lg hover:bg-rose/10 transition-colors">
                Delete
              </button>
            )}
          </div>
        </div>
      </Section>
    </div>
  )
}
