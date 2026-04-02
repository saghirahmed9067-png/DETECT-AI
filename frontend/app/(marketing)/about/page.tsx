import Link from 'next/link'
import { SiteNav }    from '@/components/SiteNav'
import { SiteFooter } from '@/components/site-footer'
import { Shield, Brain, Zap, Globe, Users, GitBranch } from 'lucide-react'

export const metadata = {
  title: 'About Aiscern — Free AI Content Detection',
  description: 'Aiscern is a free multi-modal AI content detection platform. Detect AI-generated text, images, audio, and video — built in Islamabad, Pakistan.',
  openGraph: { title: 'About Aiscern', url: 'https://aiscern.com/about' },
}

const STATS = [
  { label: 'Modalities',      value: '4',    sub: 'text, image, audio, video' },
  { label: 'Detection models', value: '8+',  sub: 'in the ensemble pipeline'  },
  { label: 'Always free',     value: '100%', sub: 'no paywalls, no limits'    },
  { label: 'Accuracy',        value: '~85%', sub: 'on text; 82% images'       },
]

const VALUES = [
  {
    icon: Shield,
    title: 'Transparency first',
    desc:  'We publish our accuracy benchmarks, known limitations, and detection methodology openly. You should know exactly what our scores mean before acting on them.',
  },
  {
    icon: Brain,
    title: 'Ensemble over single models',
    desc:  'No single signal reliably catches all AI content. We combine perplexity analysis, frequency fingerprints, geometric checks, and trained classifiers into one weighted verdict.',
  },
  {
    icon: Zap,
    title: 'Free forever',
    desc:  'AI detection tools should not be locked behind subscriptions. Aiscern is free for individuals, educators, journalists, and researchers — no account required for basic detection.',
  },
  {
    icon: Globe,
    title: 'Built for everyone',
    desc:  'Developed in Islamabad, Pakistan. We believe access to AI literacy tools should not depend on geography or budget.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <SiteNav />

      <main className="pt-24 pb-20 max-w-4xl mx-auto px-4">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-semibold mb-4">
            <Users className="w-3 h-3" /> About us
          </div>
          <h1 className="text-3xl sm:text-5xl font-black mb-4">
            AI detection that's <span className="gradient-text">actually free</span>
          </h1>
          <p className="text-text-muted text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Aiscern is a multi-modal AI content detection platform built to give everyone access to the tools they need to navigate a world full of synthetic media.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
          {STATS.map(s => (
            <div key={s.label} className="rounded-2xl border border-border bg-surface p-5 text-center">
              <p className="text-3xl font-black gradient-text mb-1">{s.value}</p>
              <p className="text-xs font-bold text-text-primary mb-0.5">{s.label}</p>
              <p className="text-xs text-text-disabled">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Mission */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 mb-14">
          <h2 className="text-xl font-black mb-4">Our mission</h2>
          <p className="text-text-muted leading-relaxed mb-4">
            AI-generated content is proliferating faster than the tools to understand it. Deepfakes influence elections. Synthetic text floods classrooms. AI audio clones voices of public figures. The people most affected by this — journalists, teachers, researchers, everyday users — often have the least access to reliable detection tools.
          </p>
          <p className="text-text-muted leading-relaxed">
            Aiscern exists to change that. We build production-grade AI detection for every modality and make it freely accessible. We also commit to being honest about what detection can and cannot do — publishing our accuracy numbers, limitations, and methodology openly rather than overselling what AI detection is capable of.
          </p>
        </div>

        {/* Values */}
        <div className="mb-14">
          <h2 className="text-xl font-black mb-6 text-center">What we stand for</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-bold text-text-primary">{title}</h3>
                </div>
                <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <div className="rounded-2xl border border-border bg-surface p-6 mb-14">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="w-5 h-5 text-primary" />
            <h2 className="font-black text-lg">Built with</h2>
          </div>
          <p className="text-text-muted text-sm leading-relaxed mb-4">
            Aiscern is built on Next.js 15, TypeScript, Tailwind CSS, Supabase, Cloudflare R2, and a pipeline of HuggingFace inference models backed by NVIDIA NIM for GPU acceleration. Detection models are an ensemble of fine-tuned classifiers trained on public benchmarks and continuously updated as new generators emerge.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Next.js 15', 'TypeScript', 'Supabase', 'Cloudflare R2', 'HuggingFace', 'NVIDIA NIM', 'Inngest', 'Vercel'].map(t => (
              <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-surface-2 border border-border/50 text-text-muted">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-black">Try it free</h2>
          <p className="text-text-muted">No account needed. All four modalities, free forever.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/detect/text"  className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors">
              Detect Text →
            </Link>
            <Link href="/detect/image" className="px-5 py-2.5 rounded-xl border border-border bg-surface font-bold text-sm hover:border-primary/30 transition-colors">
              Detect Images
            </Link>
            <Link href="/methodology"  className="px-5 py-2.5 rounded-xl border border-border bg-surface font-bold text-sm hover:border-primary/30 transition-colors">
              How It Works
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
