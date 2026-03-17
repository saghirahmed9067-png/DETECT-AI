/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://aiscern.com',
  generateRobotsTxt: false,
  changefreq: 'weekly',
  priority: 0.7,
  exclude: ['/admin', '/admin/*', '/unauthorized', '/dashboard/*', '/history', '/profile', '/settings', '/scraper', '/pipeline'],
  additionalPaths: async (config) => [
    { loc: '/', changefreq: 'daily',  priority: 1.0 },
    { loc: '/detect/text',  changefreq: 'weekly', priority: 0.9 },
    { loc: '/detect/image', changefreq: 'weekly', priority: 0.9 },
    { loc: '/detect/audio', changefreq: 'weekly', priority: 0.9 },
    { loc: '/detect/video', changefreq: 'weekly', priority: 0.9 },
    { loc: '/batch',        changefreq: 'weekly', priority: 0.8 },
    { loc: '/chat',         changefreq: 'weekly', priority: 0.8 },
    { loc: '/pricing',      changefreq: 'monthly', priority: 0.8 },
    { loc: '/reviews',      changefreq: 'weekly', priority: 0.7 },
    { loc: '/about',        changefreq: 'monthly', priority: 0.6 },
    { loc: '/docs/api',     changefreq: 'monthly', priority: 0.7 },
  ],
}
