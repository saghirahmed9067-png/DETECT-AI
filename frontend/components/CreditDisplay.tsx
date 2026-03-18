'use client'
/**
 * CreditDisplay — OPEN SOURCE MODE
 * Credits/plan system removed. Shows "Unlimited · Free" badge instead.
 */
import { Zap } from 'lucide-react'

export default function CreditDisplay() {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-text-primary">Access</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-surface-active text-primary">
          Free &amp; Unlimited
        </span>
      </div>
      <p className="text-xs text-text-muted mt-2">
        All detections are free. No limits, no subscription required.
      </p>
    </div>
  )
}
