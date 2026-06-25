# ワンピース カード ゲーム デッキ管理アプリ

ワンピース カード ゲームのカード閲覧・デッキ構築をローカルで行うウェブアプリです。

## 技術スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | React 19 + TypeScript + Vite |
| バックエンド | FastAPI + Python 3.9+ |
| データベース | SQLite（WALモード） |
| 仮想スクロール | @tanstack/react-virtual |

---

## セットアップ

### 必要環境

- Python 3.9 以上
- Node.js 18 以上

### 初回セットアップ

```bash
# 1. バックエンド依存パッケージをインストール
cd backend
pip install -r requirements.txt

# 2. カードデータをインポート（初回のみ・数分かかります）
python -m scripts.import_all           # EN → JP → プロモ を一括インポート

# 個別実行する場合（この順序で実行すること）
# python -m scripts.import_cards       # STEP1: EN API からセット・プロモカードを取得
# python -m scripts.import_cards_ja    # STEP2: JP公式サイトから日本語名・テキストを付与
# python -m scripts.import_promos_jp   # STEP3: JP公式サイトからプロモカード詳細を補完

# 3. フロントエンド依存パッケージをインストール
cd ../frontend
npm install
```

### 起動

```bash
# ターミナル1: バックエンド
cd backend
python -m uvicorn main:app --reload

# ターミナル2: フロントエンド
cd frontend
npm run dev
```

ブラウザで `http://localhost:5173` を開くと起動します。

---

## カードデータの更新

新弾・新プロモカードが追加されたときは以下を実行します。

```bash
cd backend
python -m scripts.import_all
```

各スクリプトは UPSERT で実装されており、重複実行しても既存データ（日本語名・テキスト等）は保護されます。

---

## 機能一覧

### カード一覧 (`/cards`)

- 全カードを画像グリッドで表示（仮想スクロール対応）
- 検索：カード名・カード番号の部分一致
- フィルタ：色・種別・コスト
- ソート：カード番号・弾順・コスト・パワー・名前順（昇降両対応）
- カードクリックで詳細モーダル（テキスト・スタッツ表示）

### デッキ一覧 (`/`)

- 作成済みデッキの一覧表示（リーダー画像・枚数付き）
- デッキクリックでプレビューモーダル（カード一覧を2列サムネイル表示）
- モーダルから直接デッキ編集へ遷移可能
- 新規デッキ作成：デッキ名入力 → リーダー選択

### デッキ編集 (`/deck/:id`)

- **サムネイルストリップ**：デッキ内カードを上部に横並びで一覧表示
- カードグリッドからカードをクリック → 詳細モーダルで枚数を指定して追加
  - 既にデッキに入っているカードは現在の枚数がデフォルト表示
  - 枚数 0 にすると「デッキから削除」
  - 色制限（リーダー色と合わないカード）はボタンをグレーアウト
- 保存時にバックエンドでデッキバリデーション
  - メインデッキ合計ちょうど50枚
  - 同名カード最大4枚
  - リーダーの色に含まれる色のカードのみ

---

## ディレクトリ構成

```
onepiece-self-play/
├── backend/
│   ├── main.py              # FastAPI アプリ・ルーター登録
│   ├── database.py          # SQLite接続・スキーマ初期化
│   ├── models.py            # Pydanticモデル
│   ├── routes/
│   │   ├── cards.py         # GET /api/cards, GET /api/cards/{id}
│   │   ├── decks.py         # CRUD /api/decks, PUT /api/decks/{id}/cards
│   │   └── images.py        # GET /image/{card_id}（プロキシ＆キャッシュ）
│   ├── scripts/
│   │   ├── import_all.py        # 上記3スクリプトを順に一括実行
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
│   │   │   ├── CardBrowser.tsx  # カード一覧・検索
│   │   │   ├── DeckList.tsx     # デッキ一覧
│   │   │   └── DeckBuilder.tsx  # デッキ編集
│   │   ├── components/
│   │   │   ├── CardGrid.tsx     # 仮想スクロールグリッド（自動リサイズ対応）
│   │   │   ├── CardTile.tsx     # カード1枚（画像・バッジ）
│   │   │   ├── CardDetail.tsx   # カード詳細モーダル
│   │   │   ├── DeckPanel.tsx    # デッキパネル
│   │   │   ├── FilterPanel.tsx  # 色・種別・コストフィルタ
│   │   │   └── SearchBar.tsx    # 検索バー
│   │   ├── api/
│   │   │   └── client.ts        # fetchラッパー（APIクライアント）
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
| `color` | string[] | 色フィルタ（複数可） |
| `cost` | int[] | コストフィルタ（複数可） |
| `category` | string[] | 種別フィルタ（Leader / Character / Event / Stage） |
| `set_code` | string[] | 弾コードフィルタ |
| `sort` | string | ソートキー（`id` / `id_desc` / `set` / `cost_asc` / `cost_desc` / `power_asc` / `power_desc` / `name`） |
| `limit` | int | 取得件数（デフォルト100） |
| `offset` | int | ページネーション |

---

## 画像キャッシュについて

`GET /image/{card_id}` は以下の順で画像を返します。

1. `backend/cache/{card_id}.png` が存在すれば即返却
2. 存在しなければ JP公式サイトから取得してキャッシュに保存してから返却
3. 取得失敗時は 404

キャッシュは `backend/cache/` に蓄積されます。不要になった場合は手動削除して構いません。

---

## デッキバリデーションルール

保存時（`save=true`）にバックエンドで以下を検証します。いずれかに違反すると 422 エラーでエラーメッセージ一覧が返ります。

1. メインデッキはちょうど **50枚**
2. 同名カードは最大 **4枚**
3. デッキに入れられるのはリーダーの **色に含まれるカードのみ**
