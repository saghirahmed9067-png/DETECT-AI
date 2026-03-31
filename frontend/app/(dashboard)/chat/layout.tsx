import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ARIA — AI Detection Assistant | Aiscern',
  description: 'Chat with ARIA, Aiscern\'s AI detection assistant. Ask about scan results, detection methods, AI content trends, and how to spot AI-generated media.',
  alternates: { canonical: 'https://aiscern.com/chat' },
  openGraph: {
    title: 'ARIA — AI Detection Assistant | Aiscern',
    description: 'Chat with ARIA to understand your detection results and learn about AI content identification.',
    url: 'https://aiscern.com/chat',
    images: [{ url: 'https://aiscern.com/api/og?title=ARIA+AI+Detection+Assistant&tool=Chat&color=%232563eb', width: 1200, height: 630 }],
  },
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
