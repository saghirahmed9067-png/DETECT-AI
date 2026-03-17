import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Audio Detector — Detect Voice Cloning & ElevenLabs',
  description: 'Detect ElevenLabs, voice cloning and AI-synthesised audio. 91% accuracy. Free.',
  alternates: { canonical: 'https://aiscern.com/detect/audio' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
