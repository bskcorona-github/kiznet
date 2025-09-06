## kiznet 家系図アプリ (MVP)

### セットアップ

1. 依存インストール
   ```bash
   pnpm install
   ```
2. 環境変数設定 `.env.local`
   ```bash
   POSTGRES_URL=（Vercel Postgres の接続文字列）
   ```
3. Drizzle マイグレーション
   ```bash
   pnpm drizzle-kit generate
   pnpm drizzle-kit push
   ```
4. 開発起動
   ```bash
   pnpm dev
   ```

### 機能
- ダッシュボード `/`：一覧・新規作成・削除
- エディタ `/trees/[id]`：人物の追加/編集/削除、CSV エクスポート、印刷

### 受け入れチェック
- [ ] `/` でツリー一覧表示 & 新規作成→遷移
- [ ] `/trees/[id]` で人物の追加・編集・削除
- [ ] CSV(persons/relationships) ダウンロード
- [ ] 印刷時に不要UI非表示（A4横）
