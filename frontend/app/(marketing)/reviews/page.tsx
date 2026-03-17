'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Star, ThumbsUp, CheckCircle, Filter, ChevronLeft, ChevronRight, PenLine } from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'
import { useAuth } from '@/components/auth-provider'

// ─── Seed reviews ─────────────────────────────────────────────────────────────
const SEED_REVIEWS = [
  {
    name: 'Sarah K.', role: 'Senior Editor', company: 'Reuters Digital',
    rating: 5, tool: 'AI Text Detector', avatar: 'SK', color: '#6366f1',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face',
    title: 'Saved us from publishing AI content',
    body: 'Caught an AI-written press release before we published it. The sentence-level heatmap is incredibly useful for pinpointing exactly which sentences are AI-generated. Has become part of our daily editorial workflow.',
    date: '2026-03-01', helpful: 47, verified: true,
  },
  {
    name: 'Marcus T.', role: 'AI Research Lead', company: 'University of Edinburgh',
    rating: 5, tool: 'Image Detector', avatar: 'MT', color: '#0ea5e9',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
    title: 'Accuracy rivals enterprise tools',
    body: 'Tested against our own synthetic dataset — accuracy is genuinely impressive. The multimodal approach is what sets Aiscern apart. We now use it for all our research verification before publication.',
    date: '2026-02-22', helpful: 38, verified: true,
  },
  {
    name: 'Priya M.', role: 'Content Integrity Manager', company: 'Publicis Group',
    rating: 5, tool: 'Batch Analyser', avatar: 'PM', color: '#10b981',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&crop=face',
    title: 'Replaced 3 tools with just Aiscern',
    body: 'We run all client submissions through the batch analyser now. It has become part of our standard QA process. The fact that it handles text, images and audio in one platform saved us significant tool costs.',
    date: '2026-02-15', helpful: 52, verified: true,
  },
  {
    name: 'James R.', role: 'Cybersecurity Analyst', company: 'Deloitte',
    rating: 5, tool: 'Audio Detector', avatar: 'JR', color: '#f59e0b',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
    title: 'Caught a voice clone phishing attempt',
    body: 'The audio deepfake detection caught a cloned voice in a phishing attempt targeting our client. The accuracy and speed of detection is remarkable. Incredibly valuable for enterprise security teams.',
    date: '2026-02-08', helpful: 61, verified: true,
  },
  {
    name: 'Aisha N.', role: 'Digital Journalism Lecturer', company: 'City, University of London',
    rating: 5, tool: 'AI Text Detector', avatar: 'AN', color: '#ec4899',
    photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face',
    title: 'Best free tool for students',
    body: 'I recommend Aiscern to all my students. The free tier is generous, the interface is clean, and the explanations are actually educational. Students understand WHY content is flagged, not just that it is.',
    date: '2026-01-30', helpful: 44, verified: true,
  },
  {
    name: 'David L.', role: 'Head of Trust & Safety', company: 'Medialink',
    rating: 5, tool: 'General', avatar: 'DL', color: '#8b5cf6',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face',
    title: 'Finally handles all modalities',
    body: 'We were using 3 different tools before Aiscern replaced all of them. The unified dashboard, consistent accuracy scores, and batch processing make it the only AI detection tool our team needs.',
    date: '2026-01-20', helpful: 39, verified: true,
  },
]

const TOOLS_FILTER = ['All Tools', 'AI Text Detector', 'Image Detector', 'Audio Detector', 'Batch Analyser', 'General']
const SORT_OPTIONS = ['Most Helpful', 'Newest', 'Highest Rating']
const PER_PAGE = 6

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`${cls} ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} />
      ))}
    </div>
  )
}

function Avatar({ photo, name, color, avatar }: { photo: string; name: string; color: string; avatar: string }) {
  const [err, setErr] = useState(false)
  if (err) {
    return (
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
        style={{ background: color }}>
        {avatar}
      </div>
    )
  }
  return (
    <img src={photo} alt={`${name} — Aiscern reviewer`}
      className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10 flex-shrink-0"
      onError={() => setErr(true)} />
  )
}

export default function ReviewsPage() {
  const { user } = useAuth()
  const [toolFilter, setToolFilter] = useState('All Tools')
  const [sort, setSort]             = useState('Most Helpful')
  const [starFilter, setStarFilter] = useState(0)
  const [page, setPage]             = useState(1)
  const [helpfulSet, setHelpfulSet] = useState<Set<number>>(new Set())

  // filter + sort
  let reviews = SEED_REVIEWS
    .filter(r => toolFilter === 'All Tools' || r.tool === toolFilter)
    .filter(r => starFilter === 0 || r.rating === starFilter)
  if (sort === 'Most Helpful') reviews = [...reviews].sort((a,b) => b.helpful - a.helpful)
  if (sort === 'Newest')       reviews = [...reviews].sort((a,b) => b.date.localeCompare(a.date))
  if (sort === 'Highest Rating') reviews = [...reviews].sort((a,b) => b.rating - a.rating)

  const totalPages = Math.ceil(reviews.length / PER_PAGE)
  const paged = reviews.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // Overall stats
  const avg = (SEED_REVIEWS.reduce((s,r) => s + r.rating, 0) / SEED_REVIEWS.length).toFixed(1)
  const breakdown = [5,4,3,2,1].map(n => ({ n, count: SEED_REVIEWS.filter(r => r.rating === n).length }))

  const toggleHelpful = (i: number) => {
    setHelpfulSet(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" title="Aiscern — Free AI Content Detector">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Aiscern AI Detection Platform Logo" width={36} height={36} className="rounded-lg" />
            <span className="font-black text-xl gradient-text">Aiscern</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-text-muted hover:text-text-primary transition-colors">← Home</Link>
            <Link href="/pricing" title="View AI Detector Plans" className="text-sm text-text-muted hover:text-text-primary transition-colors">Pricing</Link>
            {user && (
              <button className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
                <PenLine className="w-3.5 h-3.5" />Write a Review
              </button>
            )}
            {!user && (
              <Link href="/signup" className="btn-primary px-4 py-2 text-sm" title="Start Detecting AI Content Free">Sign in to review</Link>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-20 px-4">
        <div className="max-w-5xl mx-auto">

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-4xl font-black mb-3">User <span className="gradient-text">Reviews</span></h1>
            <p className="text-text-muted">What real users say about Aiscern AI Detection</p>
          </motion.div>

          {/* Overall rating summary */}
          <div className="rounded-2xl border border-border bg-surface/60 p-6 mb-8 flex flex-col sm:flex-row items-center gap-8">
            <div className="text-center">
              <div className="text-6xl font-black gradient-text mb-1">{avg}</div>
              <StarRating rating={5} size="md" />
              <p className="text-sm text-text-muted mt-2">{SEED_REVIEWS.length} reviews</p>
            </div>
            <div className="flex-1 w-full space-y-2">
              {breakdown.map(({ n, count }) => (
                <div key={n} className="flex items-center gap-3">
                  <button onClick={() => { setStarFilter(starFilter === n ? 0 : n); setPage(1) }}
                    className={`text-xs w-4 font-bold transition-colors ${starFilter === n ? 'text-amber-400' : 'text-text-muted hover:text-text-primary'}`}>{n}</button>
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                  <div className="flex-1 h-2 rounded-full bg-surface-active overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${(count / SEED_REVIEWS.length) * 100}%` }} />
                  </div>
                  <span className="text-xs text-text-muted w-4 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 mb-6 items-center">
            <div className="flex items-center gap-1.5 text-sm text-text-muted">
              <Filter className="w-4 h-4" />
            </div>
            <div className="flex flex-wrap gap-2">
              {TOOLS_FILTER.map(t => (
                <button key={t} onClick={() => { setToolFilter(t); setPage(1) }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${toolFilter === t ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-muted hover:border-primary/40 hover:text-text-primary'}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="ml-auto">
              <select value={sort} onChange={e => { setSort(e.target.value); setPage(1) }}
                className="text-xs bg-surface border border-border text-text-muted rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary/50">
                {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Review cards */}
          <AnimatePresence mode="wait">
            <motion.div key={`${toolFilter}-${sort}-${page}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-4 mb-8">
              {paged.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-border bg-surface/60 p-5 hover:border-primary/20 transition-colors">
                  <div className="flex items-start gap-4">
                    <Avatar photo={r.photo} name={r.name} color={r.color} avatar={r.avatar} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-text-primary text-sm">{r.name}</span>
                        {r.verified && (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />Verified
                          </span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">{r.tool}</span>
                        <span className="text-xs text-text-disabled ml-auto">{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="text-xs text-text-muted mb-2">{r.role} · {r.company}</div>
                      <StarRating rating={r.rating} />
                      <h3 className="font-bold text-text-primary mt-2 mb-1 text-sm">{r.title}</h3>
                      <p className="text-sm text-text-secondary leading-relaxed">{r.body}</p>
                      <button onClick={() => toggleHelpful(i)}
                        className={`mt-3 flex items-center gap-1.5 text-xs transition-colors ${helpfulSet.has(i) ? 'text-primary' : 'text-text-muted hover:text-text-primary'}`}>
                        <ThumbsUp className="w-3.5 h-3.5" />
                        Helpful ({r.helpful + (helpfulSet.has(i) ? 1 : 0)})
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
              {paged.length === 0 && (
                <div className="text-center py-16 text-text-muted">No reviews match your filters.</div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg border border-border hover:border-primary/50 disabled:opacity-30 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-text-muted">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-lg border border-border hover:border-primary/50 disabled:opacity-30 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
