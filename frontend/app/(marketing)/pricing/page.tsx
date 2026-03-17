'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Check, X, Zap, Shield, Building2, ChevronDown, Lock, Globe, Award } from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'
// ─── Types ────────────────────────────────────────────────────────────────────
const FEATURES_COMPARE = [
  { label: 'AI Text scans / day',       free: '5',        pro: 'Unlimited',  enterprise: 'Unlimited'  },
  { label: 'Image scans / day',         free: '3',        pro: '100',        enterprise: 'Unlimited'  },
  { label: 'Audio scans / day',         free: '2',        pro: '50',         enterprise: 'Unlimited'  },
  { label: 'Video scans / day',         free: '1',        pro: '20',         enterprise: 'Unlimited'  },
  { label: 'Batch analysis',            free: false,      pro: '20 files',   enterprise: 'Unlimited'  },
  { label: 'Sentence-level heatmap',    free: false,      pro: true,         enterprise: true         },
  { label: 'PDF export reports',        free: false,      pro: true,         enterprise: true         },
  { label: 'API access',                free: false,      pro: '1k calls/mo',enterprise: 'Unlimited'  },
  { label: 'Text limit',                free: '50 words', pro: 'Unlimited',  enterprise: 'Unlimited'  },
  { label: 'Custom model fine-tuning',  free: false,      pro: false,        enterprise: true         },
  { label: 'SSO / SAML',               free: false,      pro: false,        enterprise: true         },
  { label: 'White-label option',        free: false,      pro: false,        enterprise: true         },
  { label: 'Dedicated account manager',free: false,      pro: false,        enterprise: true         },
  { label: '99.9% SLA',                free: false,      pro: false,        enterprise: true         },
  { label: 'Invoice billing',          free: false,      pro: false,        enterprise: true         },
  { label: 'Support',                  free: 'Community', pro: 'Priority email', enterprise: 'Dedicated' },
]

const FAQS = [
  { q: 'Can I cancel anytime?',             a: 'Yes — cancel from your settings at any time, no questions asked. You keep access until the end of your billing period.' },
  { q: 'What counts as one scan?',          a: 'One file or text submission per detection request counts as one scan.' },
  { q: 'Do unused scans roll over?',        a: 'No — limits reset daily at midnight UTC.' },
  { q: 'Is there a student discount?',      a: 'Yes — email contact@aiscern.com with your .edu address for 50% off Pro.' },
  { q: 'What payment methods do you accept?', a: 'Credit/debit card via Stripe. Crypto payments coming soon.' },
  { q: 'How accurate is detection?',        a: '94% for text, 97% for images, 91% for audio, and 88% for video — validated against our 285,000+ sample dataset.' },
]

function Cell({ val }: { val: string | boolean }) {
  if (val === true)  return <Check className="w-5 h-5 text-emerald-400 mx-auto" />
  if (val === false) return <X    className="w-4 h-4 text-zinc-600 mx-auto" />
  return <span className="text-sm text-zinc-300 font-medium">{val}</span>
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const proMonthly  = 12
  const proAnnual   = 9

  return (
    <div className="min-h-screen bg-background text-text-primary">

      {/* ── NAV stub ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" title="Aiscern — Free AI Content Detector">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Aiscern AI Detection Platform Logo" width={36} height={36} className="rounded-lg" />
            <span className="font-black text-xl gradient-text">Aiscern</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-text-muted hover:text-text-primary transition-colors">← Home</Link>
            <Link href="/signup" className="btn-primary px-4 py-2 text-sm" title="Start Detecting AI Content Free">Start Free</Link>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-20 px-4">
        <div className="max-w-6xl mx-auto">

          {/* ── Header ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-black mb-4">
              Aiscern <span className="gradient-text">Pricing</span>
            </h1>
            <p className="text-text-muted text-lg max-w-xl mx-auto mb-8">
              Start detecting AI content for free. Upgrade when you need more.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-3 p-1 rounded-xl border border-border bg-surface">
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${!annual ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-primary'}`}
              >Monthly</button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${annual ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-primary'}`}
              >
                Annual
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">25% off</span>
              </button>
            </div>
          </motion.div>

          {/* ── Plans ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">

            {/* Free */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-surface/60 p-6 flex flex-col">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-zinc-400" />
                  </div>
                  <span className="font-bold text-lg text-text-primary">Free</span>
                </div>
                <div className="mb-2">
                  <span className="text-4xl font-black text-text-primary">$0</span>
                  <span className="text-text-muted text-sm ml-1">/month</span>
                </div>
                <p className="text-sm text-text-muted">No credit card required</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['5 AI text scans/day','3 image scans/day','2 audio scans/day','1 video scan/day','Basic confidence score','50-word text limit','Community support'].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="w-full text-center py-3 rounded-xl border border-border text-text-primary font-semibold hover:border-primary/50 hover:text-primary transition-all text-sm" title="Start Detecting AI Content Free">
                Start Free
              </Link>
            </motion.div>

            {/* Pro — highlighted */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-2xl border-2 border-primary bg-primary/5 p-6 flex flex-col relative shadow-xl shadow-primary/20">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-white text-xs font-bold px-4 py-1 rounded-full shadow">Most Popular</span>
              </div>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-bold text-lg text-text-primary">Pro</span>
                </div>
                <div className="mb-1">
                  <AnimatePresence mode="wait">
                    <motion.div key={annual ? 'annual' : 'monthly'} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                      {annual ? (
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-text-primary">${proAnnual}</span>
                          <span className="text-text-muted text-sm">/month</span>
                          <span className="text-sm text-zinc-500 line-through">${proMonthly}</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-text-primary">${proMonthly}</span>
                          <span className="text-text-muted text-sm">/month</span>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
                {annual && <p className="text-xs text-emerald-400 font-semibold">Billed ${proAnnual * 12}/year · Save ${(proMonthly - proAnnual) * 12}</p>}
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Unlimited AI text scans','100 image scans/day','50 audio scans/day','20 video scans/day','Batch analysis (20 files)','Sentence-level heatmap','PDF export reports','API access (1,000 calls/month)','Priority email support'].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup?plan=pro" className="w-full text-center py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all text-sm shadow-lg shadow-primary/30" title="Start Detecting AI Content Free">
                Start Pro Trial
              </Link>
            </motion.div>

            {/* Enterprise */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="rounded-2xl border border-amber/30 bg-amber/5 p-6 flex flex-col relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-amber-500 text-black text-xs font-bold px-4 py-1 rounded-full shadow">Best Value</span>
              </div>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-amber/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-amber-400" />
                  </div>
                  <span className="font-bold text-lg text-text-primary">Enterprise</span>
                </div>
                <div className="mb-2">
                  <span className="text-4xl font-black text-text-primary">Custom</span>
                </div>
                <p className="text-sm text-text-muted">Tailored to your team size</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Everything in Pro','Unlimited all modalities','Unlimited API calls','Custom model fine-tuning','Dedicated account manager','99.9% SLA guarantee','SSO / SAML','White-label option','Invoice billing'].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                    <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/contact" className="w-full text-center py-3 rounded-xl border border-amber/40 text-amber-400 font-semibold hover:bg-amber/10 transition-all text-sm" title="Contact Aiscern Sales">
                Contact Sales
              </Link>
            </motion.div>
          </div>

          {/* ── Trust badges ── */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mb-16">
            {[
              { icon: Lock,   label: '256-bit SSL'     },
              { icon: Shield, label: 'GDPR Compliant'  },
              { icon: Award,  label: 'SOC2 Pending'    },
              { icon: Globe,  label: '99.9% Uptime'    },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-text-muted px-4 py-2 rounded-xl border border-border bg-surface/50">
                <Icon className="w-4 h-4 text-primary" />
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </div>

          {/* ── Feature comparison table ── */}
          <div className="mb-16 overflow-x-auto">
            <h2 className="text-2xl font-black text-center mb-8">Full Feature <span className="gradient-text">Comparison</span></h2>
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-bold text-text-muted w-1/2">Feature</th>
                  <th className="text-center py-3 px-4 text-sm font-bold text-zinc-400">Free</th>
                  <th className="text-center py-3 px-4 text-sm font-bold text-primary">Pro</th>
                  <th className="text-center py-3 px-4 text-sm font-bold text-amber-400">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES_COMPARE.map((row, i) => (
                  <tr key={i} className={`border-b border-border/40 ${i % 2 === 0 ? 'bg-surface/20' : ''}`}>
                    <td className="py-3 px-4 text-sm text-text-secondary">{row.label}</td>
                    <td className="py-3 px-4 text-center"><Cell val={row.free} /></td>
                    <td className="py-3 px-4 text-center"><Cell val={row.pro} /></td>
                    <td className="py-3 px-4 text-center"><Cell val={row.enterprise} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── FAQ ── */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-center mb-8">Frequently Asked <span className="gradient-text">Questions</span></h2>
            <div className="space-y-3">
              {FAQS.map((faq, i) => (
                <motion.div key={i} className="rounded-xl border border-border bg-surface/60 overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="font-semibold text-text-primary text-sm">{faq.q}</span>
                    <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-4 h-4 text-text-muted shrink-0 ml-3" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-4 text-sm text-text-muted leading-relaxed">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
