'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Shield, BarChart3, Calendar, Edit3, Save, X, Camera, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth-provider'
import { updateProfile } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import type { Profile, UserStats } from '@/types'
import { formatDate } from '@/lib/utils/helpers'
import { toast } from 'sonner'

export default function ProfilePage() {
  const { user: firebaseUser } = useAuth()
  const [profile, setProfile]       = useState<Profile | null>(null)
  const [stats, setStats]           = useState<UserStats | null>(null)
  const [editing, setEditing]       = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [loading, setLoading]       = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const uid = firebaseUser?.uid
      if (!uid) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', uid).single()
      if (p) { setProfile(p); setDisplayName(p.display_name || ''); setAvatarUrl(p.avatar_url || '') }
      // Use Firebase displayName/photoURL as fallback
      if (!p?.display_name && firebaseUser?.displayName) setDisplayName(firebaseUser.displayName)
      if (!p?.avatar_url && firebaseUser?.photoURL) setAvatarUrl(firebaseUser.photoURL)
      try {
        const { data: s } = await supabase.rpc('get_user_stats', { p_user_id: uid })
        if (s) setStats(s)
      } catch {}
      setLoading(false)
    }
    load()
  }, [firebaseUser])

  const handleAvatarUpload = async (file: File) => {
    if (!firebaseUser?.uid) return
    setUploading(true)
    try {
      // Try Supabase Storage upload
      const ext = file.name.split('.').pop()
      const path = `avatars/${firebaseUser.uid}.${ext}`
      const { data: uploaded, error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = urlData.publicUrl

      // Update profile
      await supabase.from('profiles').upsert({ id: firebaseUser.uid, avatar_url: publicUrl })
      setAvatarUrl(publicUrl)
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : prev)
      toast.success('Profile photo updated!')
    } catch (err) {
      // Fallback: use object URL for display only (won't persist)
      const objectUrl = URL.createObjectURL(file)
      setAvatarUrl(objectUrl)
      toast.error('Could not upload to storage — showing locally only')
    }
    setUploading(false)
  }

  const saveProfile = async () => {
    if (!firebaseUser?.uid) return
    setSaving(true)
    try {
      // Update Firebase Auth profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName,
          photoURL: avatarUrl || undefined,
        })
      }
      // Update Supabase profile
      await supabase.from('profiles').upsert({
        id: firebaseUser.uid,
        display_name: displayName,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      })
      setProfile(prev => prev ? { ...prev, display_name: displayName, avatar_url: avatarUrl } : prev)
      setEditing(false)
      toast.success('Profile saved!')
    } catch (err) {
      toast.error('Failed to save profile')
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="p-6 lg:p-8 space-y-4">
      {[...Array(3)].map((_,i) => <div key={i} className="card h-32 animate-pulse bg-surface-hover"/>)}
    </div>
  )

  const displayAvatar = avatarUrl || firebaseUser?.photoURL || ''
  const initials = (displayName || firebaseUser?.email || 'U').substring(0, 2).toUpperCase()
  const aiRate   = stats ? Math.round((stats.ai_detected / Math.max(stats.total_scans, 1)) * 100) : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-text-primary">Profile</h1>
        <p className="text-text-muted text-sm mt-1">Manage your account details and preferences</p>
      </div>

      {/* Profile card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              {displayAvatar ? (
                <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display='none' }}/>
              ) : (
                <span className="text-2xl font-black text-white">{initials}</span>
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white animate-spin"/>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}/>
            <button onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary border-2 border-background flex items-center justify-center hover:bg-primary/80 transition-colors"
              title="Change photo">
              <Camera className="w-3.5 h-3.5 text-white"/>
            </button>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Display Name</label>
                  <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                    className="input-field w-full max-w-xs py-2" placeholder="Your name"/>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveProfile} disabled={saving}
                    className="btn-primary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                    Save
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-ghost px-4 py-2 text-sm">
                    <X className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-text-primary">{displayName || 'Set your name'}</h2>
                  <button onClick={() => setEditing(true)} className="text-text-muted hover:text-primary transition-colors">
                    <Edit3 className="w-4 h-4"/>
                  </button>
                </div>
                <p className="text-text-muted text-sm mt-1 truncate">{firebaseUser?.email}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                    {profile?.plan || 'Free'} Plan
                  </span>
                  <span className="text-xs text-text-muted flex items-center gap-1">
                    <Calendar className="w-3 h-3"/>
                    Joined {profile?.created_at ? formatDate(profile.created_at) : 'Recently'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Total Scans',     value: stats?.total_scans    ?? 0, color:'text-primary'   },
          { label:'AI Detected',     value: stats?.ai_detected    ?? 0, color:'text-rose'      },
          { label:'Human Content',   value: stats?.human_detected ?? 0, color:'text-emerald'   },
          { label:'AI Rate',         value: `${aiRate}%`,              color:'text-amber'      },
        ].map((s,i) => (
          <motion.div key={i} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
            className="card text-center">
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-text-muted mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Account details */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-text-primary text-sm">Account Details</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 py-3 border-b border-border">
            <Mail className="w-4 h-4 text-text-muted flex-shrink-0"/>
            <div>
              <p className="text-xs text-text-muted">Email</p>
              <p className="text-sm text-text-primary font-medium">{firebaseUser?.email || '—'}</p>
            </div>
            {firebaseUser?.emailVerified && <Check className="w-4 h-4 text-emerald ml-auto"/>}
          </div>
          <div className="flex items-center gap-3 py-3 border-b border-border">
            <Shield className="w-4 h-4 text-text-muted flex-shrink-0"/>
            <div>
              <p className="text-xs text-text-muted">Auth Provider</p>
              <p className="text-sm text-text-primary font-medium capitalize">
                {firebaseUser?.providerData?.[0]?.providerId?.replace('.com','') || 'Email/Password'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-3">
            <BarChart3 className="w-4 h-4 text-text-muted flex-shrink-0"/>
            <div>
              <p className="text-xs text-text-muted">Plan</p>
              <p className="text-sm text-text-primary font-medium">{profile?.plan === 'pro' ? 'Pro' : 'Free Forever'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
