'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Zap, AlertTriangle } from 'lucide-react'

type Tool = 'text' | 'image' | 'audio' | 'video'

const LIMITS: Record<Tool, number> = {
  text: 5, image: 3, audio: 2, video: 1,
}

function getDateKey() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

function getStorageKey(tool: Tool) {
  return `aiscern_usage_${getDateKey()}_${tool}`
}

export function UsageLimitBanner({ tool, isPro = false }: { tool: Tool; isPro?: boolean }) {
  const [used, setUsed]       = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(getStorageKey(tool))
    setUsed(stored ? parseInt(stored, 10) : 0)
  }, [tool])

  // Pro users: hide banner
  if (isPro || !mounted) return null

  const limit     = LIMITS[tool]
  const remaining = Math.max(0, limit - used)
  const pct       = (used / limit) * 100
  const isOut     = remaining === 0

  const toolLabel: Record<Tool, string> = {
    text: 'text', image: 'image', audio: 'audio', video: 'video',
  }

  return (
    <div className={`rounded-xl border px-4 py-3 mb-4 ${isOut ? 'border-rose/40 bg-rose/5' : 'border-border bg-surface/60'}`}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm">
          {isOut
            ? <AlertTriangle className="w-4 h-4 text-rose shrink-0" />
            : <Zap className="w-4 h-4 text-primary shrink-0" />
          }
          <span className={`font-medium ${isOut ? 'text-rose' : 'text-text-primary'}`}>
            {isOut
              ? `Daily ${toolLabel[tool]} scan limit reached`
              : `${remaining} free ${toolLabel[tool]} scan${remaining !== 1 ? 's' : ''} remaining today`
            }
          </span>
        </div>
        <Link href="/pricing" title="View AI Detector Plans"
          className="text-xs font-semibold text-primary hover:underline shrink-0">
          Upgrade to Pro →
        </Link>
      </div>
      <div className="h-1.5 rounded-full bg-surface-active overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOut ? 'bg-rose' : pct > 60 ? 'bg-amber-400' : 'bg-primary'}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      {isOut && (
        <p className="text-xs text-text-muted mt-2">
          Limits reset at midnight UTC.{' '}
          <Link href="/signup?plan=pro" className="text-primary hover:underline" title="Start Detecting AI Content Free">
            Upgrade to Pro
          </Link>{' '}
          for unlimited scans.
        </p>
      )}
    </div>
  )
}

/** Call this after a successful scan to increment local usage */
export function incrementUsage(tool: Tool) {
  if (typeof window === 'undefined') return
  const key  = getStorageKey(tool)
  const cur  = parseInt(localStorage.getItem(key) ?? '0', 10)
  localStorage.setItem(key, String(cur + 1))
}

/** Returns true if the user has hits the daily limit */
export function isLimitReached(tool: Tool): boolean {
  if (typeof window === 'undefined') return false
  const key  = getStorageKey(tool)
  const used = parseInt(localStorage.getItem(key) ?? '0', 10)
  return used >= LIMITS[tool]
}
