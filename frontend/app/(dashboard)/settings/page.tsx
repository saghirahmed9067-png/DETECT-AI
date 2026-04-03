'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Bell, Shield, Settings, Save, Loader2, Trash2,
  Sliders, Key, Palette, Globe, Download, AlertTriangle,
  Eye, EyeOff, Copy, Check, RefreshCw, Lock, Smartphone, Mail
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth-provider'
import { toast } from 'sonner'

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-primary' : 'bg-border'}`}>
      <motion.div animate={{ x: checked ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm" />
    </button>
  )
}

function SliderInput({ value, onChange, min, max, label }: { value: number; onChange: (v: number) => void; min: number; max: number; label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{label}</span>
        <span className="text-xs font-bold text-primary">{value}%</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full bg-border appearance-none cursor-pointer accent-primary" />
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
  const [autoSave,     setAutoSave]     = useState(true)

  // Privacy prefs
  const [publicProfile, setPublicProfile] = useState(false)
  const [saveHistory,   setSaveHistory]   = useState(true)
  const [analytics,     setAnalytics]     = useState(true)

  // Detection prefs
  const [aiThreshold,    setAiThreshold]    = useState(65)
  const [humanThreshold, setHumanThreshold] = useState(35)
  const [deepScan,       setDeepScan]       = useState(false)
  const [autoDetectType, setAutoDetectType] = useState(true)

  // Appearance
  const [language, setLanguage] = useState('en')
  const [timezone, setTimezone] = useState('UTC+5')

  // API key state — backed by real /api/user/api-keys routes
  const [apiKeys,      setApiKeys]      = useState<any[]>([])
  const [keysLoading,  setKeysLoading]  = useState(false)
  const [newKeyName,   setNewKeyName]   = useState('')
  const [generating,   setGenerating]   = useState(false)
  const [revealedKey,  setRevealedKey]  = useState<string | null>(null)   // shown ONCE after generation
  const [keyCopied,    setKeyCopied]    = useState(false)
  const [revoking,     setRevoking]     = useState<string | null>(null)

  // Load keys on mount
  useEffect(() => {
    if (!currentUser) return
    setKeysLoading(true)
    fetch('/api/user/api-keys')
      .then(r => r.json())
      .then(d => { if (d.data) setApiKeys(d.data) })
      .catch(() => {})
      .finally(() => setKeysLoading(false))
  }, [currentUser])

  const generateKey = async () => {
    if (generating) return
    setGenerating(true)
    setRevealedKey(null)
    try {
      const res  = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() || 'My API Key' }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to generate key'); return }
      setRevealedKey(data.data.key)        // show raw key ONCE
      setApiKeys(prev => [data.data, ...prev])
      setNewKeyName('')
      toast.success('API key generated — copy it now, it won\'t be shown again')
    } catch { toast.error('Failed to generate key') }
    setGenerating(false)
  }

  const revokeKey = async (id: string) => {
    setRevoking(id)
    try {
      const res = await fetch(`/api/user/api-keys/${id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Failed to revoke key'); return }
      setApiKeys(prev => prev.filter(k => k.id !== id))
      toast.success('API key revoked')
    } catch { toast.error('Failed to revoke key') }
    setRevoking(null)
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key).then(() => {
      setKeyCopied(true)
      setTimeout(() => setKeyCopied(false), 2000)
    })
  }

  const [saving, setSaving]             = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/user/delete-account', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.success('Account permanently deleted')
      await signOut()
    } catch {
      toast.error('Failed to delete account — please contact support')
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  useEffect(() => {
    if (!currentUser?.uid) return
    (supabase as any).from('profiles').select('metadata').eq('id', currentUser.uid).single().then(({ data: p }: any) => {
      const prefs = p?.metadata?.preferences || {}
      if (prefs.emailNotif   !== undefined) setEmailNotif(prefs.emailNotif)
      if (prefs.batchAlerts  !== undefined) setBatchAlerts(prefs.batchAlerts)
      if (prefs.weeklyReport !== undefined) setWeeklyReport(prefs.weeklyReport)
      if (prefs.autoSave     !== undefined) setAutoSave(prefs.autoSave)
      if (prefs.publicProfile!== undefined) setPublicProfile(prefs.publicProfile)
      if (prefs.saveHistory  !== undefined) setSaveHistory(prefs.saveHistory)
      if (prefs.analytics    !== undefined) setAnalytics(prefs.analytics)
      if (prefs.aiThreshold  !== undefined) setAiThreshold(prefs.aiThreshold)
      if (prefs.humanThreshold!==undefined) setHumanThreshold(prefs.humanThreshold)
      if (prefs.deepScan     !== undefined) setDeepScan(prefs.deepScan)
      if (prefs.autoDetectType!==undefined) setAutoDetectType(prefs.autoDetectType)
      if (prefs.language     !== undefined) setLanguage(prefs.language)
    })
  }, [currentUser])

  const save = async () => {
    if (!currentUser?.uid) return
    setSaving(true)
    try {
      await (supabase as any).from('profiles').upsert({
        id: currentUser.uid,
        metadata: { preferences: {
          emailNotif, batchAlerts, weeklyReport, autoSave,
          publicProfile, saveHistory, analytics,
          aiThreshold, humanThreshold, deepScan, autoDetectType,
          language, timezone,
        }},
        updated_at: new Date().toISOString(),
      })
      toast.success('Settings saved!')
    } catch { toast.error('Failed to save settings') }
    setSaving(false)
  }

  const exportData = () => {
    const data = { exported_at: new Date().toISOString(), preferences: { emailNotif, batchAlerts, autoSave, aiThreshold, publicProfile } }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'aiscern-settings.json'; a.click()
    toast.success('Settings exported!')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-5 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Settings</h1>
          <p className="text-text-muted text-sm mt-0.5">Customize your Aiscern experience</p>
        </div>
        <button onClick={save} disabled={saving}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl text-amber bg-amber/10 flex items-center justify-center"><Bell className="w-4 h-4" /></div>
          <h3 className="font-semibold text-text-primary">Notifications</h3>
        </div>
        {[
          { label: 'Email notifications',    sub: 'Get emailed when batch jobs complete',             value: emailNotif,   toggle: () => setEmailNotif(v => !v) },
          { label: 'Batch completion alerts', sub: 'In-app alert when large scans finish',            value: batchAlerts,  toggle: () => setBatchAlerts(v => !v) },
          { label: 'Weekly usage report',    sub: 'Summary of your detection activity each week',     value: weeklyReport, toggle: () => setWeeklyReport(v => !v) },
          { label: 'Auto-save scan results', sub: 'Automatically save all scans to History',          value: autoSave,     toggle: () => setAutoSave(v => !v) },
        ].map((item, ii, arr) => (
          <div key={ii} className={`flex items-center justify-between py-3 ${ii < arr.length - 1 ? 'border-b border-border' : ''}`}>
            <div><p className="text-sm font-medium text-text-primary">{item.label}</p><p className="text-xs text-text-muted mt-0.5">{item.sub}</p></div>
            <Toggle checked={item.value} onChange={item.toggle} />
          </div>
        ))}
      </motion.div>

      {/* Detection Preferences */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl text-primary bg-primary/10 flex items-center justify-center"><Sliders className="w-4 h-4" /></div>
          <h3 className="font-semibold text-text-primary">Detection Preferences</h3>
        </div>

        <div className="space-y-5 mb-5">
          <SliderInput value={aiThreshold}    onChange={setAiThreshold}    min={50} max={95} label="AI detection threshold" />
          <SliderInput value={humanThreshold} onChange={setHumanThreshold} min={5}  max={50} label="Human confidence threshold" />
        </div>

        {[
          { label: 'Deep scan mode',        sub: 'Run additional models for higher accuracy (slower)',     value: deepScan,       toggle: () => setDeepScan(v => !v) },
          { label: 'Auto-detect media type', sub: 'Automatically route uploads to the correct detector',  value: autoDetectType, toggle: () => setAutoDetectType(v => !v) },
        ].map((item, ii, arr) => (
          <div key={ii} className={`flex items-center justify-between py-3 ${ii < arr.length - 1 ? 'border-b border-border' : ''}`}>
            <div><p className="text-sm font-medium text-text-primary">{item.label}</p><p className="text-xs text-text-muted mt-0.5">{item.sub}</p></div>
            <Toggle checked={item.value} onChange={item.toggle} />
          </div>
        ))}
      </motion.div>

      {/* Privacy */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl text-emerald bg-emerald/10 flex items-center justify-center"><Shield className="w-4 h-4" /></div>
          <h3 className="font-semibold text-text-primary">Privacy & Data</h3>
        </div>
        {[
          { label: 'Public profile',        sub: 'Allow others to see your scan statistics',                value: publicProfile, toggle: () => setPublicProfile(v => !v) },
          { label: 'Save scan history',     sub: 'Store past detection results in your account',            value: saveHistory,   toggle: () => setSaveHistory(v => !v) },
          { label: 'Usage analytics',       sub: 'Help improve Aiscern by sharing anonymous usage data',   value: analytics,     toggle: () => setAnalytics(v => !v) },
        ].map((item, ii, arr) => (
          <div key={ii} className={`flex items-center justify-between py-3 ${ii < arr.length - 1 ? 'border-b border-border' : ''}`}>
            <div><p className="text-sm font-medium text-text-primary">{item.label}</p><p className="text-xs text-text-muted mt-0.5">{item.sub}</p></div>
            <Toggle checked={item.value} onChange={item.toggle} />
          </div>
        ))}
      </motion.div>

      {/* API Key Management */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl text-cyan bg-cyan/10 flex items-center justify-center"><Key className="w-4 h-4" /></div>
          <div>
            <h3 className="font-semibold text-text-primary">API Keys</h3>
            <p className="text-xs text-text-muted">Max 5 active keys · 1,000 calls/day each</p>
          </div>
        </div>

        {/* Revealed key banner — shown once after generation */}
        {revealedKey && (
          <div className="mb-4 p-3 rounded-xl bg-emerald/8 border border-emerald/25">
            <p className="text-xs font-semibold text-emerald mb-2">✓ Key generated — copy it now, it won't be shown again</p>
            <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 font-mono text-xs text-text-primary border border-border">
              <span className="flex-1 truncate select-all">{revealedKey}</span>
              <button onClick={() => copyKey(revealedKey)} className="text-text-muted hover:text-text-primary transition-colors shrink-0">
                {keyCopied ? <Check className="w-4 h-4 text-emerald" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Generate new key */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generateKey()}
            placeholder="Key name (e.g. Production)"
            maxLength={64}
            className="input-field flex-1 py-2 text-sm"
          />
          <button
            onClick={generateKey}
            disabled={generating || apiKeys.length >= 5}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-40 shrink-0"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
            Generate
          </button>
        </div>

        {/* Keys list */}
        {keysLoading ? (
          <div className="space-y-2">
            {[0, 1].map(i => <div key={i} className="h-14 rounded-xl bg-surface-active animate-pulse" />)}
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm border border-dashed border-border rounded-xl">
            No API keys yet — generate one above to get started
          </div>
        ) : (
          <div className="space-y-2">
            {apiKeys.map(k => (
              <div key={k.id} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-border bg-surface hover:border-primary/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-text-primary truncate">{k.name || 'Unnamed Key'}</span>
                    {k.is_active
                      ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald/10 text-emerald font-semibold shrink-0">Active</span>
                      : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose/10 text-rose font-semibold shrink-0">Revoked</span>
                    }
                  </div>
                  <p className="text-xs text-text-muted">
                    {k.calls_today ?? 0}/{k.daily_limit ?? 1000} calls today
                    {k.last_used_at
                      ? ` · Last used ${new Date(k.last_used_at).toLocaleDateString()}`
                      : ' · Never used'
                    }
                  </p>
                </div>
                {k.is_active && (
                  <button
                    onClick={() => revokeKey(k.id)}
                    disabled={revoking === k.id}
                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:border-rose/40 hover:text-rose hover:bg-rose/5 transition-all disabled:opacity-40"
                  >
                    {revoking === k.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-border">
          <a href="/docs/api" className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium w-fit">
            <Globe className="w-3 h-3" /> View API documentation →
          </a>
        </div>
      </motion.div>

      {/* Appearance */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl text-secondary bg-secondary/10 flex items-center justify-center"><Palette className="w-4 h-4" /></div>
          <h3 className="font-semibold text-text-primary">Appearance & Region</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-text-muted block mb-1.5">Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="input-field w-full py-2 text-sm">
              <option value="en">English</option>
              <option value="ur">Urdu</option>
              <option value="ar">Arabic</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1.5">Timezone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)}
              className="input-field w-full py-2 text-sm">
              <option value="UTC+5">UTC+5 (PKT)</option>
              <option value="UTC+0">UTC+0 (GMT)</option>
              <option value="UTC-5">UTC-5 (EST)</option>
              <option value="UTC-8">UTC-8 (PST)</option>
              <option value="UTC+1">UTC+1 (CET)</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Security */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl text-amber bg-amber/10 flex items-center justify-center"><Lock className="w-4 h-4" /></div>
          <h3 className="font-semibold text-text-primary">Account Security</h3>
        </div>
        <div className="space-y-2">
          <button onClick={() => toast.info('Password change link sent to your email')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/30 text-sm text-text-secondary hover:text-text-primary transition-all text-left">
            <Lock className="w-4 h-4 text-text-muted" />
            <div className="flex-1">
              <p className="font-medium">Change Password</p>
              <p className="text-xs text-text-muted">Send a password reset link to your email</p>
            </div>
          </button>
          <button onClick={() => toast.info('2FA setup coming soon')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/30 text-sm text-text-secondary hover:text-text-primary transition-all text-left">
            <Smartphone className="w-4 h-4 text-text-muted" />
            <div className="flex-1">
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-xs text-text-muted">Add an extra layer of security to your account</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber/10 border border-amber/20 text-amber font-medium">Soon</span>
          </button>
        </div>
      </motion.div>

      {/* Data & Export */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl text-primary bg-primary/10 flex items-center justify-center"><Download className="w-4 h-4" /></div>
          <h3 className="font-semibold text-text-primary">Data & Export</h3>
        </div>
        <div className="space-y-2">
          <button onClick={exportData}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/30 text-sm text-text-secondary hover:text-text-primary transition-all text-left">
            <Download className="w-4 h-4 text-text-muted" />
            <div>
              <p className="font-medium">Export Settings</p>
              <p className="text-xs text-text-muted">Download your preferences as JSON</p>
            </div>
          </button>
          <button onClick={() => toast.info('History export coming soon')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/30 text-sm text-text-secondary hover:text-text-primary transition-all text-left">
            <Download className="w-4 h-4 text-text-muted" />
            <div>
              <p className="font-medium">Export Scan History</p>
              <p className="text-xs text-text-muted">Download all scan results as CSV</p>
            </div>
          </button>
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card border-rose/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl text-rose bg-rose/10 flex items-center justify-center"><AlertTriangle className="w-4 h-4" /></div>
          <h3 className="font-semibold text-text-primary">Danger Zone</h3>
        </div>
        {!deleteConfirm ? (
          <button onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose/30 text-rose text-sm hover:bg-rose/5 transition-colors">
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
        ) : (
          <div className="p-4 rounded-xl bg-rose/5 border border-rose/20">
            <p className="text-sm text-rose font-medium mb-3">This will permanently delete your account and all data. Are you sure?</p>
            <div className="flex gap-2">
              <button onClick={handleDeleteAccount} disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose text-white text-sm font-medium hover:bg-rose/90 transition-colors disabled:opacity-60 flex items-center gap-2">
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Yes, Delete My Account
              </button>
              <button onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-surface-hover transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
