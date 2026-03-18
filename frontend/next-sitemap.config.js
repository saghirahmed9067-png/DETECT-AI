/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://aiscern.com',
  generateRobotsTxt: false,
  changefreq: 'weekly',
  priority: 0.7,
  exclude: [
    '/admin', '/admin/*', '/unauthorized',
    '/dashboard', '/dashboard/*',
    '/history', '/profile', '/settings',
    '/scraper', '/pipeline',
    '/login', '/signup',
  ],
  additionalPaths: async (config) => [
    // Core pages — highest priority
    { loc: '/',              changefreq: 'daily',   priority: 1.0, lastmod: new Date().toISOString() },
    // Detection tools — primary keywords
    { loc: '/detect/text',  changefreq: 'weekly',  priority: 0.95, lastmod: new Date().toISOString() },
    { loc: '/detect/image', changefreq: 'weekly',  priority: 0.95, lastmod: new Date().toISOString() },
    { loc: '/detect/audio', changefreq: 'weekly',  priority: 0.90, lastmod: new Date().toISOString() },
    { loc: '/detect/video', changefreq: 'weekly',  priority: 0.90, lastmod: new Date().toISOString() },
    // Tools
    { loc: '/batch',        changefreq: 'weekly',  priority: 0.85, lastmod: new Date().toISOString() },
    { loc: '/chat',         changefreq: 'weekly',  priority: 0.80, lastmod: new Date().toISOString() },
    // Marketing
    { loc: '/pricing',      changefreq: 'monthly', priority: 0.80, lastmod: new Date().toISOString() },
    { loc: '/reviews',      changefreq: 'weekly',  priority: 0.75, lastmod: new Date().toISOString() },
    { loc: '/docs/api',     changefreq: 'monthly', priority: 0.75, lastmod: new Date().toISOString() },
    // Company
    { loc: '/about',        changefreq: 'monthly', priority: 0.65, lastmod: new Date().toISOString() },
    { loc: '/contact',      changefreq: 'monthly', priority: 0.60, lastmod: new Date().toISOString() },
    { loc: '/privacy',      changefreq: 'yearly',  priority: 0.40, lastmod: new Date().toISOString() },
    { loc: '/terms',        changefreq: 'yearly',  priority: 0.40, lastmod: new Date().toISOString() },
  ],
}
