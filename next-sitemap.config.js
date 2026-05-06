/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://baseball-matching-eight.vercel.app',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
    ],
  },
  exclude: [],
  changefreq: 'daily',
  priority: 0.7,
}
