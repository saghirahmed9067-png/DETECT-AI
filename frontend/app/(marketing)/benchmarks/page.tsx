import { redirect } from 'next/navigation'

// /benchmarks redirects to /methodology#accuracy-benchmarks
// A dedicated benchmarks page will be built when more dataset results are available
export default function BenchmarksPage() {
  redirect('/methodology#accuracy-benchmarks')
}

export const metadata = {
  title: 'Accuracy Benchmarks — Aiscern',
  description: 'Aiscern detection accuracy benchmarks across text, image, audio, and video modalities.',
}
