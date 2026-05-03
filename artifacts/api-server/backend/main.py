import json
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .db import init_db
from .routes import handoffs, threads, public

app = FastAPI(title="Memory Bridge API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    init_db()


@app.get("/v1/healthz")
async def health():
    return {"status": "ok"}


@app.get("/v1/config")
async def config():
    """Returns non-secret config info for the settings page."""
    domains = os.environ.get("REPLIT_DOMAINS", "")
    base_url = f"https://{domains.split(',')[0].strip()}" if domains else ""
    return {"base_url": base_url}


app.include_router(handoffs.router, prefix="/v1")
app.include_router(threads.router, prefix="/v1")
app.include_router(public.router)
