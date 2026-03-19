'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, CheckCircle, Eye, EyeOff, User } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import Link from 'next/link'

const TOOLS = ['AI Text Detector','Image Detector','Audio Detector','Video Detector','Batch Analyser','General']
const STAR_LABELS = ['','Terrible','Poor','Average','Good','Excellent']

interface Props {
  isOpen:         boolean
  onClose:        () => void
  toolName?:      string
  initialRating?: number
}

export function ReviewModal({ isOpen, onClose, toolName, initialRating = 0 }: Props) {
  const { user }   = useAuth()
  const [rating,   setRating]   = useState(initialRating)
  const [hover,    setHover]    = useState(0)
  const [title,    setTitle]    = useState('')
  const [body,     setBody]     = useState('')
  const [tool,     setTool]     = useState(toolName ?? TOOLS[0])
  const [displayName, setDisplayName] = useState(user?.displayName || user?.email?.split('@')[0] || '')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [success,    setSuccess]      = useState(false)
  const [error,      setError]        = useState('')

  useEffect(() => { if (initialRating) setRating(initialRating) }, [initialRating])
  useEffect(() => { if (toolName) setTool(toolName) }, [toolName])
  useEffect(() => {
    if (user && !displayName) {
      setDisplayName(user.displayName || user.email?.split('@')[0] || '')
    }
  }, [user]) // eslint-disable-line

  const canSubmit = rating > 0 && title.trim().length > 0 && body.trim().length >= 30

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/reviews', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          title:        title.trim(),
          body:         body.trim(),
          toolUsed:     tool,
          displayName:  isAnonymous ? null : displayName.trim(),
          isAnonymous,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Submission failed')
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onClose() }, 2500)
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.')
    }
    setSubmitting(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

          <motion.div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
            initial={{ scale: 0.92, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 24 }}>

            {/* Top accent */}
            <div className="h-1 w-full bg-gradient-to-r from-violet-600 via-primary to-amber-500" />

            <div className="p-6">
              <button onClick={onClose}
                className="absolute top-5 right-5 p-1.5 rounded-lg hover:bg-surface-active transition-colors">
                <X className="w-4 h-4 text-text-muted" />
              </button>

              {!user ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-text-primary mb-2">Sign in to leave a review</h2>
                  <p className="text-sm text-text-muted mb-6">Share your experience to help other users.</p>
                  <Link href="/signup" className="btn-primary px-6 py-2.5 text-sm inline-flex">
                    Create free account
                  </Link>
                </div>
              ) : success ? (
                <div className="text-center py-8">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="w-16 h-16 rounded-full bg-emerald/10 border border-emerald/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald" />
                  </motion.div>
                  <h2 className="text-xl font-bold text-text-primary mb-2">Review submitted!</h2>
                  <p className="text-sm text-text-muted">Thank you for helping the community.</p>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-text-primary mb-1">Write a Review</h2>
                  <p className="text-sm text-text-muted mb-5">Your experience helps others make informed decisions.</p>

                  {/* Star rating */}
                  <div className="mb-5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2.5 block">Your Rating *</label>
                    <div className="flex items-center gap-1.5">
                      {[1,2,3,4,5].map(n => (
                        <button key={n} type="button"
                          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                          onClick={() => setRating(n)}
                          className="transition-all hover:scale-110 active:scale-95">
                          <Star className={`w-9 h-9 transition-colors ${n <= (hover || rating) ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} />
                        </button>
                      ))}
                      {(hover || rating) > 0 && (
                        <span className="ml-1 text-sm font-bold text-amber-400">{STAR_LABELS[hover || rating]}</span>
                      )}
                    </div>
                  </div>

                  {/* Tool */}
                  <div className="mb-4">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 block">Tool Used</label>
                    <select value={tool} onChange={e => setTool(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/60 transition-colors">
                      {TOOLS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Title */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Title *</label>
                      <span className="text-xs text-text-disabled">{title.length}/100</span>
                    </div>
                    <input value={title} onChange={e => setTitle(e.target.value.slice(0,100))}
                      placeholder="Summarise your experience…"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary/60 transition-colors" />
                  </div>

                  {/* Body */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Review *</label>
                      <span className={`text-xs transition-colors ${body.length > 0 && body.length < 30 ? 'text-rose' : 'text-text-disabled'}`}>{body.length}/1000</span>
                    </div>
                    <textarea value={body} onChange={e => setBody(e.target.value.slice(0,1000))}
                      placeholder="Describe your experience in detail… (min 30 characters)"
                      rows={4}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-disabled resize-none focus:outline-none focus:border-primary/60 transition-colors" />
                    {body.length > 0 && body.length < 30 && (
                      <p className="text-xs text-rose mt-1">{30 - body.length} more characters needed</p>
                    )}
                  </div>

                  {/* Identity: name or anonymous */}
                  <div className="mb-5 p-4 rounded-xl bg-surface-active border border-border/60">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3 block">Your Identity</label>
                    <div className="flex gap-3 mb-3">
                      <button type="button"
                        onClick={() => setIsAnonymous(false)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all border ${!isAnonymous ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-surface border-border text-text-muted hover:text-text-primary'}`}>
                        <User className="w-4 h-4" /> Show My Name
                      </button>
                      <button type="button"
                        onClick={() => setIsAnonymous(true)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all border ${isAnonymous ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-surface border-border text-text-muted hover:text-text-primary'}`}>
                        <EyeOff className="w-4 h-4" /> Stay Anonymous
                      </button>
                    </div>

                    {!isAnonymous ? (
                      <input value={displayName} onChange={e => setDisplayName(e.target.value.slice(0,40))}
                        placeholder="Your name (e.g. Sarah K.)"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-primary/50 transition-colors" />
                    ) : (
                      <p className="text-xs text-text-muted flex items-center gap-1.5">
                        <EyeOff className="w-3.5 h-3.5" />
                        Your review will show as <strong className="text-text-secondary">Anonymous User</strong>
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="mb-4 px-4 py-3 rounded-xl bg-rose/10 border border-rose/20 text-rose text-sm">
                      {error}
                    </div>
                  )}

                  <button onClick={handleSubmit}
                    disabled={submitting || !canSubmit}
                    className="w-full btn-primary py-3 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {submitting ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</>
                    ) : (
                      <><Star className="w-4 h-4" /> Submit Review</>
                    )}
                  </button>

                  <p className="text-center text-xs text-text-disabled mt-3">
                    Reviews are moderated and visible publicly once approved.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
