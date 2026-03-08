'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import {
  Shield, Brain, Eye, Mic, FileText, Globe, Zap, BarChart3,
  ArrowRight, Check, Star, Users, Activity, Lock, Cpu,
  ChevronRight, Play, Github, Twitter, Sparkles, TrendingUp
} from 'lucide-react'

const features = [
  { icon: Eye,       title: 'Image Detection',  desc: 'Detects GAN artifacts, diffusion fingerprints, pixel-level forensics and metadata anomalies with 94% accuracy.',     color: 'text-primary',   bg: 'bg-primary/10'   },
  { icon: Zap,       title: 'Video Analysis',   desc: 'Frame-by-frame deepfake detection, temporal consistency checks, and face-swap boundary analysis.',                   color: 'text-secondary', bg: 'bg-secondary/10' },
  { icon: Mic,       title: 'Audio Detection',  desc: 'Identifies TTS synthesis, voice cloning artifacts, prosody patterns, and spectral irregularities.',                  color: 'text-cyan',      bg: 'bg-cyan/10'      },
  { icon: FileText,  title: 'Text Analysis',    desc: 'RoBERTa-powered classifier with perplexity scoring, burstiness analysis, and sentence-level AI probability maps.',   color: 'text-emerald',   bg: 'bg-emerald/10'   },
  { icon: Globe,     title: 'Web Scraper',       desc: 'Paste any URL to instantly scrape and analyze the full page content for AI-generated text and media.',             color: 'text-amber',     bg: 'bg-amber/10'     },
  { icon: BarChart3, title: 'Analytics',         desc: 'Real-time dashboard with scan history, detection trends, model accuracy metrics and export capabilities.',         color: 'text-rose',      bg: 'bg-rose/10'      },
]

const steps = [
  { n: '01', title: 'Upload or Paste',   desc: 'Drop any image, video, audio file — or paste text and a URL for instant web analysis.' },
  { n: '02', title: 'Deep AI Scan',      desc: 'Free HuggingFace models scan for 20+ detection signals in seconds with no data stored.' },
  { n: '03', title: 'Get Full Report',   desc: 'Confidence score, signal-by-signal breakdown, sentence-level heatmap, and verdict.' },
  { n: '04', title: 'Export & Share',    desc: 'Save your scan history, download reports, or share results via a unique link.' },
]

const stats = [
  { value: '94%',  label: 'Text Detection Accuracy',  icon: Brain   },
  { value: '4',    label: 'Media Types Supported',     icon: Cpu     },
  { value: '100%', label: 'Free — No Hidden Cost',     icon: Lock    },
  { value: '∞',    label: 'Scans Per Account',         icon: Activity},
]

const testimonials = [
  { text: 'Caught an AI-written press release before we published it. Saved us massive embarrassment.', name: 'Sarah K.', role: 'Editor, News Outlet' },
  { text: 'The text analyzer is scary accurate. I tested it on GPT-4 output and it nailed it every time.', name: 'Marcus T.', role: 'AI Researcher' },
  { text: 'Best free deepfake detector I have found. Clean UI and actually explains WHY it flagged content.', name: 'Priya M.', role: 'Content Creator' },
]

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: ['Unlimited scans', 'All 4 media types', 'Scan history', 'Web scraper', 'HF pipeline access'],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'Coming Soon',
    period: '',
    features: ['Everything in Free', 'Batch processing (100 files)', 'API access', 'Priority inference', 'PDF export reports', 'Team workspace'],
    cta: 'Join Waitlist',
    highlight: true,
  },
]

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isLoggedIn = !loading && !!user

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* NAV */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'glass border-b border-border/50 shadow-lg shadow-black/10' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">DETECTAI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-text-muted">
            <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
            <a href="#how"      className="hover:text-text-primary transition-colors">How it Works</a>
            <a href="#pricing"  className="hover:text-text-primary transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link href="/dashboard"
                className="btn-primary text-sm py-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Go to Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link href="/login"  className="btn-ghost text-sm py-2">Sign In</Link>
                <Link href="/signup" className="btn-primary text-sm py-2">Get Started Free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-32 pb-24 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,80,255,0.15),transparent)] pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">100% Free · No Credit Card · Open Detection</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-text-primary mb-6 leading-tight tracking-tight"
          >
            Detect AI Content<br />
            <span className="gradient-text">Before It Spreads</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-text-muted max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Analyze images, videos, audio, and text for AI generation — powered by free HuggingFace models.
            No subscription, no limits, no excuses.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            {isLoggedIn ? (
              <Link href="/dashboard"
                className="btn-primary px-8 py-4 text-base font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/25">
                Continue to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link href="/signup"
                  className="btn-primary px-8 py-4 text-base font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/25">
                  Start Detecting Free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/login"
                  className="btn-ghost px-8 py-4 text-base font-semibold flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" /> Sign In
                </Link>
              </>
            )}
          </motion.div>

          {/* Logged in badge */}
          {isLoggedIn && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="mt-6 inline-flex items-center gap-2 text-sm text-text-muted">
              <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
              Signed in as <span className="text-text-secondary font-medium">{user?.email}</span>
            </motion.div>
          )}
        </div>

        {/* Hero stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-3xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-black gradient-text mb-1">{s.value}</div>
              <div className="text-xs text-text-muted">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-text-primary mb-4">Everything You Need to<br /><span className="gradient-text">Unmask AI Content</span></h2>
            <p className="text-text-muted max-w-xl mx-auto">Six powerful tools, one platform, zero cost. Built on state-of-the-art open-source models.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="card card-hover group">
                <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className={`w-6 h-6 ${f.color}`} />
                </div>
                <h3 className="font-bold text-text-primary mb-2">{f.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Try it now <ChevronRight className="w-3 h-3" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 px-6 bg-surface/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-text-primary mb-4">How It <span className="gradient-text">Works</span></h2>
            <p className="text-text-muted">From upload to verdict in under 10 seconds.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-gradient-to-r from-border to-transparent" />
                )}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-black text-sm">{s.n}</span>
                </div>
                <h3 className="font-bold text-text-primary mb-2">{s.title}</h3>
                <p className="text-sm text-text-muted">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-text-primary mb-4">Trusted by <span className="gradient-text">Researchers & Creators</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="card">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-amber text-amber" />)}
                </div>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                  <p className="text-xs text-text-muted">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-6 bg-surface/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-text-primary mb-4">Simple, <span className="gradient-text">Transparent Pricing</span></h2>
            <p className="text-text-muted">No tricks. No paywalls. Full platform free forever.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`card ${plan.highlight ? 'border-primary/40 bg-primary/5 relative overflow-hidden' : ''}`}>
                {plan.highlight && (
                  <div className="absolute top-4 right-4 bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded-full">Coming Soon</div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-text-primary mb-1">{plan.name}</h3>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black gradient-text">{plan.price}</span>
                    {plan.period && <span className="text-text-muted text-sm mb-1">/{plan.period}</span>}
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-text-secondary">
                      <Check className="w-4 h-4 text-emerald flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isLoggedIn ? (
                  <Link href="/dashboard" className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all
                    ${plan.highlight ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'btn-primary'}`}>
                    Go to Dashboard
                  </Link>
                ) : (
                  <Link href={plan.highlight ? '#' : '/signup'} className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all
                    ${plan.highlight ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'btn-primary'}`}>
                    {plan.cta}
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/30">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-black text-text-primary mb-4">
              Start Detecting AI Content <span className="gradient-text">Right Now</span>
            </h2>
            <p className="text-text-muted mb-10">Join researchers, journalists, and creators who trust DETECTAI to verify content authenticity.</p>
            {isLoggedIn ? (
              <Link href="/dashboard" className="btn-primary px-10 py-4 text-base font-semibold inline-flex items-center gap-2 shadow-lg shadow-primary/25">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link href="/signup" className="btn-primary px-10 py-4 text-base font-semibold inline-flex items-center gap-2 shadow-lg shadow-primary/25">
                Create Free Account <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold gradient-text">DETECTAI</span>
          </div>
          <p className="text-xs text-text-disabled">Built with HuggingFace, Firebase, Supabase & Next.js · 100% Free</p>
          <div className="flex items-center gap-4 text-text-muted">
            <a href="https://github.com/saghirahmed9067-png/DETECT-AI" target="_blank" rel="noopener noreferrer"
              className="hover:text-text-primary transition-colors">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
