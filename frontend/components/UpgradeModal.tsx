'use client'
/**
 * UpgradeModal — OPEN SOURCE MODE
 * Subscription model removed. This is a no-op stub.
 */
interface Props {
  onClose: () => void
  feature?: string
  requiredPlan?: 'starter' | 'pro' | 'enterprise'
}
export default function UpgradeModal({ onClose }: Props) {
  // Auto-close immediately — no upgrade modal in open source mode
  if (typeof onClose === 'function') onClose()
  return null
}
