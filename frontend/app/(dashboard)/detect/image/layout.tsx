import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Deepfake & AI Image Detector Online Free',
  description: 'Detect Midjourney, DALL-E, Stable Diffusion and deepfake images. 97% accuracy. Free.',
  alternates: { canonical: 'https://aiscern.com/detect/image' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
