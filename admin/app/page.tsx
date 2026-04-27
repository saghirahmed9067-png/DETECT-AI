'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react'

// Aiscern logo SVG
function AiscernLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="url(#lg)" />
      <path d="M20 8L30 28H10L20 8Z" fill="white" fillOpacity="0.92" />
      <circle cx="20" cy="25" r="3.5" fill="white" fillOpacity="0.6" />
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7c3aed" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function LoginPage() {
  const [pw, setPw]         = useState('')
  const [show, setShow]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const router              = useRouter()

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pw) return
    setLoading(true); setError('')
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    if (res.ok) {
      router.push('/dashboard')
    } else {
      setError('Invalid admin password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.08) 0%, #07070d 60%)' }}>
      <div className="w-full max-w-[360px]">

        {/* Logo + branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <AiscernLogo size={44} />
            <div className="text-left">
              <div className="text-xl font-black text-white tracking-tight">Aiscern</div>
              <div className="text-xs text-[#4a5568] font-medium tracking-widest uppercase">Admin Panel</div>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#1e1e35] bg-[#0d0d18] text-[11px] text-[#64748b]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] live-dot" />
            admin.aiscern.com · Restricted Access
          </div>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-[#1e1e35] bg-[#0d0d18] p-7 shadow-2xl shadow-black/40">
          <h2 className="text-base font-bold text-white mb-0.5">Sign in to Admin</h2>
          <p className="text-xs text-[#4a5568] mb-6">Authorized personnel only.</p>

          {error && (
            <div className="flex items-center gap-2 bg-[#f43f5e10] border border-[#f43f5e30] text-[#f87171] text-xs px-3 py-2.5 rounded-xl mb-5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#64748b] mb-1.5 uppercase tracking-wide">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2a2a45]" />
                <input
                  type={show ? 'text' : 'password'}
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoFocus
                  className="w-full bg-[#07070d] border border-[#1e1e35] rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder:text-[#2a2a45] focus:outline-none focus:border-[#7c3aed] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2a2a45] hover:text-[#64748b] transition-colors"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !pw}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-[0.98]"
              style={{ background: loading ? '#3b1d8a' : 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
            >
              {loading ? (
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-white animate-bounce"
                      style={{ animationDelay: `${i * 0.12}s` }} />
                  ))}
                </div>
              ) : (
                <>Enter Admin Panel <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#2a2a45] mt-5">
          All access attempts are logged and audited.
        </p>
      </div>
    </div>
  )
}
