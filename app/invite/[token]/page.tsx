import { pageMetadata } from '@/lib/seo'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import TeamAvatar from '@/components/TeamAvatar'
import GoogleLoginButton from '@/components/GoogleLoginButton'
import AcceptInviteButton from '@/components/AcceptInviteButton'

interface InvitePreview {
  team_id: string
  team_name: string
  logo_url: string | null
  inviter_name: string | null
  is_valid: boolean
  already_member: boolean
}

interface Props {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props) {
  const { token } = await params
  return pageMetadata({ title: 'チームの管理者に招待されています', path: `/invite/${token}`, noindex: true })
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()

  const [{ data: claims }, { data }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.rpc('get_invite_preview', { p_token: token }),
  ])
  const preview = ((data ?? []) as InvitePreview[])[0]
  const loggedIn = !!claims?.claims

  if (!preview || (!preview.is_valid && !preview.already_member)) {
    return (
      <Shell>
        <p className="text-base font-bold text-[var(--ink)]">この招待リンクは使えません</p>
        <p className="text-sm text-[var(--ink-sub)] mt-2 leading-relaxed">
          チームの管理者に新しいリンクをもらってください。
        </p>
        <Link href="/" className="inline-block mt-5 text-sm text-[var(--green)] underline">
          トップに戻る
        </Link>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="flex flex-col items-center text-center">
        <TeamAvatar name={preview.team_name} logoUrl={preview.logo_url} size={80} />
        <p className="text-xl font-black text-[var(--ink)] mt-3 break-words">{preview.team_name}</p>
        {preview.inviter_name && (
          <p className="text-sm text-[var(--ink-sub)] mt-1">{preview.inviter_name}さんから管理者に招待されています</p>
        )}
      </div>

      <p className="text-sm text-[var(--ink-sub)] leading-relaxed mt-5 bg-[var(--green-bg)] rounded-xl p-4">
        管理者になると、チーム情報の編集や募集の投稿・修正ができます。
      </p>

      <div className="mt-5">
        {preview.already_member ? (
          <div className="text-center space-y-3">
            <p className="text-sm font-bold text-[var(--green)]">すでにこのチームの管理者です</p>
            <AcceptInviteButton teamId={preview.team_id} mode="open" />
          </div>
        ) : loggedIn ? (
          <AcceptInviteButton token={token} mode="accept" />
        ) : (
          <GoogleLoginButton next={`/invite/${token}`} label="Googleでログインして参加" />
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6">{children}</div>
    </div>
  )
}
