@AGENTS.md

# 草野球マッチ サイト構成メモ

Next.js 16（App Router）/ Supabase / Tailwind / TypeScript。main に push すると Vercel に自動デプロイされる。構成を変えたらここも更新する。

## 主要なページ

`app/` の page はすべて Server Component。画面の操作部分は `components/` の Client Component に置く。`'use client'` のページからは metadata を export できないため、この形を崩さない。

| パス | 内容 | 主なコンポーネント |
|---|---|---|
| `/` | トップ | `TopPage` |
| `/posts` | 募集一覧。`?type=helper\|member` でタブ切替（なしは対戦相手） | `PostsPage`、`TeamTypePosts` |
| `/posts/[id]` | 募集詳細・連絡先・公開チャット | `PostApplyCta`、`ChatArea` |
| `/posts/[id]/edit` | 募集の編集 | `PostForm`、`TeamPostForm` |
| `/posts/new`、`/posts/quick` | 対戦相手の募集（くわしく／かんたん。登録不要） | `PostForm`、`QuickPostPage` |
| `/posts/new/helper`、`/posts/new/member` | 助っ人・メンバーの募集（登録チームのみ） | `TeamPostGate`、`TeamPostForm` |
| `/teams`、`/teams/[id]` | チーム一覧・公開プロフィール | `TeamFilters` |
| `/mypage` | 自チームの募集管理 | `MyTeamPosts`、`MemberRenewCard` |
| `/mypage/team`、`/mypage/team/new`、`/mypage/team/members` | チームの編集・作成・管理者と招待 | `TeamForm`、`MembersManager` |
| `/invite/[token]` | チーム招待の受諾 | `AcceptInviteButton` |
| `/login`、`/auth/callback` | Google ログイン | `GoogleLoginButton` |
| `/privacy` | プライバシーポリシー | |

共通レイアウトは `app/layout.tsx`（`Header`、`BottomTabBar`）。middleware は `proxy.ts` で、`sb-` Cookie がある訪問者のセッションだけ更新する。

## lib の共通処理

- `dates.ts`: `todayJST()`、`jstMonthDay()`
- `postRules.ts`: 掲載ルールと一覧の共通処理
  - `memberVisibility()`: メンバー募集は `renewed_at` から60日で一覧から外れ、365日超で終了扱い
  - `memberListingCutoff()`、`openPostsOrFilter()`、`postListPath()`
  - `syncListUrl()`: 一覧の絞り込みを URL に反映する。`router.replace` を使うと `/posts` が無限ループするので必ずこれを使う
- `postPermissions.ts`: `getPostPermissions()`、`isTeamManager()`（サーバー専用）
- `postQueries.ts`: `POST_WITH_TEAM_SELECT`（募集＋チーム公開情報の select）
- `myTeam.ts`: `getMyTeams()`、`requireMyTeams()`（サーバー専用。未ログインは `/login` へ）
- `useMyTeams.ts`: 自チーム取得の Client 用フック
- `selectedTeam.ts`: 選択中チームとログイン後の戻り先の Cookie、`isSafeNextPath()`
- `seo.ts`: `pageMetadata()`。canonical と OG を毎回まとめて指定する（子の `openGraph` は親を丸ごと置き換えるため）
- `types.ts`、`prefectures.ts`: 型と定数

## 日付

「今日」の判定は必ず `todayJST()` を使う。サーバーは UTC で動くため、`new Date()` から日付を取り出すと日本時間とずれる。`created_at` などの月日表示は `jstMonthDay()` を使う。

`renewed_at` や `expires_at` のような時刻の比較・保存は `new Date().toISOString()` のままでよい。

## Supabase クライアントの使い分け

| import | 用途 |
|---|---|
| `@/lib/supabase`（`supabase`） | Cookie を読まない匿名クライアント。誰でも見られるデータの読み取りと Realtime に使う。サーバー・ブラウザの両方で使える |
| `@/lib/supabase/client`（`createClient()`） | Client Component でログイン状態が関わる処理。投稿・更新・削除はこちら |
| `@/lib/supabase/server`（`await createClient()`） | Server Component、Route Handler でログイン状態が関わる処理 |

匿名クライアントで書き込むと、ログイン中でも未ログイン扱いになり RLS で拒否される。

## テーブルと RLS の考え方

権限は画面ではなく RLS で守る。「チームの管理者」は `team_members` の行があることで、判定は `is_team_member(team_id)`（security definer）に統一している。管理者に役割の差はない。

| テーブル | 内容 | 読み取り | 書き込み |
|---|---|---|---|
| `match_posts` | 全種類の募集（`post_type`: `match`、`helper`、`member`） | 誰でも | 下記 |
| `chats` | 募集の公開チャット | 誰でも | ゲスト可。`team_id` 付きはそのチームの管理者のみ |
| `teams` | チーム本体（非公開の連絡先を含む） | 管理者のみ | 作成はログインユーザー、更新・削除は管理者 |
| `team_profiles`（ビュー） | チームの公開情報。連絡先は `contact_public` のときだけ返す | 誰でも | 不可 |
| `team_members` | チームの管理者 | 同じチームの管理者 | 追加は関数・トリガー経由のみ。削除は管理者 |
| `team_invites` | 招待リンク | 管理者 | 管理者。受諾は RPC `accept_team_invite` |

`match_posts` の書き込み権限:

- ゲストの対戦相手募集（`team_id` なし）: 誰でも投稿・更新できる。削除はできない
- チームの対戦相手募集: そのチームの管理者のみ
- 助っ人・メンバー募集: `team_id` 必須で、そのチームの管理者のみ

他チームの情報を読むときは `teams` ではなく `team_profiles` を使う。`match_posts` の連絡先は DB 上は誰でも読めるため、公開したくない情報を入れない。

トリガーと定期処理:

- `lock_post_ownership`: `team_id`、`created_by`、`post_type`、`source_post_id` は投稿後に付け替え不可
- `check_post_source`: 助っ人募集の引き継ぎ元は同じチームの対戦相手募集のみ
- `delete_team_only_posts`: チーム削除で助っ人・メンバー募集も削除。対戦相手募集はゲスト募集として残る
- `prevent_removing_last_member`: 最後の管理者は削除不可
- `purge_expired_member_contacts`: pg_cron で毎月2日 03:00（日本時間）に実行。365日超のメンバー募集の連絡先を空にする

ロゴは Storage の `team-logos`（`{team_id}/logo`）で、書き込みは管理者のみ。

スキーマ変更は `supabase/migrations/` に追加する。`supabase/schema.sql` にはチーム機能以降が反映されていないので、現在の定義はマイグレーションを見る。
