'use client'
import Link from 'next/link'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'
import { SiteNav } from '@/components/SiteNav'

const FAQS = [
  {
    q: 'How accurate is Aiscern?',
    a: 'Current benchmarked accuracy: text ~85%, image ~82%, audio ~79%, video ~76%. These are measured on public test datasets — not cherry-picked results. Accuracy varies depending on content type, length, and how heavily edited the content is. See our methodology page for full details.',
    link: { label: 'View detection methodology', href: '/methodology' },
  },
  {
    q: 'Is Aiscern really free?',
    a: 'Yes. The free tier gives you 10 scans per day on text and image detection. No credit card required. Pro plans ($12/month) unlock audio, video, higher scan limits, and PDF exports. The free tier is permanent.',
    link: { label: 'See all pricing plans', href: '/pricing' },
  },
  {
    q: 'What happens to my uploads?',
    a: 'Files you upload are processed for detection only. They are deleted from our servers within 24 hours. We do not train our models on your content without your explicit opt-in. Text inputs are not stored permanently. See our privacy policy for full details.',
    link: { label: 'Read the privacy policy', href: '/privacy' },
  },
  {
    q: 'Who built Aiscern?',
    a: 'Aiscern is built and maintained by Anas Ali, a solo founder based in Islamabad, Pakistan. It is an early-stage project — actively developed, transparent about limitations, and not backed by VC money.',
    link: { label: 'About the founder', href: '/about' },
  },
  {
    q: 'Can I use Aiscern results for legal or academic decisions?',
    a: 'No. Results are probabilistic, not definitive. Aiscern is a detection aid, not a legal or forensic instrument. Do not use results as sole evidence in legal proceedings, academic integrity cases, or any high-stakes decision. Always apply human judgment alongside the results.',
    link: null,
  },
  {
    q: 'How does Aiscern detect AI content?',
    a: 'Aiscern uses an ensemble of multiple detection models rather than relying on a single classifier. For text, this includes RoBERTa-based models plus linguistic signal analysis (perplexity, burstiness). For images, ViT models plus GAN artifact detection. For audio, wav2vec2-based models. Results are combined into a confidence score with a verdict threshold of ≥62% to label AI.',
    link: { label: 'Full methodology', href: '/methodology' },
  },
  {
    q: 'What AI generators can you detect?',
    a: 'Detection models are updated periodically. We currently detect output from major generators including ChatGPT, Claude, Gemini (text); Midjourney, DALL-E 3, Stable Diffusion (images); ElevenLabs and common TTS tools (audio). Detection of newer or fine-tuned models may be less reliable.',
    link: null,
  },
  {
    q: 'Do you have an API?',
    a: 'Yes. REST API access is available on Team ($49/month) and Enterprise (custom) plans. The API supports all four modalities. Documentation is available at /docs/api.',
    link: { label: 'View API docs', href: '/docs/api' },
  },
  {
    q: 'What if the result is "Uncertain"?',
    a: 'An "Uncertain" verdict means the ensemble models did not reach the ≥62% confidence threshold required to label content as AI, nor the ≤38% threshold to label it as human. This is not a failure — it means the content is ambiguous. Consider running a longer sample or checking a different modality.',
    link: null,
  },
  {
    q: 'Does Aiscern work on languages other than English?',
    a: 'Text detection was primarily trained on English-language data. Non-English text may produce higher false-positive rates. We are working on multilingual support. For now, treat non-English results with extra caution.',
    link: null,
  },
]

function FAQItem({ q, a, link }: { q: string; a: string; link: { label: string; href: string } | null }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border/60 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 group"
      >
        <span className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">{q}</span>
        <ChevronDown className={`w-4 h-4 text-text-muted flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-5">
              <p className="text-sm text-text-muted leading-relaxed mb-3">{a}</p>
              {link && (
                <Link href={link.href} className="text-xs text-primary hover:underline font-medium">
                  {link.label} →
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <SiteNav />

      <main className="pt-28 pb-20 max-w-2xl mx-auto px-4">

        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/8 text-primary text-xs font-semibold mb-5">
            <HelpCircle className="w-3.5 h-3.5" />
            Frequently Asked Questions
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4">
            Common <span className="gradient-text">Questions</span>
          </h1>
          <p className="text-text-muted text-base">
            Honest answers about how Aiscern works, what it can and cannot do, and how your data is handled.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface px-6 mb-10">
          {FAQS.map(item => (
            <FAQItem key={item.q} {...item} />
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm text-text-muted mb-3">Still have a question?</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:border-primary/50 hover:text-text-primary transition-all"
          >
            Contact us — we respond within 24–48 hours
          </Link>
        </div>

      </main>
      <SiteFooter />
    </div>
  )
}
