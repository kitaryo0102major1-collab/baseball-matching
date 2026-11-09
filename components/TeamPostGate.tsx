import Link from 'next/link'
import GoogleLoginButton from './GoogleLoginButton'

interface Props {
  nextPath: string
  loggedIn: boolean
}

// 助っ人・メンバー募集は登録チームの管理者だけが投稿できる
export default function TeamPostGate({ nextPath, loggedIn }: Props) {
  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-5">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 text-center space-y-4">
        <h1 className="text-lg font-black text-[var(--ink)] leading-relaxed">
          チーム登録すると
          <br />
          助っ人・メンバーを募集できます
        </h1>
        {loggedIn ? (
          <Link
            href="/mypage/team/new"
            className="block bg-[var(--green)] hover:opacity-90 text-white font-bold py-3.5 rounded-xl transition-opacity"
          >
            チームを登録する
          </Link>
        ) : (
          <GoogleLoginButton next={nextPath} label="Googleでチーム登録" />
        )}
      </div>

      <div className="bg-[var(--green-bg)] rounded-2xl p-4 text-sm text-[var(--ink-sub)] text-center">
        <p className="font-bold text-[var(--green)]">対戦相手の募集はログインなしでできます</p>
        <Link href="/posts/quick" className="inline-block mt-2 text-[13px] font-bold text-[var(--green)] underline">
          かんたん募集へ
        </Link>
      </div>
    </div>
  )
}
