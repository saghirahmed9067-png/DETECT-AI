import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Aiscern — Free Multi-Modal AI Content Detector',
  description: 'Aiscern is a free, multi-modal AI detection platform built on 413,000+ verified training samples from 87 datasets. Detect AI text, deepfakes, voice cloning and synthetic video — free for everyone.',
  keywords: ['about aiscern','ai detection platform','how ai detector works','aiscern accuracy','ai content detection technology'],
  alternates: { canonical: 'https://aiscern.com/about' },
  openGraph: {
    title: 'About Aiscern — Built on 413,000+ Verified AI Training Samples',
    description: 'How we built a free multi-modal AI detector. 413k+ verified samples across 87 datasets covering text, images, audio and video. Free for everyone.',
    url: 'https://aiscern.com/about',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
