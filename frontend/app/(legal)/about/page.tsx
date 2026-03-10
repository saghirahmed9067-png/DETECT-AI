'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Shield, Github, ExternalLink, ArrowLeft, Database, Cpu, Globe, Users, Code2, Brain, Zap, Award } from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'

const STATS = [
  { label: 'Training Sources', value: '60+', icon: Database },
  { label: 'Detection Accuracy', value: '94%', icon: Award },
  { label: 'Modalities', value: '4', icon: Cpu },
  { label: 'Dataset Samples', value: '1M+', icon: Brain },
]

const TECH = [
  { name: 'Next.js 14', cat: 'Frontend' },
  { name: 'TypeScript', cat: 'Language' },
  { name: 'Supabase', cat: 'Database' },
  { name: 'Cloudflare Workers', cat: 'Pipeline' },
  { name: 'HuggingFace', cat: 'AI Models' },
  { name: 'NVIDIA NIM', cat: 'Vision AI' },
  { name: 'Vercel', cat: 'Hosting' },
  { name: 'Tailwind CSS', cat: 'Styling' },
]

const FEATURES = [
  { icon: Globe, title: 'Web Scraper', desc: 'Analyze entire websites for AI-generated content across all media types.' },
  { icon: Brain, title: 'Multi-Modal', desc: 'Detect AI in text, images, audio, and video — all in one platform.' },
  { icon: Database, title: 'Open Dataset', desc: 'Publicly available training dataset on HuggingFace with 1M+ labeled samples.' },
  { icon: Code2, title: 'Open Source', desc: 'Full source code available on GitHub under the MIT license.' },
  { icon: Zap, title: 'Real-Time', desc: 'Detection results in seconds, powered by edge-deployed ML models.' },
  { icon: Users, title: 'Free Forever', desc: 'Core features are and will remain free. No credit card required.' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-black gradient-text">DETECTAI</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                <Shield className="w-4 h-4" /> About DETECTAI
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6">
                <span className="gradient-text">Unmask the Machine</span>
              </h1>
              <p className="text-text-muted text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto">
                DETECTAI is an open-source, multi-modal AI content detection platform built to help people
                identify AI-generated text, images, audio, and video in the age of synthetic media.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 px-4 bg-surface/20">
          <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="card text-center py-6">
                <s.icon className="w-6 h-6 text-primary mx-auto mb-3" />
                <div className="text-3xl font-black gradient-text mb-1">{s.value}</div>
                <div className="text-xs text-text-muted">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Builder / Owner */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="card border-primary/20 overflow-hidden">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Avatar placeholder — replace with real photo */}
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-primary via-secondary to-cyan flex items-center justify-center flex-shrink-0 text-white text-3xl font-black shadow-xl shadow-primary/30">
                  AA
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Creator &amp; Developer</div>
                  <h2 className="text-2xl sm:text-3xl font-black text-text-primary mb-2">Anas Ali</h2>
                  <p className="text-text-muted text-sm leading-relaxed mb-4">
                    Full-stack developer and AI engineer passionate about media authenticity and
                    responsible AI. Built DETECTAI to make state-of-the-art deepfake and AI content
                    detection accessible to everyone — for free.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <a href="https://github.com/saghirahmed9067-png/DETECT-AI" target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border hover:border-primary/50 text-sm font-medium transition-all">
                      <Github className="w-4 h-4" /> GitHub
                    </a>
                    <a href="https://huggingface.co/saghi776" target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border hover:border-primary/50 text-sm font-medium transition-all">
                      <ExternalLink className="w-4 h-4" /> HuggingFace
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-12 px-4 bg-surface/20">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-3xl font-black mb-4">Our <span className="gradient-text">Mission</span></h2>
              <p className="text-text-muted text-base leading-relaxed">
                As AI-generated media becomes indistinguishable from real content, the need for reliable
                detection tools has never been greater. DETECTAI was created to give journalists, researchers,
                educators, and everyday users the ability to verify media authenticity using the same
                cutting-edge AI techniques that create synthetic content.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-black text-center mb-10">What We <span className="gradient-text">Built</span></h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="card hover:border-primary/20 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-text-primary mb-1">{f.title}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="py-12 px-4 bg-surface/20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-black text-center mb-8">Tech <span className="gradient-text">Stack</span></h2>
            <div className="flex flex-wrap gap-2 justify-center">
              {TECH.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="px-4 py-2 rounded-full bg-surface border border-border text-sm flex items-center gap-2">
                  <span className="text-primary font-semibold">{t.name}</span>
                  <span className="text-text-disabled text-xs">{t.cat}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Open Source */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-6">
                <Code2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-black mb-4">Fully <span className="gradient-text">Open Source</span></h2>
              <p className="text-text-muted mb-6">
                DETECTAI is open source under the MIT license. Star us on GitHub, contribute, or fork it
                to build your own detection tools.
              </p>
              <a href="https://github.com/saghirahmed9067-png/DETECT-AI" target="_blank" rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2 px-6 py-3">
                <Github className="w-5 h-5" /> View on GitHub
              </a>
            </motion.div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
