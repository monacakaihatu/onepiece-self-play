"""
カードデータを一括インポートする。
実行: python -m scripts.import_all  (backend/ ディレクトリから)

順序:
  1. import_cards      - optcgapi.com から英語データを取得
  2. import_cards_ja   - JP公式サイトから日本語名・テキストを補完
  3. import_promos_jp  - JP公式サイトからプロモカードを補完
"""
from __future__ import annotations
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.import_cards import main as import_en
from scripts.import_cards_ja import run as import_ja
from scripts.import_promos_jp import main as import_promos


async def main():
    print("=" * 50)
    print("STEP 1/3: 英語データ (optcgapi.com)")
    print("=" * 50)
    await import_en()

    print()
    print("=" * 50)
    print("STEP 2/3: 日本語データ (JP公式サイト)")
    print("=" * 50)
    await import_ja()

    print()
    print("=" * 50)
    print("STEP 3/3: プロモカード補完 (JP公式サイト)")
    print("=" * 50)
    await import_promos()

    print()
    print("全インポート完了")


if __name__ == "__main__":
    asyncio.run(main())
