import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Detection Assistant — Ask Anything About AI Content',
  description: 'Ask our AI assistant anything about detecting synthetic media and deepfakes.',
  alternates: { canonical: 'https://aiscern.com/chat' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
