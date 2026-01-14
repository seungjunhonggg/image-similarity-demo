from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .routers import demo

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Image Similarity Demo")

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
app.include_router(demo.router)


@app.get("/healthz")
def healthz():
    return {"ok": True}
