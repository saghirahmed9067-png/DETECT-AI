import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aiscern Pricing — Free AI Detector Plans',
  description: 'Start detecting AI content for free. Upgrade to Pro for unlimited scans. No credit card required.',
  alternates: { canonical: 'https://aiscern.com/pricing' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
