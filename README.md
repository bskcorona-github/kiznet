# Kiznet - 家系図作成Webアプリケーション

直感的に操作できる家系図作成Webアプリケーション「Kiznet」のドキュメントです。

## 🌟 主な機能

### ✨ 直感的な操作
- **ドラッグ&ドロップ**による人物の配置と移動
- **視覚的なノード接続**で親子関係・配偶者関係を簡単作成
- **リアルタイムプレビュー**で変更を即座に確認

### 🎯 自動レイアウト
- **ELK.js**を使った世代別自動整列
- **React Flow**によるズーム・パン操作
- **ミニマップ**で全体構造を把握

### 📊 データ管理
- **CRUD操作**：人物情報の作成・編集・削除
- **検索・フィルタ**：名前検索、性別・生存状況でのフィルタリング
- **Undo/Redo**：操作履歴の管理

### 📤 エクスポート・インポート
- **CSV形式**：Excel等で編集可能な3ファイル出力
- **JSON形式**：完全なデータバックアップと復元
- **印刷・PDF**：A4横向きに最適化されたレイアウト

### 👥 サンプルデータ
- **3世代のサンプル家族**で機能をすぐに体験
- **ワンクリック投入**で動作確認

## 🛠 技術スタック

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **React Flow** - インタラクティブなグラフUI
- **ELK.js** - 自動レイアウトエンジン
- **Tailwind CSS** - スタイリング
- **shadcn/ui** - UIコンポーネント

### State Management
- **Zustand** - 軽量状態管理
- **React Hook Form** - フォーム管理
- **Zod** - スキーマバリデーション

### Backend & Database
- **Neon (PostgreSQL)** - クラウドデータベース
- **Drizzle ORM** - タイプセーフORM
- **Next.js API Routes** - サーバーレスAPI

### Utilities
- **date-fns** - 日付処理
- **Papa Parse** - CSV処理
- **Lucide React** - アイコン

## 🚀 セットアップ手順

### 1. 環境要件
- Node.js 18.17+ 
- pnpm (推奨) または npm

### 2. リポジトリのクローン
```bash
git clone <repository-url>
cd kiznet
```

### 3. 依存関係のインストール
```bash
pnpm install
```

### 4. 環境変数の設定
```bash
# .env.local ファイルを作成
cp .env.example .env.local
```

`.env.local` ファイルを編集して、Neon PostgreSQLの接続URLを設定：
```env
NEON_DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
```

### 5. データベースのセットアップ
```bash
# マイグレーション実行
pnpm drizzle:push

# データベースの確認（任意）
pnpm drizzle:studio
```

### 6. 開発サーバーの起動
```bash
pnpm dev
```

アプリケーションが http://localhost:3000 で起動します。

## 📊 データベース設計

### テーブル構成

#### trees（家系図）
- `id` - 家系図ID (primary key)
- `name` - 家系図名
- `description` - 説明
- `created_at`, `updated_at` - タイムスタンプ

#### people（人物）
- `id` - 人物ID (primary key)
- `tree_id` - 家系図ID (foreign key)
- `first_name`, `last_name` - 名前
- `sex` - 性別 (male/female/other/unknown)
- `birth_date`, `death_date` - 生年月日、没年月日
- `is_deceased` - 故人フラグ
- `email`, `phone` - 連絡先
- `address`, `city`, `prefecture`, `country` - 住所
- `note` - 備考
- `created_at`, `updated_at` - タイムスタンプ

#### relationships（親子関係）
- `id` - 関係ID (primary key)
- `tree_id` - 家系図ID
- `parent_id`, `child_id` - 親・子のID
- 循環参照の検出・防止機能付き

#### partnerships（配偶者関係）
- `id` - 関係ID (primary key)
- `tree_id` - 家系図ID
- `partner_a_id`, `partner_b_id` - パートナーのID（正規化済み）
- `start_date`, `end_date` - 開始・終了日
- `type` - 関係タイプ (marriage/partner)

## 🎨 主要コンポーネント

### TreeCanvas
React Flowベースのメインキャンバス。人物ノードの表示・操作を担当。

### PersonNode
個人情報を表示するカスタムノード。基本情報、生没年、住所などを視覚的に表現。

### Toolbar
各種操作ボタンを配置。人物追加、関係作成、レイアウト、エクスポートなど。

### SidePanel
選択された人物の詳細編集パネル。フォームバリデーション付き。

### SearchPanel
名前検索と各種フィルタリング機能を提供。

### ExportImportDialog
CSV/JSONでのデータエクスポート・インポート機能。

## 📖 使用方法

### 基本的な操作流れ

1. **家系図の作成**
   - ホームページで新規家系図を作成
   - または「サンプルを試す」で体験

2. **人物の追加**
   - ツールバーの「人物追加」ボタン
   - 名前を入力して追加

3. **関係の作成**
   - 人物ノードを選択
   - 「親子関係」または「配偶者関係」ボタン
   - 対象ノードを選択して関係を作成

4. **自動レイアウト**
   - 「自動整列」ボタンで世代別に整理

5. **詳細編集**
   - 人物ノードをクリックして選択
   - 右側パネルで詳細情報を編集

6. **データ管理**
   - エクスポート：CSV/JSON形式でダウンロード
   - インポート：JSON形式でアップロード
   - 印刷：ブラウザの印刷機能でPDF化

### キーボードショートカット

- `Ctrl+Z` - 元に戻す（Undo）
- `Ctrl+Shift+Z` - やり直し（Redo）
- `Ctrl+F` - 画面にフィット
- `Delete` - 選択項目の削除

## 🚀 デプロイメント（Vercel）

### 1. Vercelプロジェクトの作成
```bash
# Vercel CLIをインストール（初回のみ）
npm i -g vercel

# プロジェクトをデプロイ
vercel --prod
```

### 2. 環境変数の設定
Vercelダッシュボードで以下の環境変数を設定：
- `NEON_DATABASE_URL` - NeonデータベースのURL

### 3. 本番デプロイの確認
- ビルドが成功することを確認
- データベース接続が正常に動作することを確認

## 🧪 開発・テスト

### 開発コマンド
```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# 本番サーバー起動
pnpm start

# リンター
pnpm lint

# データベース管理
pnpm drizzle:push    # スキーマをDBに反映
pnpm drizzle:studio  # データベースブラウザ起動
```

### ディレクトリ構成
```
src/
├── app/                 # Next.js App Router
│   ├── api/            # APIルート
│   ├── editor/         # エディターページ
│   ├── print/          # 印刷用ページ
│   └── page.tsx        # ホームページ
├── components/         # Reactコンポーネント
│   ├── ui/            # shadcn/ui コンポーネント
│   ├── TreeCanvas.tsx
│   ├── PersonNode.tsx
│   └── ...
├── lib/               # ユーティリティ関数
├── stores/            # Zustand ストア
├── types/             # TypeScript型定義
└── server/
    └── db/            # データベース関連
```

## 🐛 トラブルシューティング

### よくある問題

**Q: データベース接続エラーが発生する**
A: `.env.local`のNEON_DATABASE_URLが正しく設定されているか確認してください。

**Q: 自動レイアウトが動作しない**
A: ブラウザのJavaScriptが有効になっているか確認し、ページを再読み込みしてください。

**Q: エクスポートしたCSVが文字化けする**
A: ExcelでCSVを開く際は、「データ」→「テキストからデータ」でUTF-8エンコーディングを指定してください。

**Q: 印刷時にレイアウトが崩れる**
A: ブラウザの印刷設定で「横向き」「A4サイズ」を選択してください。

### ログの確認
```bash
# 開発環境でのログ確認
pnpm dev

# ビルドエラーの確認
pnpm build
```

## 🤝 貢献方法

1. Issueでバグ報告や機能提案
2. フォーク後、フィーチャーブランチで開発
3. プルリクエストの作成

## 📄 ライセンス

このプロジェクトはMITライセンスのもとで公開されています。

## 📞 サポート

- **GitHub Issues**: バグ報告・機能要望
- **Documentation**: このREADMEファイル
- **Demo**: https://your-demo-url.vercel.app

---

**Kiznet** - 家族の繋がりを視覚化し、世代を超えて受け継がれる絆を大切にするアプリケーションです。
