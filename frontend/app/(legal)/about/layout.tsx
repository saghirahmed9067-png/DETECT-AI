import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Aiscern — AI Detection Built on 285k+ Samples',
  description: 'Open-source AI detection platform. 285,000+ training samples from 60+ datasets. Built by Anas Ali.',
  alternates: { canonical: 'https://aiscern.com/about' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
