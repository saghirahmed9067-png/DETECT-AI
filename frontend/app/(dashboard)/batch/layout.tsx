import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Batch AI Content Detector — Analyse 20 Files at Once',
  description: 'Analyse up to 20 files simultaneously. Free batch AI detection tool.',
  alternates: { canonical: 'https://aiscern.com/batch' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
