from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import httpx

router = APIRouter(tags=["images"])

CACHE_DIR = Path(__file__).parent.parent / "cache"
IMAGE_BASE_URL = "https://www.onepiece-cardgame.com/images/cardlist/card"


@router.get("/image/{card_id}")
async def get_image(card_id: str):
    safe_id = card_id.replace("/", "").replace("..", "")
    cache_path = CACHE_DIR / f"{safe_id}.png"

    if cache_path.exists():
        return FileResponse(cache_path, media_type="image/png")

    url = f"{IMAGE_BASE_URL}/{safe_id}.png"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Image not found")

        CACHE_DIR.mkdir(exist_ok=True)
        cache_path.write_bytes(response.content)
        return FileResponse(cache_path, media_type="image/png")

    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Failed to fetch image")
