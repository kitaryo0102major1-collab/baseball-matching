/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://baseball-matching-eight.vercel.app',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
    ],
  },
  exclude: ['/login', '/mypage', '/mypage/*', '/auth/*', '/invite/*'],
  // 動的に描画するページは自動収集されないため、明示的に追加する
  additionalPaths: async (config) => [await config.transform(config, '/teams')],
  changefreq: 'daily',
  priority: 0.7,
}
