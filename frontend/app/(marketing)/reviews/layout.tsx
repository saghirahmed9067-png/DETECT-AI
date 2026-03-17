import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aiscern Reviews — What Users Say',
  description: 'Read real user reviews of Aiscern AI detection tools.',
  alternates: { canonical: 'https://aiscern.com/reviews' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
