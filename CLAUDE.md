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
- `postQueries.ts`: 募集の取得
  - `POST_COLUMNS`: 連絡先を除いた列リスト。`match_posts` を読むときは必ずこれを使う（`select('*')` は権限エラーになる）
  - `POST_WITH_TEAM_SELECT`: `POST_COLUMNS` ＋チーム公開情報
  - `getPostContacts()`: RPC `get_post_contacts` で連絡先を取得する。ログイン状態を持つクライアントを渡す
- `myTeam.ts`: `getMyTeams()`、`requireMyTeams()`（サーバー専用。未ログインは `/login` へ）
- `useMyTeams.ts`: 自チーム取得の Client 用フック
- `selectedTeam.ts`: 選択中チームとログイン後の戻り先の Cookie、`isSafeNextPath()`
- `seo.ts`: `pageMetadata()`。canonical と OG を毎回まとめて指定する（子の `openGraph` は親を丸ごと置き換えるため）
- `types.ts`、`prefectures.ts`: 型と定数（移動できる範囲の選択肢は `TRAVEL_RANGES`）
- `municipalities.ts`: 全国の市区町村一覧 `MUNICIPALITIES`（都道府県ごと、`{ code, name }`）
  - 総務省「全国地方公共団体コード」（令和6年1月1日更新）から生成した静的データ。政令指定都市は市単位、東京23区は区ごと
  - 同じ都道府県内に同名の団体がある（北海道の「泊村」）ので、区別が必要なときは `code` を使う

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
| `match_posts` | 全種類の募集（`post_type`: `match`、`helper`、`member`） | 誰でも（連絡先3列を除く） | 下記 |
| `chats` | 募集の公開チャット | 誰でも | ゲスト可。`team_id` 付きはそのチームの管理者のみ |
| `teams` | チーム本体（非公開の連絡先を含む） | 管理者のみ | 作成はログインユーザー、更新・削除は管理者 |
| `team_profiles`（ビュー） | チームの公開情報。連絡先は `contact_public` のときだけ返す | 誰でも | 不可 |
| `team_members` | チームの管理者 | 同じチームの管理者 | 追加は関数・トリガー経由のみ。削除は管理者 |
| `team_invites` | 招待リンク | 管理者 | 管理者。受諾は RPC `accept_team_invite` |

`match_posts` の書き込み権限:

- ゲストの対戦相手募集（`team_id` なし）: 誰でも投稿・更新できる。削除はできない
- チームの対戦相手募集: そのチームの管理者のみ
- 助っ人・メンバー募集: `team_id` 必須で、そのチームの管理者のみ

他チームの情報を読むときは `teams` ではなく `team_profiles` を使う。`teams` に公開する列を足したら、`team_profiles` にも末尾に足す（`create or replace view` は列を末尾にしか追加できない）。

`match_posts` と `teams` の `city`（市区町村名）と `travel_range`（`市内のみ`、`30分圏内`、`1時間圏内`、`県内どこでも`）は任意項目で、既存データは null。`travel_range` は check 制約で値を制限している。`TeamInput` からは外してあるので、チームの保存では送られない。

`match_posts` の連絡先（`contact_email`、`contact_phone`、`contact_other`）:

- `select` は列単位の権限で、anon / authenticated は連絡先3列を読めない。`select('*')`、連絡先列の指定、連絡先列での絞り込みはいずれも権限エラーになる
- 列を追加したら、公開する列を `grant select (列名)` し、`POST_COLUMNS` にも足す
- 読むときは `get_post_contacts(post_id)` を使う。返すのは掲載中の募集（`status = '募集中'` で、対戦相手・助っ人は試合日が今日（日本時間）以降、メンバーは `renewed_at` が60日以内）か、呼び出した人がそのチームの管理者のときだけ。それ以外は null
- 書き込みは今までどおり `insert` / `update` でできる
- 掲載が終わったゲスト募集の編集画面では連絡先を読めないので、空欄の項目は送信せず既存の値を残す（`PostForm` の `contactsHidden`）

トリガーと定期処理:

- `lock_post_ownership`: `team_id`、`created_by`、`post_type`、`source_post_id` は投稿後に付け替え不可
- `check_post_source`: 助っ人募集の引き継ぎ元は同じチームの対戦相手募集のみ
- `delete_team_only_posts`: チーム削除で助っ人・メンバー募集も削除。対戦相手募集はゲスト募集として残る
- `prevent_removing_last_member`: 最後の管理者は削除不可
- `purge_expired_member_contacts`: pg_cron で毎月2日 03:00（日本時間）に実行。365日超のメンバー募集の連絡先を空にする

ロゴは Storage の `team-logos`（`{team_id}/logo`）で、書き込みは管理者のみ。

スキーマ変更は `supabase/migrations/` に追加する。`supabase/schema.sql` にはチーム機能以降が反映されていないので、現在の定義はマイグレーションを見る。
