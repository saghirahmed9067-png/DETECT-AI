import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aiscern Reviews 2026 — Real User Feedback on AI Detection',
  description: 'Read honest reviews of Aiscern AI detection tools from editors, researchers, educators and developers. Real feedback, unfiltered.',
  keywords: ['aiscern review','ai detector review','best ai detector 2026','aiscern testimonials','ai content detector reviews','aiscern user feedback'],
  alternates: { canonical: 'https://aiscern.com/reviews' },
  openGraph: {
    title: 'Aiscern Reviews 2026 — Real User Feedback on AI Detection',
    description: 'Honest reviews from real users of Aiscern AI detection tools — text, image, audio and video.',
    url: 'https://aiscern.com/reviews',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
