"""
日本公式サイトからカードの日本語名とテキストを取得してDBを更新する。
実行: python -m scripts.import_cards_ja (backend/ ディレクトリから)
"""
from __future__ import annotations
import asyncio
import re
import sys
import urllib.request
import urllib.parse
import html as html_module
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import aiosqlite
from database import DB_PATH

JP_CARDLIST_URL = "https://www.onepiece-cardgame.com/cardlist/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "ja,en;q=0.9",
}



def _fetch_series_map() -> dict[str, str]:
    """JP公式サイトのシリーズ一覧を取得し {セットコード: 内部ID} を返す"""
    req = urllib.request.Request(JP_CARDLIST_URL, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        html = r.read().decode("utf-8")

    options = re.findall(r'<option\s+value="(\d+)"[^>]*>(.*?)</option>', html)
    series_map: dict[str, str] = {}
    for val, label in options:
        label_clean = html_module.unescape(label)
        code = re.search(r"【([A-Z0-9-]+)】", label_clean)
        if code:
            series_map[code.group(1)] = val
    return series_map


def _fetch_series_cards(series_id: str) -> dict[str, dict]:
    """指定シリーズのカードデータ {card_id: {name_ja, effect_text_ja}} を返す"""
    data = urllib.parse.urlencode({"search": "true", "series": series_id}).encode()
    req = urllib.request.Request(JP_CARDLIST_URL, data=data, headers={
        **HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
    })
    with urllib.request.urlopen(req, timeout=20) as r:
        html = r.read().decode("utf-8")

    cards: dict[str, dict] = {}

    blocks = re.split(r'<dl\s+class="modalCol"\s+id="([A-Z0-9-]+)"', html)
    for i in range(1, len(blocks), 2):
        card_id = blocks[i]
        content = blocks[i + 1] if i + 1 < len(blocks) else ""

        name_m = re.search(r'<div\s+class="cardName">([^<]+)</div>', content)
        name_ja = name_m.group(1).strip() if name_m else None

        text_m = re.search(
            r'<div\s+class="text"><h3>[^<]+</h3>(.*?)</div>',
            content,
            re.DOTALL,
        )
        if text_m:
            raw_text = text_m.group(1)
            effect_ja = re.sub(r"<[^>]+>", "", raw_text).strip()
        else:
            effect_ja = None

        if name_ja:
            cards[card_id] = {"name_ja": name_ja, "effect_text_ja": effect_ja}

    return cards


async def run():
    print("シリーズ一覧を取得中...")
    series_map = _fetch_series_map()
    print(f"  {len(series_map)} シリーズ取得")

    total_updated = 0
    skipped = 0

    # JP サイトの全シリーズ + プロモページを処理する
    # UPDATE は id 一致ベースなので DB に存在しないカードは 0 件更新となり安全。
    EXTRA_PAGES = {
        "PROMO": "550901",  # P-* プロモカード
        "FAMILY": "550701",  # ファミリーデッキセット
    }
    all_series = {**series_map, **EXTRA_PAGES}

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA journal_mode=WAL")

        for set_code, series_id in sorted(all_series.items()):
            print(f"取得中: {set_code} (id={series_id})...", end=" ", flush=True)
            try:
                cards = _fetch_series_cards(series_id)
            except Exception as e:
                print(f"ERROR: {e}")
                continue

            count = 0
            for card_id, data in cards.items():
                cur = await db.execute(
                    "UPDATE cards SET name_ja=?, effect_text_ja=? WHERE id=? AND name_ja IS NULL",
                    [data["name_ja"], data["effect_text_ja"], card_id],
                )
                count += cur.rowcount

            await db.commit()
            total_updated += count
            print(f"{count}枚更新 ({len(cards)}件取得)")

    print(f"\n完了: {total_updated}枚更新")


if __name__ == "__main__":
    asyncio.run(run())
