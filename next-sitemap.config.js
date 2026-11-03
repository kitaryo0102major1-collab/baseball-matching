/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://baseball-matching-eight.vercel.app',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
    ],
  },
  exclude: ['/login', '/mypage', '/mypage/*', '/auth/*'],
  changefreq: 'daily',
  priority: 0.7,
}
