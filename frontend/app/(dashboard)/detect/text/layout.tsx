import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Text Detector Free — Detect ChatGPT, Claude & Gemini',
  description: 'Instantly detect ChatGPT, Claude, Gemini and other AI-written text. 94% accuracy. Sentence-level heatmap. Free.',
  alternates: { canonical: 'https://aiscern.com/detect/text' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
