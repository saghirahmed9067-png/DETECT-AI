import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Detection API — Free REST API for Developers | Aiscern',
  description: 'Integrate AI content detection into your app via REST API. Detect AI text, deepfake images, voice cloning and synthetic video. Free to use. JSON responses. No rate limits on free tier.',
  keywords: [
    'ai detection api','chatgpt detection api','deepfake detection api',
    'ai content api','rest api ai detector','ai checker api',
    'openai content detection api','ai text detection api free',
  ],
  alternates: { canonical: 'https://aiscern.com/docs/api' },
  openGraph: {
    title: 'Free AI Detection REST API — Text, Images, Audio, Video | Aiscern',
    description: 'Add AI content detection to your app in minutes. Detect ChatGPT text, Midjourney images, ElevenLabs voice. Free API.',
    url: 'https://aiscern.com/docs/api',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
