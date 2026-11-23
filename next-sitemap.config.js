/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://baseball-matching-eight.vercel.app',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
    ],
  },
  // /scores は紹介ページにするまで noindex（紹介ページにしたら '/scores' だけ外す）
  exclude: ['/login', '/mypage', '/mypage/*', '/auth/*', '/invite/*', '/scores', '/scores/*'],
  // 動的に描画するページは自動収集されないため、明示的に追加する
  additionalPaths: async (config) =>
    Promise.all(['/teams', '/posts', '/posts?type=helper', '/posts?type=member'].map((p) => config.transform(config, p))),
  changefreq: 'daily',
  priority: 0.7,
}
