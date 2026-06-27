# dev.ps1 — 開発サーバー起動
# 実行: powershell -ExecutionPolicy Bypass -File dev.ps1

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).ProviderPath }
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

Write-Host "  back end  -> http://localhost:8000" -ForegroundColor Green
Write-Host "  front end -> http://localhost:5173" -ForegroundColor Green
Write-Host ""

# バックエンドを別ウィンドウで起動（cmd /k で確実にディレクトリ変更）
Start-Process cmd -ArgumentList "/k cd /d `"$backend`" && python -m uvicorn main:app --reload"

# フロントエンドをこのウィンドウで起動
npm --prefix "$frontend" run dev
