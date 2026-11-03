import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
  description: '草野球マッチのプライバシーポリシーです。',
}

const CONTACT_EMAIL = 'kitaryo.0102major1@gmail.com'

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-black text-[var(--ink)]">プライバシーポリシー</h1>
      <p className="text-xs text-[var(--ink-mute)] mt-1">制定日：2026年11月3日</p>

      <div className="mt-6 bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-7 text-sm text-[var(--ink-sub)] leading-relaxed">
        <p>
          草野球マッチ（以下「本サービス」）の運営者は、本サービスの利用者の個人情報を、以下の方針に従って取り扱います。
        </p>

        <Section title="1. 取得する情報">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <b>募集投稿・メッセージの内容</b>：タイトル、試合日時、場所、チームレベル、コメント、連絡先（メールアドレス・電話番号・その他）、SNSアカウントのURL、公開メッセージに入力されたチーム名と本文
            </li>
            <li>
              <b>Googleアカウントの情報</b>：チーム登録のためにGoogleでログインした場合の、メールアドレス、氏名、プロフィール画像のURL、Googleアカウントの識別子
            </li>
            <li>
              <b>チーム情報</b>：チーム名、ロゴ画像、紹介文、活動エリア、活動日・時間帯、ホームグラウンド、メンバー数、年齢層、結成年、所属リーグ、SNSアカウントのURL、連絡先
            </li>
            <li>
              <b>利用時に自動で記録される情報</b>：ログイン状態を保つためのCookie、アクセス日時・IPアドレス・ブラウザの種類などのサーバーログ
            </li>
          </ul>
        </Section>

        <Section title="2. 利用目的">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>対戦相手の募集・検索、チームページの表示など、本サービスの機能を提供するため</li>
            <li>ログインした利用者を識別し、チームの管理者だけがチーム情報を編集できるようにするため</li>
            <li>チームの管理者一覧や招待リンクのページに、管理者の名前とプロフィール画像を表示するため</li>
            <li>不正利用の防止、障害対応、本サービスの改善のため</li>
            <li>お問い合わせに対応するため</li>
          </ul>
        </Section>

        <Section title="3. 公開される情報">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>募集投稿の内容（入力された連絡先を含む）と公開メッセージは、誰でも閲覧できる状態で公開されます。</li>
            <li>チーム情報はチームページで公開されます。ただし連絡先は、チーム情報の「連絡先をチームページに公開する」をオンにした場合にのみ公開されます。</li>
            <li>
              Googleアカウントの氏名とプロフィール画像は、同じチームの管理者に管理者一覧として表示されます。また、招待リンクを開いた人には、リンクを発行した管理者の氏名が表示されます。
            </li>
            <li>Googleアカウントのメールアドレスは公開されません。</li>
          </ul>
        </Section>

        <Section title="4. Googleユーザーデータの取り扱い">
          <p>
            本サービスがGoogleログインで受け取る情報は、上記1の「Googleアカウントの情報」に限られます。これらはログインと本人確認、およびチームの管理者一覧・招待ページでの表示のためにのみ使用し、広告への利用、第三者への販売・譲渡は行いません。
          </p>
          <p className="mt-2">
            本サービスによるGoogle APIから受け取った情報の使用および他のアプリへの転送は、
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--green)] underline"
            >
              Google API サービスのユーザーデータに関するポリシー
            </a>
            （限定的使用の要件を含む）に従います。
          </p>
        </Section>

        <Section title="5. 第三者への提供">
          <p>法令に基づく場合を除き、本人の同意なく個人情報を第三者に提供することはありません。</p>
        </Section>

        <Section title="6. 外部サービスの利用">
          <p>本サービスは、運営に必要な範囲で以下の外部サービスに情報の保管・処理を委託しています。</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Supabase（データベース、ログイン、画像の保管）</li>
            <li>Vercel（ウェブサイトの配信）</li>
            <li>Google（Googleアカウントによるログイン）</li>
          </ul>
        </Section>

        <Section title="7. 情報の管理と削除">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>取得した情報は、不正アクセスや漏えいを防ぐために適切に管理します。</li>
            <li>チーム情報はマイページからいつでも変更できます。</li>
            <li>アカウントやチーム情報の削除、募集投稿の削除を希望する場合は、下記のお問い合わせ先までご連絡ください。</li>
          </ul>
        </Section>

        <Section title="8. ポリシーの変更">
          <p>本ポリシーの内容は、必要に応じて変更することがあります。変更後の内容は本ページに掲載した時点から効力を生じます。</p>
        </Section>

        <Section title="9. お問い合わせ">
          <p>
            本ポリシーに関するお問い合わせは、以下までご連絡ください。
            <br />
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--green)] underline break-all">
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>
      </div>

      <div className="text-center mt-6">
        <Link href="/" className="text-sm text-[var(--ink-mute)] hover:text-[var(--green)] transition-colors">
          トップに戻る
        </Link>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold text-[var(--ink)] mb-2">{title}</h2>
      {children}
    </section>
  )
}
