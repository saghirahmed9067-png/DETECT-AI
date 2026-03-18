import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Contact Aiscern — AI Detection Support & Feedback',
  description: 'Contact the Aiscern team for support, bug reports, API access or partnership inquiries. We respond within 24 hours.',
  alternates: { canonical: 'https://aiscern.com/contact' },
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
