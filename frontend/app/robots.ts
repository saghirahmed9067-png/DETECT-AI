import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/detect/',
          '/settings',
          '/profile',
          '/history',
          '/batch',
          '/scraper',
          '/admin/',
          '/login',
          '/signup',
          '/offline',
        ],
      },
      {
        // Block AI training scrapers from the whole site
        userAgent: [
          'GPTBot', 'ChatGPT-User', 'CCBot', 'anthropic-ai',
          'Claude-Web', 'Google-Extended', 'PerplexityBot',
        ],
        disallow: '/',
      },
    ],
    sitemap: 'https://aiscern.com/sitemap.xml',
    host: 'https://aiscern.com',
  }
}
