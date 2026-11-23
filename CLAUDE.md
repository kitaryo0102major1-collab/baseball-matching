@AGENTS.md

# 草野球マッチ サイト構成メモ

Next.js 16（App Router）/ Supabase / Tailwind / TypeScript。main に push すると Vercel に自動デプロイされる。構成を変えたらここも更新する。

## 主要なページ

`app/` の page はすべて Server Component。画面の操作部分は `components/` の Client Component に置く。`'use client'` のページからは metadata を export できないため、この形を崩さない。

| パス | 内容 | 主なコンポーネント |
|---|---|---|
| `/` | トップ。未ログインは通常のトップ、ログイン中は選択中チームの「チームホーム」（管理チームがなければ登録を促すカード＋通常のトップ） | `TopPage`、`TeamHome` |
| `/posts` | 募集一覧。`?type=helper\|member` でタブ切替（なしは対戦相手） | `PostsPage`、`TeamTypePosts` |
| `/posts/[id]` | 募集詳細・連絡先・公開チャット | `PostApplyCta`、`ChatArea` |
| `/posts/[id]/edit` | 募集の編集 | `PostForm`、`TeamPostForm` |
| `/posts/new`、`/posts/quick` | 対戦相手の募集（くわしく／かんたん。登録不要） | `PostForm`、`QuickPostPage` |
| `/posts/new/helper`、`/posts/new/member` | 助っ人・メンバーの募集（登録チームのみ） | `TeamPostGate`、`TeamPostForm` |
| `/teams`、`/teams/[id]` | チーム一覧・公開プロフィール | `TeamFilters` |
| `/mypage` | 自チームの募集管理 | `MyTeamPosts`、`MemberRenewCard` |
| `/mypage/team`、`/mypage/team/new`、`/mypage/team/members` | チームの編集・作成・管理者と招待 | `TeamForm`、`MembersManager` |
| `/mypage/games`、`/mypage/games/new`、`/mypage/games/[id]` | チームの試合。年度ごとの一覧（`?year=`、年度の開始月はチーム設定）・作成・試合情報の編集と削除。打順・入力はまだない | `TeamGameCreate`、`TeamGameManager`、`GameInfoForm` |
| `/scores` | ゲストの「この端末で記録した試合」（後のタスクで紹介ページにし、一覧は部品のまま下部に置く） | `GuestGamesList` |
| `/scores/new`、`/scores/[id]/edit` | ゲストの試合の作成・試合情報の編集と削除。編集用リンクは `/scores/[id]/edit#token` | `GuestGameCreate`、`GuestGameEditor`、`GuestEditLink` |
| `/mypage/players` | 選手名簿（追加・編集・退団・削除、在籍／助っ人／退団の絞り込み）。選択中のチームの名簿を出す | `PlayersManager` |
| `/invite/[token]` | チーム招待の受諾 | `AcceptInviteButton` |
| `/login`、`/auth/callback` | Google ログイン | `GoogleLoginButton` |
| `/privacy` | プライバシーポリシー | |

共通レイアウトは `app/layout.tsx`（`Header`、`BottomTabBar`）。ページはサーバーで Cookie を読まずに配信しているので、ログイン状態で見た目を出し分けるときは、`<body>` 先頭のスクリプトが表示前に付ける `<html data-auth="in|out">` と、`globals.css` の `.auth-member-only` / `.auth-guest-only` を使う（下部タブの「マイページ／ログイン」がこの方式。表示後の変化は `BottomTabBar` が `onAuthStateChange` で追従）。トップページも同じ方式で、`.home-member`（`TeamHome`）と `.home-guest`（`TopPage`）を出し分ける。管理チームがないときは `TeamHome` が `<html data-no-team>` を付けて `TopPage` も見せる。middleware は `proxy.ts` で、`sb-` Cookie がある訪問者のセッションだけ更新する。

## lib の共通処理

- `dates.ts`: `todayJST()`、`jstMonthDay()`
- `postRules.ts`: 掲載ルールと一覧の共通処理
  - `memberVisibility()`: メンバー募集は `renewed_at` から60日で一覧から外れ、365日超で終了扱い
  - `memberListingCutoff()`、`openPostsOrFilter()`、`postListPath()`
  - `syncListUrl()`: 一覧の絞り込みを URL に反映する。`router.replace` を使うと `/posts` が無限ループするので必ずこれを使う
  - `cityOrUnsetFilter()`: 一覧の市区町村の絞り込み。市区町村が未設定の同じ都道府県の募集も取得し、`CityGroupedPosts` で見出しを付けて分けて出す
  - `postPlaceLabel()`: 場所の表示「都道府県 市区町村 ・ 移動範囲」（市区町村がなければ都道府県だけ）。PostCard と募集詳細で使う
- `postPermissions.ts`: `getPostPermissions()`、`isTeamManager()`（サーバー専用）
- `postQueries.ts`: 募集の取得
  - `POST_COLUMNS`: 連絡先を除いた列リスト。`match_posts` を読むときは必ずこれを使う（`select('*')` は権限エラーになる）
  - `POST_WITH_TEAM_SELECT`: `POST_COLUMNS` ＋チーム公開情報
  - `getPostContacts()`: RPC `get_post_contacts` で連絡先を取得する。ログイン状態を持つクライアントを渡す
- `myTeam.ts`: `getMyTeams()`、`requireMyTeams()`（サーバー専用。未ログインは `/login` へ）
- `useMyTeams.ts`: 自チーム取得の Client 用フック
- `selectedTeam.ts`: 選択中チームとログイン後の戻り先の Cookie、`isSafeNextPath()`。`setSelectedTeamCookie()` は `SELECTED_TEAM_EVENT` も出す（チームホームが切替に追従する）
- `lastSeen.ts`: マイページを最後に開いた時刻（チームごと、localStorage）と新着メッセージの判定 `newChatTimes()`。書き込むのはマイページだけ
- `likes.ts`: 「気になる」の数と押した状態のクライアント側ストア。`LikeButton` が使い、同じタイミングで表示されたボタンの分を `get_post_like_counts` 1回（200件ごと）でまとめて取得する。押したときは見た目をすぐ変え、失敗したら戻す
- `postRules.ts` の `isPostOpen()`: 受付中か（気になるを押せるか）の判定
- `visitor.ts`: 端末ごとのランダムID（localStorage の `visitor_id`）。`getVisitorId()` は読むだけ、`getOrCreateVisitorId()` はなければ作って保存する。localStorage が使えないときはどちらも null を返すので、呼び出し側は記録を省く
- `seo.ts`: `pageMetadata()`。canonical と OG を毎回まとめて指定する（子の `openGraph` は親を丸ごと置き換えるため）
- `games.ts`: 試合の定数（種類・守備の記録方式とその説明・予定イニングと打順人数の範囲）と計算（`gameScore()` 得点、`gameResult()` 勝敗、`seasonYear()`・`seasonRange()`・`seasonLabel()` 年度、`gameDateLabel()`）
- `guestGames.ts`: ゲストの試合の編集用トークンを試合IDとセットで localStorage（`guest_games`）に保存する。読み書きは try/catch で、使えないときは空として扱う。`guestEditUrl()` は編集用リンク（トークンは # の後ろでサーバーに送らない）
- `players.ts`: 選手名簿の定数と表示（守備位置 `FIELD_POSITIONS`、投打の選択肢、`handednessLabel()`、背番号順の `comparePlayers()`）
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
| `post_views` | 募集の閲覧（同じ端末は1募集1日1回） | 不可（関数経由） | 不可（関数経由） |
| `post_likes` | 募集の「気になる」（同じ端末は1募集1回） | 不可（関数経由） | 不可（関数経由） |

`match_posts` の書き込み権限:

- ゲストの対戦相手募集（`team_id` なし）: 誰でも投稿・更新できる。削除はできない
- チームの対戦相手募集: そのチームの管理者のみ
- 助っ人・メンバー募集: `team_id` 必須で、そのチームの管理者のみ

他チームの情報を読むときは `teams` ではなく `team_profiles` を使う。`teams` に公開する列を足したら、`team_profiles` にも末尾に足す（`create or replace view` は列を末尾にしか追加できない）。

`match_posts` と `teams` の `city`（市区町村名）と `travel_range`（`市内のみ`、`30分圏内`、`1時間圏内`、`県内どこでも`）は任意項目で、既存データは null。`travel_range` は check 制約で値を制限している。チームの city は新規登録では必須、既存チームの編集では任意。

`match_posts` の連絡先（`contact_email`、`contact_phone`、`contact_other`）:

- `select` は列単位の権限で、anon / authenticated は連絡先3列を読めない。`select('*')`、連絡先列の指定、連絡先列での絞り込みはいずれも権限エラーになる
- 列を追加したら、公開する列を `grant select (列名)` し、`POST_COLUMNS` にも足す
- 読むときは `get_post_contacts(post_id)` を使う。返すのは掲載中の募集（`status = '募集中'` で、対戦相手・助っ人は試合日が今日（日本時間）以降、メンバーは `renewed_at` が60日以内）か、呼び出した人がそのチームの管理者のときだけ。それ以外は null
- 書き込みは今までどおり `insert` / `update` でできる
- 掲載が終わったゲスト募集の編集画面では連絡先を読めないので、空欄の項目は送信せず既存の値を残す（`PostForm` の `contactsHidden`）

閲覧数と気になる（`post_views`、`post_likes`）:

- 両テーブルとも API から直接は読み書きできない。下の関数（security definer）だけを使う。どれも `visitor_id`（`lib/visitor.ts`）を渡す
  - `record_post_view(p_post_id, p_visitor_id)`: 閲覧を記録。同じ端末は1日（日本時間）1回まで。そのチームの管理者と、ゲスト募集を投稿した端末の閲覧は記録しない。募集詳細の `RecordPostView` が表示後に呼ぶ（ボットらしき User-Agent と「終了しました」表示の募集では呼ばない）
  - `like_post(p_post_id, p_visitor_id)` / `unlike_post(p_post_id, p_visitor_id)`: 気になるの追加・取り消し。ログイン中なら `user_id` も残る。そのチームの管理者や、ゲスト募集を投稿した端末が呼んでも記録しない
  - `get_post_like_counts(p_post_ids[], p_visitor_id?)`: 気になる数を複数の募集でまとめて取得（最大200件、誰でも可）。0件の募集は行を返さない。`liked` はその端末が付けたか
  - `get_post_view_count(p_post_id, p_visitor_id?)`: 閲覧数（のべ）。チームの募集はそのチームの管理者、ゲスト募集は投稿した端末（`creator_visitor_id` が一致）だけ。それ以外は null
  - `get_post_view_counts(p_post_ids[], p_visitor_id?)`: 閲覧数を複数の募集でまとめて取得（最大200件）。見られる人の判定は `get_post_view_count` と同じで、見られない募集は null
- 表示: マイページの募集一覧と、募集詳細（管理者か投稿した端末のときだけ）に「閲覧◯回・気になる◯件」を出す（`PostStats`、`lib/postStats.ts`）
- `match_posts.creator_visitor_id`: ゲスト募集を投稿した端末。投稿時に保存し（`PostForm`、`QuickPostPage`）、select は grant していないので API からは読めない
- 端末IDは作り直せるため、閲覧数・気になる数の水増しを完全には防げない（同じ端末の連打を防ぐだけ）

トリガーと定期処理:

- `lock_post_ownership`: `team_id`、`created_by`、`post_type`、`source_post_id`、`creator_visitor_id` は投稿後に付け替え不可
- `check_post_source`: 助っ人募集の引き継ぎ元は同じチームの対戦相手募集のみ
- `delete_team_only_posts`: チーム削除で助っ人・メンバー募集も削除。対戦相手募集はゲスト募集として残る
- `prevent_removing_last_member`: 最後の管理者は削除不可
- `purge_expired_member_contacts`: pg_cron で毎月2日 03:00（日本時間）に実行。365日超のメンバー募集の連絡先を空にする

ロゴは Storage の `team-logos`（`{team_id}/logo`）で、書き込みは管理者のみ。

## スコア機能のテーブル

仕様は `docs/score-spec.md`。マイグレーションは `20261127000000_score_tables.sql`（段階①のデータのみ。画面はまだない）。

| テーブル | 内容 | 読み取り | 書き込み |
|---|---|---|---|
| `teams` の追加列 | `stats_public`（初期 false）、`innings_per_game`（7）、`qualify_pa_rate`（2.0）、`qualify_ip_rate`（1.0）、`season_start_month`（1）。`team_profiles` にも末尾に追加済み | | |
| `players` | 選手名簿（本名 `real_name` を含む） | 管理者のみ | 管理者 |
| `player_profiles`（ビュー） | 選手の公開情報（`real_name` なし）。成績公開チームと自チームの選手だけ返す | 誰でも | 不可 |
| `games` | 試合。`team_id` が null ならゲストの試合 | チームの試合: 管理者か `stats_public` なら誰でも。ゲストの試合: 直接は読めない | チームの試合: 管理者。ゲストの試合: 関数経由のみ |
| `game_lineups` | 打順・出場（先発と交代）。チームは `player_id`、ゲストは `guest_name`（と任意の `guest_bats`、`guest_throws`） | 試合と同じ（`can_view_game`） | 試合と同じ（`can_edit_game`） |
| `plate_appearances` | 打席。攻撃は `batter_lineup_id`、守備は `opponent_batting_slot` ＋ `pitcher_lineup_id` | 同上 | 同上 |
| `runner_events` | 走者の動き。打席の間の盗塁などは `plate_appearance_id` が null | 同上 | 同上 |
| `pitching_summaries` | 守備を「投手ごとの合計」で記録する試合の投手成績。`order_no` は登板順 | 同上 | 同上 |
| `pitching_decisions` | 勝・敗・S・H（W/L/S は1試合1人まで） | 同上 | 同上 |
| `player_season_imports` | 過去データ（選手ごとの年度合計、`p_` 始まりが投手） | 管理者か `stats_public` なら誰でも | 管理者 |
| `guest_game_secrets` | ゲストの試合の編集用トークンのハッシュと作った端末 | 不可（関数だけ） | 不可（関数だけ） |

データの決まり:

- 選手は `game_lineups.id` で指す。打席・走者・投手成績・勝敗はすべて `game_lineups` を参照し、同じ試合の行しか指せない（`(id, game_id)` の複合外部キー）。成績を選手ごとに集計するときは `game_lineups.player_id` で束ねる
- 得点は `runner_events.to_base = 'H'` の行。打者自身の進塁・得点も `from_base = 'B'` の行として記録する（本塁打なら B → H）。`earned`（自責点か）は守備時の得点だけ
- 投球回はアウト数（`outs`）で保存し、表示で「5 1/3」にする
- `plate_appearances.runners_before` は塁状況のビット和（1=一塁、2=二塁、4=三塁）。得点圏は `runners_before & 6 <> 0`
- `plate_appearances.seq` は試合内で一意（`deferrable` なので `seq = seq + 1` のような一括の振り直しはできる）
- 打席結果・走塁の理由・守備位置などの値は check 制約で限定している。値を増やすときはマイグレーションで制約を作り直す
- `games.status` は `入力中`／`確定`。成績の集計は確定した試合のみ（DB では強制していない）

権限の判定（security definer）:

- `can_edit_game(game_id)`: チームの試合で、そのチームの管理者か
- `can_view_game(game_id)`: チームの試合で、管理者か `stats_public` か（ゲストの試合は false）
- `can_view_team_stats(team_id)`: 管理者か `stats_public` か

トリガー:

- `players_lock_team`: 選手のチームは変えられない
- `games_lock_team`: 試合の `team_id` は付いたら変えられない（ゲスト→チームの取り込みだけ可）
- `game_lineups_check_player`: チームの試合は同じチームの名簿の選手が必須、ゲストの試合は `player_id` 不可
- `games_check_links`: `opponent_team_id`、`source_post_id` はチームの試合だけ
- 選手は試合に出ていると削除できない（退団は `active = false`）。チーム削除では試合・選手ごと消える
- 試合の画面: 試合情報のフォーム `GameInfoForm` はゲスト・チーム共通（自チーム名はゲストだけ）。終わり方（`end_reason`）は確定時に入れるのでフォームにない。打順人数は「9人／全員打ち（10〜30人）」。予定イニングの初期値はチームなら `teams.innings_per_game`、ゲストは7
- ゲストの試合の画面は匿名クライアント（`@/lib/supabase`）で関数を呼ぶ。試合情報だけを保存するときも、`get_score_game` で読んだ子の行を `save_guest_game` にそのまま送り返す（送らないと消える）
- `/scores` 以下はすべて noindex で、sitemap からも外している（`next-sitemap.config.js` の exclude。紹介ページにしたら `/scores` だけ外す）
- 名簿画面（`/mypage/players`）は `game_lineups(count)` と `player_season_imports(count)` で記録の有無を取り、記録がない選手にだけ削除ボタンを出す（過去データを取り込んだ選手も、削除すると取り込み分が消えるので削除させない）。表示名は必須で、本名と同じなら保存前に公開されることを確認する

ゲストの試合の関数（すべて security definer。`p_token` は編集用トークンの平文で、DB には SHA-256 のハッシュだけ保存）:

- `create_guest_game(p_visitor_id, p_game jsonb)` → `(game_id, edit_token)`: 作成。トークンを平文で受け取れるのはこの時だけ。同じ端末（`visitor_id`）は1日（日本時間）10試合まで（`guest_game_daily_limit`）
- `save_guest_game(p_game_id, p_token, p_game, p_lineups, p_plate_appearances, p_runner_events, p_pitching_summaries, p_pitching_decisions, p_expected_updated_at?)` → `(updated_at, conflict)`: 試合を丸ごと保存し、子の行は全部入れ替える。子の行の id はクライアントが決めて送る。`p_expected_updated_at` が今の値と違えば `conflict = true`（保存は後勝ちで行う）。`team_id`、`opponent_team_id`、`source_post_id`、`player_id` は無視する
- `check_guest_game_token(p_game_id, p_token)`: 編集用リンクのトークンが正しいか
- `delete_guest_game(p_game_id, p_token)`
- `get_score_game(p_game_id)` → jsonb（`game`、`lineups`、`plate_appearances`、`runner_events`、`pitching_summaries`、`pitching_decisions`）: `/scores/[id]` 用。ゲストの試合は id を知っていれば誰でも、取り込み済みの試合は `stats_public` か管理者のときだけ。選手名は `lineups[].name`（表示名か guest_name）
- `list_guest_games(p_game_ids[])`: 端末に保存した試合の一覧（最大50件）。得点も返す。取り込み済みは `imported = true` だけ
- `import_guest_game(p_game_id, p_token, p_team_id, p_player_map jsonb)`: チームへの取り込み（ログイン必須・管理者のみ）。`p_player_map` は `{ "<game_lineups.id>": "<players.id>" }` で全員分。名簿にない選手は先に `players` に追加しておく。取り込むとトークンは使えなくなる
- `purge_stale_guest_games()`: pg_cron で毎月3日 03:00（日本時間）に実行。チームに取り込まれず1年更新のないゲストの試合を削除

新しいテーブルは API に自動では公開されないので、マイグレーションで `grant` を明示している（スコアのテーブルを足すときも同じ）。

スキーマ変更は `supabase/migrations/` に追加する。`supabase/schema.sql` にはチーム機能以降が反映されていないので、現在の定義はマイグレーションを見る。
