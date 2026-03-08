/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'huggingface.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }],
    },
    {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options',        value: 'DENY' },
        { key: 'X-XSS-Protection',       value: '1; mode=block' },
        { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
}

module.exports = nextConfig
