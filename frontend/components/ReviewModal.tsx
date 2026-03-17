'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, CheckCircle } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import Link from 'next/link'

const TOOLS = ['AI Text Detector','Image Detector','Audio Detector','Video Detector','Batch Analyser','General']
const STAR_LABELS = ['','Terrible','Poor','Average','Good','Excellent']

interface Props {
  isOpen:        boolean
  onClose:       () => void
  toolName?:     string
  initialRating?: number
}

export function ReviewModal({ isOpen, onClose, toolName, initialRating = 0 }: Props) {
  const { user }     = useAuth()
  const [rating, setRating]   = useState(initialRating)
  const [hover, setHover]     = useState(0)
  const [title, setTitle]     = useState('')
  const [body, setBody]       = useState('')
  const [tool, setTool]       = useState(toolName ?? TOOLS[0])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => { if (initialRating) setRating(initialRating) }, [initialRating])
  useEffect(() => { if (toolName) setTool(toolName) }, [toolName])

  const handleSubmit = async () => {
    if (!rating || !title.trim() || body.trim().length < 50) return
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, title, body, toolUsed: tool }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Submission failed')
      }
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onClose() }, 2000)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    }
    setSubmitting(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

          <motion.div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}>

            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-surface-active transition-colors">
              <X className="w-4 h-4 text-text-muted" />
            </button>

            {!user ? (
              <div className="text-center py-6">
                <h2 className="text-lg font-bold text-text-primary mb-3">Sign in to review</h2>
                <p className="text-sm text-text-muted mb-6">You need an account to leave a review.</p>
                <Link href="/signup" className="btn-primary px-6 py-2.5 text-sm" title="Start Detecting AI Content Free">Create free account</Link>
              </div>
            ) : success ? (
              <div className="text-center py-6">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 rounded-full bg-emerald/10 border border-emerald/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </motion.div>
                <h2 className="text-lg font-bold text-text-primary mb-2">Thank you!</h2>
                <p className="text-sm text-text-muted">Your review has been submitted.</p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-text-primary mb-5">Write a Review</h2>

                {/* Star selector */}
                <div className="mb-5">
                  <label className="text-sm font-medium text-text-secondary mb-2 block">Your rating</label>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n}
                        onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                        onClick={() => setRating(n)}
                        className="transition-transform hover:scale-110">
                        <Star className={`w-8 h-8 transition-colors ${n <= (hover || rating) ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} />
                      </button>
                    ))}
                    {(hover || rating) > 0 && (
                      <span className="ml-2 text-sm font-semibold text-amber-400">{STAR_LABELS[hover || rating]}</span>
                    )}
                  </div>
                </div>

                {/* Tool selector */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-text-secondary mb-2 block">Tool used</label>
                  <select value={tool} onChange={e => setTool(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/50">
                    {TOOLS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                {/* Title */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-text-secondary">Title</label>
                    <span className="text-xs text-text-disabled">{title.length}/100</span>
                  </div>
                  <input value={title} onChange={e => setTitle(e.target.value.slice(0,100))}
                    placeholder="Summarise your experience…"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50" />
                </div>

                {/* Body */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-text-secondary">Review</label>
                    <span className={`text-xs ${body.length < 50 ? 'text-rose' : 'text-text-disabled'}`}>{body.length}/1000</span>
                  </div>
                  <textarea value={body} onChange={e => setBody(e.target.value.slice(0,1000))}
                    placeholder="Share your experience in detail… (min 50 characters)"
                    rows={4}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-primary/50" />
                </div>

                {error && <p className="text-xs text-rose mb-4">{error}</p>}

                <button onClick={handleSubmit}
                  disabled={submitting || !rating || !title.trim() || body.trim().length < 50}
                  className="w-full btn-primary py-3 text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2">
                  {submitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
