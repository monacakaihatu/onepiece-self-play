# VIVRE — ワンピース カード ゲーム デッキ管理・練習アプリ

ワンピース カード ゲームのカード閲覧・デッキ構築・一人回し練習をローカルで行うウェブアプリです。

## 技術スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | React 19 + TypeScript + Vite |
| バックエンド | FastAPI + Python 3.9+ |
| データベース | SQLite（WALモード） |

---

## セットアップ（初回）

### 必要環境

- Python 3.9 以上
- Node.js 18 以上

### 初回セットアップ & 起動（1コマンド）

```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

以下を自動で実行します：

1. バックエンド依存パッケージのインストール
2. カードデータのインポート（optcgapi.com + JP公式サイト、数分かかります）
3. フロントエンド依存パッケージのインストール
4. バックエンド・フロントエンドの同時起動

ブラウザで `http://localhost:5173` を開くと起動します。

---

## 2回目以降の起動

```powershell
powershell -ExecutionPolicy Bypass -File dev.ps1
```

---

## カードデータの更新

新弾・新プロモカードが追加されたときは以下を実行します。

```powershell
cd backend
python -m scripts.import_all
```

各スクリプトは UPSERT で実装されており、重複実行しても既存データ（日本語名・テキスト等）は保護されます。

---

## 機能一覧

### ホーム (`/`)

- カード一覧・デッキ管理・一人回しへのナビゲーション
- ハンバーガーメニューで全画面へのクイックアクセス

### カード一覧 (`/cards`)

- 全カードを画像グリッドで表示（無限スクロール）
- 検索：カード名・カード番号の部分一致
- フィルタ：色 / 種別 / コスト / レアリティ / **ブロック（S1〜S4・PROMO）** / **収録弾（OP01〜OP10・ST01〜ST21・EB01）** / 特徴
- ソート：カード番号・弾順・コスト・パワー・名前順（昇降両対応）
- カードクリックで詳細モーダル（テキスト・スタッツ表示）

### デッキ一覧 (`/decks`)

- 作成済みデッキの一覧表示（リーダー画像・枚数付き）
- デッキクリックでプレビューモーダル（カード一覧サムネイル表示）
- モーダルから直接デッキ編集へ遷移可能
- 新規デッキ作成：デッキ名入力 → リーダー選択

### デッキ構築 (`/deck/:id`)

- **サムネイルストリップ**：デッキ内カードを上部に横並びで一覧表示
- **採用候補カード欄**：検討中のカードを一時保存（localStorage で永続化）
- カードグリッドからカードをクリック → 詳細モーダルで枚数を指定して追加
  - リーダーの色と合わないカードはボタンをグレーアウト
  - 枚数 0 にすると「デッキから削除」
- 保存時バリデーション（50枚超過・同名4枚超・色違反のみ。50枚未満でも保存可）

### 一人回し（`/simulate` → `/duel/:firstId/:secondId`）

- 2デッキでマリガン＆ドロー練習が可能
- セットアップ画面でデッキA・Bを選択（50枚のデッキのみ選択可）
- マリガンフェーズ：各プレイヤー5枚のスタート手札 → 全替え or キープ
- ゲームフェーズ：ドン加速・ターン切り替え・手札管理・ライフ管理

---

## ディレクトリ構成

```
onepiece-self-play/
├── setup.ps1            # 初回セットアップ & 起動（1コマンド）
├── dev.ps1              # 2回目以降の起動
├── backend/
│   ├── main.py              # FastAPI アプリ・ルーター登録
│   ├── database.py          # SQLite接続・スキーマ初期化・マイグレーション
│   ├── models.py            # Pydanticモデル
│   ├── sets.py              # 収録弾コード→ブロック・弾名対応表
│   ├── routes/
│   │   ├── cards.py         # GET /api/cards, GET /api/cards/{id}
│   │   ├── decks.py         # CRUD /api/decks, PUT /api/decks/{id}/cards
│   │   └── images.py        # GET /image/{card_id}（プロキシ＆キャッシュ）
│   ├── scripts/
│   │   ├── import_all.py        # 下記3スクリプトを順に一括実行
│   │   ├── import_cards.py      # STEP1: EN API からカードデータ取得
│   │   ├── import_cards_ja.py   # STEP2: JP公式サイトから日本語名・テキスト取得
│   │   └── import_promos_jp.py  # STEP3: JP公式サイトからプロモカード詳細を補完
│   ├── cache/               # 画像キャッシュ（.gitignore対象）
│   ├── db/                  # SQLite DBファイル（.gitignore対象）
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx         # ホーム画面
│   │   │   ├── CardBrowser.tsx  # カード一覧・検索
│   │   │   ├── DeckList.tsx     # デッキ一覧
│   │   │   ├── DeckBuilder.tsx  # デッキ編集・候補カード管理
│   │   │   ├── SimulatorSetup.tsx  # 一人回し デッキ選択
│   │   │   └── SimulatorDuel.tsx   # 一人回し ゲーム画面
│   │   ├── components/
│   │   │   ├── AppHeader.tsx    # 全画面共通ヘッダー（ロゴ・ハンバーガーメニュー）
│   │   │   ├── AppLogo.tsx      # VIVREロゴ（SVG）
│   │   │   ├── CardGrid.tsx     # カードグリッド（自動リサイズ対応）
│   │   │   ├── CardTile.tsx     # カード1枚（画像・バッジ）
│   │   │   ├── CardDetail.tsx   # カード詳細モーダル
│   │   │   ├── FilterPanel.tsx  # 全フィルタパネル
│   │   │   └── SearchBar.tsx    # 検索バー
│   │   ├── api/
│   │   │   └── client.ts        # APIクライアント
│   │   └── types/index.ts       # 型定義
│   └── package.json
└── README.md
```

---

## API エンドポイント一覧

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/cards` | カード一覧（フィルタ・ソート・ページネーション対応） |
| GET | `/api/cards/{id}` | カード1件取得 |
| GET | `/api/decks` | デッキ一覧 |
| POST | `/api/decks` | デッキ新規作成 |
| GET | `/api/decks/{id}` | デッキ詳細（カード一覧含む） |
| PUT | `/api/decks/{id}` | デッキ名・リーダー変更 |
| DELETE | `/api/decks/{id}` | デッキ削除 |
| PUT | `/api/decks/{id}/cards` | デッキ内カード更新（`save=true` でバリデーション実施） |
| GET | `/image/{card_id}` | カード画像（ローカルキャッシュ→JP公式サイトへフォールバック） |

`GET /api/cards` の主なクエリパラメータ：

| パラメータ | 型 | 説明 |
|------------|-----|------|
| `q` | string | カード名・番号の部分一致検索 |
| `color` | string[] | 色フィルタ（Red / Blue / Green / Yellow / Black / Purple） |
| `cost` | int[] | コストフィルタ（複数可） |
| `category` | string[] | 種別フィルタ（Leader / Character / Event / Stage） |
| `rarity` | string[] | レアリティフィルタ（L / SEC / SR / R / UC / C / PR など） |
| `block` | string[] | ブロックフィルタ（S1 / S2 / S3 / S4 / PROMO） |
| `set_code` | string[] | 弾コードフィルタ（OP01〜OP10 / ST01〜ST21 / EB01 など） |
| `sub_types` | string | 特徴の部分一致検索（例: `麦わらの一味`） |
| `sort` | string | ソートキー（`id` / `id_desc` / `set` / `cost_asc` / `cost_desc` / `power_asc` / `power_desc` / `name`） |
| `limit` | int | 取得件数（デフォルト100） |
| `offset` | int | ページネーション |

---

## 画像キャッシュについて

`GET /image/{card_id}` は以下の順で画像を返します。

1. `backend/cache/{card_id}.png` が存在すれば即返却（`Cache-Control: public, max-age=604800`）
2. 存在しなければ JP公式サイトから取得してキャッシュに保存してから返却
3. 取得失敗時は 404（`backend/cache/_missing/` にマーカーを記録して再フェッチを抑制）

---

## デッキバリデーションルール

保存時（`save=true`）にバックエンドで以下を検証します。

| ルール | 内容 |
|--------|------|
| 枚数上限 | メインデッキは **50枚以内**（50枚未満でも保存可） |
| 同名制限 | 同名カードは最大 **4枚** |
| 色制限 | リーダーの **色に含まれるカードのみ** 投入可 |
