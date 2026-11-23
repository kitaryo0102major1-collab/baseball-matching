import { DEFENSE_MODES, STANDARD_LINEUP_SIZE, gameDateLabel } from '@/lib/games'
import type { Game } from '@/lib/types'

interface Props {
  game: Game
  // 自チーム名（チームの試合は teams.name、ゲストは guest_team_name）
  teamName: string | null
}

// 試合情報の表示（ゲスト・チーム共通）
export default function GameInfoSummary({ game, teamName }: Props) {
  const ourName = teamName || '自チーム'
  const [top, bottom] = game.batting_first ? [ourName, game.opponent_name] : [game.opponent_name, ourName]
  const rows: [string, string][] = [
    ['日付', `${game.game_date.slice(0, 4)}年 ${gameDateLabel(game.game_date)}`],
    ['場所', game.venue || '未入力'],
    ['種類', game.game_type === '公式戦' && game.tournament_name ? `公式戦（${game.tournament_name}）` : game.game_type],
    ['予定イニング', `${game.scheduled_innings}回`],
    ['守備の記録', DEFENSE_MODES.find((m) => m.value === game.defense_mode)?.label ?? game.defense_mode],
    [
      '打順',
      `${game.lineup_size > STANDARD_LINEUP_SIZE ? `全員打ち（${game.lineup_size}人）` : `${game.lineup_size}人`}${game.use_dh ? '・DHあり' : ''}`,
    ],
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 items-baseline">
        <span className="text-xs text-[var(--ink-mute)]">先攻</span>
        <span className="text-base font-black text-[var(--ink)] break-words">{top}</span>
        <span className="text-xs text-[var(--ink-mute)]">後攻</span>
        <span className="text-base font-black text-[var(--ink)] break-words">{bottom}</span>
      </div>
      <dl className="text-sm divide-y divide-[var(--line)] border-t border-[var(--line)]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2">
            <dt className="text-[var(--ink-mute)] shrink-0">{k}</dt>
            <dd className="text-[var(--ink)] text-right break-words min-w-0">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function GameStatusBadge({ status }: { status: Game['status'] }) {
  return status === '確定' ? (
    <span className="shrink-0 text-[11px] font-bold text-[var(--green)] bg-[var(--green-bg)] border border-[var(--green)]/30 rounded-full px-2 py-0.5">
      確定
    </span>
  ) : (
    <span className="shrink-0 text-[11px] font-bold text-[#9A6B00] bg-[#FFF4D6] border border-[#F0DDA0] rounded-full px-2 py-0.5">
      入力中
    </span>
  )
}

// 打順・打席入力は次のタスクで作る
export function NextStepPending() {
  return (
    <div className="bg-[var(--bg)] border border-dashed border-[var(--line)] rounded-2xl p-4 text-center">
      <p className="text-sm font-bold text-[var(--ink-sub)]">次は打順の入力（準備中）</p>
      <p className="text-xs text-[var(--ink-mute)] mt-1">打順と打席の入力は、もうすぐ使えるようになります。</p>
    </div>
  )
}
