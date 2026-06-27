from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, Response
from pathlib import Path
import httpx

router = APIRouter(tags=["images"])

CACHE_DIR = Path(__file__).parent.parent / "cache"
MISSING_DIR = CACHE_DIR / "_missing"
IMAGE_BASE_URL = "https://www.onepiece-cardgame.com/images/cardlist/card"

# 7 days — card images don't change after release
_CACHE_HEADERS = {"Cache-Control": "public, max-age=604800, immutable"}


@router.get("/image/{card_id}")
async def get_image(card_id: str):
    safe_id = card_id.replace("/", "").replace("..", "")
    cache_path = CACHE_DIR / f"{safe_id}.png"
    missing_path = MISSING_DIR / f"{safe_id}.404"

    # Serve from disk cache
    if cache_path.exists():
        return FileResponse(cache_path, media_type="image/png", headers=_CACHE_HEADERS)

    # Previously confirmed missing — return 404 immediately (no external fetch)
    if missing_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    # Fetch from upstream
    url = f"{IMAGE_BASE_URL}/{safe_id}.png"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Failed to fetch image")

    if response.status_code != 200:
        # Record as missing so we skip upstream next time
        MISSING_DIR.mkdir(parents=True, exist_ok=True)
        missing_path.touch()
        raise HTTPException(status_code=404, detail="Image not found")

    CACHE_DIR.mkdir(exist_ok=True)
    cache_path.write_bytes(response.content)
    return FileResponse(cache_path, media_type="image/png", headers=_CACHE_HEADERS)
