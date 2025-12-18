# LVLUP Learn - プロジェクト設計ドキュメント

## プロジェクト概要

### コンセプト

- **ターゲット**: 予定立てられない / 立てたくない人向けの勉強時間記録アプリ
- **設計思想**: 「やるだけ偉い」「予定を達成できなくてもいい」「過去にとらわれず未来を見る」
- **シンプルさ重視**: 無駄な UI や機能はつけない

### 技術スタック

- **バックエンド**: Cloudflare Workers + Hono
- **フロントエンド**: Nuxt 4 + Cloudflare Pages
- **認証**: Firebase Authentication
- **データベース**: Cloudflare D1 (SQLite)
- **決済**: Stripe
- **AI**: Cloudflare Workers AI

## アーキテクチャ

### バックエンド構成

- **API サーバー専用**: Cloudflare Workers で API サーバーとして運用
- **認証必須**: すべてのエンドポイントで認証が必要
- **レイヤー構成**:
  - Routes: Hono のエンドポイント
  - Repositories: DB アクセス層
  - Services: ビジネスロジック（必要に応じて）

### 認証フロー

1. **フロントエンド**: Firebase Client SDK でログイン → ID トークン取得
2. **バックエンド**: ID トークンを検証 → `c.get('user')` でユーザー情報取得
3. **プラン情報**: D1 Database から取得（毎回確認）

## データベース設計

### テーブル構成

#### schedules（予定）

- `id`: UUID
- `userId`: Firebase uid
- `date`: 日付（YYYY-MM-DD）
- `title`: タイトル
- `subtitle`: サブタイトル
- `duration`: 予定勉強時間（分）
- `color`: 色
- `createdAt`: 作成日時
- `updatedAt`: 更新日時

**特徴**:

- 明日までしか決められない
- 本日分を過ぎると見れない（過去にとらわれない設計）

#### study_sessions（勉強セッション）

- `id`: UUID
- `userId`: Firebase uid
- `scheduleId`: スケジュール ID（nullable、予定なしでも OK）
- `startTime`: 開始時刻（Unix timestamp）
- `endTime`: 終了時刻（Unix timestamp）
- `duration`: 実際の勉強時間（分）
- `tags`: タグ（JSON 配列、Pro 以上のみ）
- `createdAt`: 作成日時

**特徴**:

- 予定なしでも開始可能
- 実績の主役（可視化のベース）

#### user_subscriptions（サブスクリプション）

- `id`: UUID
- `userId`: Firebase uid（unique）
- `plan`: プラン（'free' | 'pro' | 'premium'）
- `subscriptionEndsAt`: サブスク終了日時（Unix timestamp）
- `trialEndsAt`: トライアル終了日時（Unix timestamp）
- `stripeCustomerId`: Stripe 顧客 ID
- `stripeSubscriptionId`: Stripe サブスクリプション ID
- `createdAt`: 作成日時
- `updatedAt`: 更新日時

#### ai_coach_usage（AI コーチ使用履歴）

- `id`: UUID
- `userId`: Firebase uid
- `usedAt`: 使用日時（Unix timestamp）
- `logCount`: 使用したログ件数

#### processed_webhook_events（Webhook 処理済みイベント）

- `eventId`: Stripe イベント ID（primary key）
- `processedAt`: 処理日時（Unix timestamp）

## サブスクリプションプラン

### 料金設定

- **Free**: 無料
- **Pro**: 年額 4,000 円（月額換算約 333 円）
- **Premium**: 年額 6,000 円（月額換算約 500 円）+ 7 日間無料トライアル

### 機能比較

| 機能                     | Free      | Pro       | Premium      |
| ------------------------ | --------- | --------- | ------------ |
| **学習ログ保存上限**     | 500 件    | 10,000 件 | 100,000 件   |
| **AI コーチ使用回数/日** | 3 回      | 10 回     | 50 回        |
| **AI コーチ最大件数**    | 30 件     | 300 件    | 1,000 件     |
| **AI モデル性能**        | 軽量 (8B) | 軽量 (8B) | 高性能 (70B) |
| **自動タグ付け**         | ❌        | ✅        | ✅           |
| **タグ別集計**           | ❌        | ✅        | ✅           |

### 保存上限の処理

- **LIFO 方式**: 上限を超えたら古いものから自動削除
- **ユーザー体験**: 上限超えても使えなくなるのではなく、古いデータが消える

## 機能設計

### コア機能

#### 1. スケジュール機能

- **明日までしか決められない**: 甘い設定でプレッシャーを減らす
- **予定なしで開始可能**: 突然始められる設計
- **本日分を過ぎると見れない**: 過去にとらわれない

#### 2. 勉強時間記録

- **タイマー機能**: 開始・終了で時間を記録
- **予定なしでも OK**: スケジュールなしで開始可能
- **実績重視**: 「やった事実」を記録

#### 3. 可視化

- **日別の勉強時間**: 棒グラフなど
- **タグ別集計**: Pro 以上で利用可能
- **過去の実績**: 予定は見れないが、実績は見れる

### AI 機能

#### AI コーチ

- **機能**: 勉強時間の履歴を見て、ポジティブなコメントを生成
- **コンセプト**: 「やるだけ偉い」「説教しない」
- **制限**: プランごとに使用回数と最大件数が異なる

#### 自動タグ付け（Pro 以上）

- **機能**: 勉強セッションから自動でタグを生成
- **用途**: 可視化ページで「英語に ◯ 時間、数学に △ 時間」を表示
- **ユーザー負担**: 手入力不要

## 実装のポイント

### 認証

- **Firebase Authentication**: フロントエンドでログイン
- **ID トークン検証**: バックエンドで検証
- **プラン情報**: D1 Database から取得（毎回確認）

### 決済（Stripe）

- **Webhook**: Stripe が自動的に定期更新を管理
- **イベント処理**: `checkout.session.completed`, `invoice.payment_succeeded` など
- **冪等性**: イベント ID を DB に保存して重複処理を防ぐ
- **エラーハンドリング**: Sentry でログ監視

### プラン情報の管理

- **保存場所**: D1 Database（`user_subscriptions`テーブル）
- **取得方法**: 毎回 DB から取得（無料枠が大きいため問題なし）
- **更新タイミング**: Stripe Webhook で自動更新

### データ保存上限の処理

// LIFO 方式で古いデータを削除
if (currentCount >= maxRecords) {
const deleteCount = currentCount - maxRecords + 1
// 古い順（startTime が古い順）で削除
await db.delete(study_sessions)
.where(/_ 古い順で削除 _/)
}## コスト試算

### Cloudflare 無料枠

- **Workers**: 1 日 10 万リクエストまで無料
- **D1**: 5GB ストレージ、500 万行読み取り/月まで無料
- **KV**: 10 万回読み取り/日まで無料
- **Workers AI**: 無料枠あり

### 想定ユーザー数でのコスト

- **1,000 ユーザー**: ほぼ無料枠内で運用可能
- **月間コスト**: 約 1,500-3,000 円（無料枠を活用）

### 収益性

- **月間収益**: 約 58,333 円（想定）
- **月間コスト**: 約 4,500-7,000 円
- **利益率**: 約 88-92%

## 開発方針

### シンプルさ重視

- **無駄な機能はつけない**: 必要最小限の機能
- **UI もシンプル**: 複雑な画面は作らない
- **コンセプトを守る**: 「やるだけ偉い」「予定立てられない人向け」

### MVP の優先順位

1. **コア機能**: 勉強時間記録、タイマー、可視化
2. **サブスクリプション**: Stripe 連携、プラン管理
3. **AI 機能**: AI コーチ、自動タグ付け
4. **広告**: 後から追加（最初はなし）

## テスト戦略

### Jest を使用

- **Repository 層**: Drizzle をモックしてテスト
- **API 層**: Hono の`app.request()`でテスト
- **認証**: モックユーザーでテスト

## セキュリティ

### 認証

- **Firebase ID トークン**: すべてのリクエストで検証
- **認証必須**: すべてのエンドポイントで`mustAuth`ミドルウェアを使用

### データ保護

- **ユーザー分離**: `userId`でデータを分離
- **プラン制限**: プランごとの制限を API 側でチェック

### 決済

- **Stripe Webhook 署名検証**: 偽造リクエストを防ぐ
- **冪等性**: 同じイベントを何度処理しても安全

## 今後の拡張案

### 機能追加の候補

1. **自動タグ付け**: Pro 以上で実装済み
2. **ゆるい連続記録**: プレッシャーにならない連続記録
3. **週間達成通知**: 承認だけ、評価はしない
4. **勉強開始の「きっかけ」記録**: 任意のメモ

### 広告

- **最初はなし**: MVP では広告なし
- **後から追加**: ユーザーが増えてから検討
- **Pro 以上で排除**: 有料プランでは広告なし

## 参考情報

### 技術ドキュメント

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Documentation](https://hono.dev/)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

### 設計の背景

- **ニッチ市場**: 「予定立てられない人向け」に特化
- **競合との差別化**: 一般的なアプリとは異なるコンセプト
- **シンプルさ**: 必要最小限の機能で継続しやすく

---

最終更新: 2025-12-17
