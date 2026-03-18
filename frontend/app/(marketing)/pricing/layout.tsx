import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free AI Detector — No Subscription | Aiscern',
  description: 'Aiscern is 100% free forever. Detect AI-generated text, deepfakes, audio clones, and synthetic images with no limits and no credit card required.',
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
