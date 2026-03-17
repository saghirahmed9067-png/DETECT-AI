import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aiscern API — AI Detection REST API for Developers',
  description: 'Integrate AI detection via REST API. Free tier available.',
  alternates: { canonical: 'https://aiscern.com/docs/api' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
