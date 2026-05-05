'use client'

import Link from 'next/link'
import { useState } from 'react'

const HOW_TO_STEPS = [
  {
    step: '1',
    title: '募集を探す',
    desc: '「グラウンドあり」「グラウンドなし」で絞り込んで、エリアや日程が合う対戦相手を見つけましょう。',
  },
  {
    step: '2',
    title: '連絡を取る',
    desc: '募集詳細ページに記載のメール・電話・SNSで直接チームに連絡してください。',
  },
  {
    step: '3',
    title: '試合を楽しむ',
    desc: '日程・場所などを相談して、練習試合を楽しみましょう！',
  },
]

function HowToAccordion() {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
      >
        <span>使い方を見る</span>
        <span
          className="text-[#1D9E75] text-xl inline-block transition-transform duration-200"
          style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
        >
          ＋
        </span>
      </button>
      {open && (
        <div className="px-6 pb-6 grid sm:grid-cols-3 gap-4 border-t border-gray-100">
          {HOW_TO_STEPS.map((s) => (
            <div key={s.step} className="pt-5">
              <div className="w-9 h-9 rounded-full bg-[#1D9E75] text-white font-bold flex items-center justify-center mb-3 text-sm">
                {s.step}
              </div>
              <p className="font-semibold text-gray-800 mb-1">{s.title}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TopPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 space-y-12">
      {/* Hero */}
      <section className="text-center space-y-4">
        <div className="inline-block bg-[#E1F5EE] text-[#0F6E56] text-xs font-semibold px-4 py-1 rounded-full border border-[#0F6E56]/20 mb-2">
          登録不要・無料で使える
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight">
          草野球の対戦相手、<br />
          <span className="text-[#1D9E75]">見つかる。</span>
        </h1>
        <p className="text-gray-500 text-base sm:text-lg max-w-md mx-auto">
          グラウンドの有無で相手を探したり、練習試合の募集を簡単に投稿できます。
        </p>
      </section>

      {/* CTA Cards */}
      <section className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/posts?field=ok"
          className="group block bg-[#E1F5EE] border-2 border-[#0F6E56]/30 hover:border-[#0F6E56] rounded-2xl p-6 transition-all hover:shadow-md"
        >
          <div className="text-4xl mb-3">🏟️</div>
          <h2 className="font-bold text-[#0F6E56] text-lg mb-1">グラウンドあり で探す</h2>
          <p className="text-sm text-[#0F6E56]/70">球場・グラウンドを確保しているチームを探す</p>
          <div className="mt-4 text-sm font-semibold text-[#0F6E56] group-hover:translate-x-1 transition-transform inline-block">
            一覧を見る →
          </div>
        </Link>

        <Link
          href="/posts?field=ng"
          className="group block bg-[#FCEBEB] border-2 border-[#A32D2D]/30 hover:border-[#A32D2D] rounded-2xl p-6 transition-all hover:shadow-md"
        >
          <div className="text-4xl mb-3">📍</div>
          <h2 className="font-bold text-[#A32D2D] text-lg mb-1">グラウンドなし で探す</h2>
          <p className="text-sm text-[#A32D2D]/70">場所を持っている相手チームを探したい</p>
          <div className="mt-4 text-sm font-semibold text-[#A32D2D] group-hover:translate-x-1 transition-transform inline-block">
            一覧を見る →
          </div>
        </Link>

        <Link
          href="/posts/new"
          className="group block sm:col-span-2 bg-[#1D9E75] hover:bg-[#0F6E56] rounded-2xl p-6 transition-all hover:shadow-md text-center"
        >
          <div className="text-4xl mb-3">📢</div>
          <h2 className="font-bold text-white text-xl mb-1">対戦相手を募集する</h2>
          <p className="text-sm text-white/80">無料・登録不要で今すぐ投稿できます</p>
          <div className="mt-4 text-sm font-semibold text-white group-hover:translate-x-1 transition-transform inline-block">
            投稿フォームへ →
          </div>
        </Link>
      </section>

      {/* 使い方アコーディオン */}
      <section>
        <HowToAccordion />
      </section>
    </div>
  )
}
