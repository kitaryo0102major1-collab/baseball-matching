'use client'

import { useState } from 'react'
import type { MatchPost, PostType } from '@/lib/types'
import BottomSheet from './BottomSheet'

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAY_LABELS[d.getDay()]}）`
}

interface Props {
  open: boolean
  onClose: () => void
  post: MatchPost
}

interface ContactRowData {
  label: string
  value: string
  href: string | null
  actionLabel: string
}

export default function ContactSheet({ open, onClose, post }: Props) {
  const [copied, setCopied] = useState(false)

  const dateLabel = post.game_date ? formatShortDate(post.game_date) : ''
  const timeLabel = post.start_time ? ` ${post.start_time.slice(0, 5)}〜` : ''
  const templates: Record<PostType, string> = {
    match: `はじめまして。◯◯（チーム名）です。\n${dateLabel}${timeLabel}の募集を見てご連絡しました。\nうちはLv.${post.level}、当日は◯人で伺えます。\nよろしくお願いします。`,
    helper: `はじめまして。◯◯（お名前）と申します。\n${dateLabel}${timeLabel}の助っ人募集を見てご連絡しました。\n守れるポジションは◯◯、野球歴は◯年です。\n参加できますので、よろしくお願いします。`,
    member: `はじめまして。◯◯（お名前）と申します。\nメンバー募集を見てご連絡しました。\n年齢は◯歳、野球歴は◯年です。\n${post.trial_ok === false ? '入部を希望しています。' : 'まずは体験参加を希望しています。'}\nよろしくお願いします。`,
  }
  const template = templates[post.post_type]
  const hint =
    post.post_type === 'match'
      ? 'チーム名・希望日程・レベルを添えると返信が早くなります。'
      : 'お名前・ポジション・野球歴を添えると返信が早くなります。'

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(template)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // クリップボードへのアクセスが許可されていない場合は何もしない
    }
  }

  const rows: ContactRowData[] = []
  if (post.contact_email) {
    rows.push({ label: 'メール', value: post.contact_email, href: `mailto:${post.contact_email}`, actionLabel: 'メールを開く' })
  }
  if (post.contact_phone) {
    rows.push({ label: '電話', value: post.contact_phone, href: `tel:${post.contact_phone}`, actionLabel: '発信する' })
  }
  if (post.contact_other) {
    const isUrl = /^https?:\/\//.test(post.contact_other)
    rows.push({
      label: 'その他',
      value: post.contact_other,
      href: isUrl ? post.contact_other : null,
      actionLabel: '開く',
    })
  }
  if (post.sns_x) {
    rows.push({ label: 'X', value: post.sns_x, href: post.sns_x, actionLabel: '開く' })
  }
  if (post.sns_instagram) {
    rows.push({ label: 'Instagram', value: post.sns_instagram, href: post.sns_instagram, actionLabel: '開く' })
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <p className="font-bold text-[var(--ink)] mb-1">連絡方法を選ぶ</p>
      <p className="text-xs text-[var(--ink-mute)] mb-4">{hint}</p>

      <div className="bg-[#F1EEE4] rounded-xl p-3.5 mb-4">
        <p className="text-sm text-[var(--ink)] whitespace-pre-line leading-relaxed">{template}</p>
        <button
          type="button"
          onClick={handleCopy}
          className="mt-3 text-[13px] font-bold text-[var(--green)] border border-[var(--green)] rounded-full px-4 py-1.5"
        >
          {copied ? 'コピーしました' : '文例をコピー'}
        </button>
      </div>

      <div className="space-y-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 py-2.5 border-b border-[var(--line)] last:border-b-0"
          >
            <div className="min-w-0">
              <p className="text-[13px] text-[var(--ink-mute)]">{row.label}</p>
              <p className="text-sm text-[var(--ink)] break-all">{row.value}</p>
            </div>
            {row.href && (
              <a
                href={row.href}
                target={row.href.startsWith('http') ? '_blank' : undefined}
                rel={row.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="shrink-0 text-[13px] font-bold text-[var(--green)]"
              >
                {row.actionLabel}
              </a>
            )}
          </div>
        ))}
      </div>
    </BottomSheet>
  )
}
