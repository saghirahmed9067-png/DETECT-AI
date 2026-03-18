import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aiscern Reviews 2025 — Real User Ratings & Testimonials',
  description: 'Read verified reviews of Aiscern AI detection tools from editors, researchers, teachers and developers. See why thousands trust Aiscern to detect AI-generated content.',
  keywords: ['aiscern review','ai detector review','best ai detector 2025','aiscern testimonials','ai content detector reviews'],
  alternates: { canonical: 'https://aiscern.com/reviews' },
  openGraph: {
    title: 'Aiscern Reviews 2025 — What Users Say About Our AI Detector',
    description: 'Verified reviews from 5,000+ users. Editors, teachers and researchers share how Aiscern helps them detect AI-generated content.',
    url: 'https://aiscern.com/reviews',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
