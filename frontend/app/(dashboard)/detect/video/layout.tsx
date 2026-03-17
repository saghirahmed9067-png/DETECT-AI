import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Deepfake Video Detector Online Free — Frame Analysis',
  description: 'Frame-by-frame deepfake video detection. 88% accuracy. Free.',
  alternates: { canonical: 'https://aiscern.com/detect/video' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
