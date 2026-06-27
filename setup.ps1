# setup.ps1 — 初回セットアップ & 起動
# 実行: powershell -ExecutionPolicy Bypass -File setup.ps1

$root = $PSScriptRoot
$ErrorActionPreference = "Stop"

function Step($n, $msg) {
    Write-Host ""
    Write-Host "=== [$n] $msg ===" -ForegroundColor Cyan
}

# --- 1. バックエンド依存パッケージ ---
Step "1/4" "バックエンド依存パッケージをインストール"
pip install -r "$root\backend\requirements.txt"

# --- 2. カードデータインポート ---
Step "2/4" "カードデータをインポート（初回は数分かかります）"
Set-Location "$root\backend"
python -m scripts.import_all

# --- 3. フロントエンド依存パッケージ ---
Step "3/4" "フロントエンド依存パッケージをインストール"
Set-Location "$root\frontend"
npm install

# --- 4. サーバー起動 ---
Step "4/4" "サーバーを起動"
Write-Host "  バックエンド → http://localhost:8000" -ForegroundColor Green
Write-Host "  フロントエンド → http://localhost:5173" -ForegroundColor Green
Write-Host ""

# バックエンドを別ウィンドウで起動
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "Write-Host 'Backend starting...' -ForegroundColor Cyan; Set-Location '$root\backend'; python -m uvicorn main:app --reload"

# フロントエンドをこのウィンドウで起動
Set-Location "$root\frontend"
npm run dev
