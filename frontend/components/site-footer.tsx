'use client'
import Link from 'next/link'
import { Shield, Github, ExternalLink, Mail, Twitter } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/30 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-lg gradient-text">DETECTAI</span>
            </div>
            <p className="text-text-muted text-sm leading-relaxed mb-4">
              The world&apos;s most advanced multi-modal AI content detection platform. Detect deepfakes, AI text, synthetic audio, and more.
            </p>
            <p className="text-xs text-text-disabled">
              Built by <span className="text-text-secondary font-semibold">Anas Ali</span>
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-bold text-text-primary mb-4 uppercase tracking-wider">Product</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Detection Hub', href: '/detect' },
                { label: 'AI Chat Assistant', href: '/chat' },
                { label: 'Web Scraper', href: '/scraper' },
                { label: 'Batch Analysis', href: '/batch' },
                { label: 'Dashboard', href: '/dashboard' },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-text-muted hover:text-text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-bold text-text-primary mb-4 uppercase tracking-wider">Resources</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'GitHub', href: 'https://github.com/saghirahmed9067-png/DETECT-AI', external: true },
                { label: 'HuggingFace Dataset', href: 'https://huggingface.co/datasets/saghi776/detectai-dataset', external: true },
                { label: 'About', href: '/about' },
                { label: 'Contact', href: '/contact' },
              ].map(l => (
                <li key={l.href}>
                  {l.external ? (
                    <a href={l.href} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-text-muted hover:text-text-primary transition-colors flex items-center gap-1">
                      {l.label} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <Link href={l.href} className="text-sm text-text-muted hover:text-text-primary transition-colors">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-bold text-text-primary mb-4 uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-text-muted hover:text-text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <h4 className="text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">Connect</h4>
              <div className="flex gap-3">
                <a href="https://github.com/saghirahmed9067-png/DETECT-AI" target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center hover:border-primary/50 hover:text-primary transition-all">
                  <Github className="w-4 h-4" />
                </a>
                <a href="mailto:contact@detectai.app"
                  className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center hover:border-primary/50 hover:text-primary transition-all">
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-text-disabled text-center sm:text-left">
            © {new Date().getFullYear()} DETECTAI · Built by <span className="text-text-muted">Anas Ali</span> · MIT License
          </p>
          <div className="flex items-center gap-4 text-xs text-text-disabled">
            <Link href="/privacy" className="hover:text-text-muted transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-text-muted transition-colors">Terms</Link>
            <Link href="/about" className="hover:text-text-muted transition-colors">About</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
