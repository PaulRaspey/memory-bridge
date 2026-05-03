#!/usr/bin/env python3
"""Startup script for Memory Bridge API."""
import os
import time

port = int(os.environ.get("PORT", 8082))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

import uvicorn  # noqa: E402

uvicorn.run(
    "backend.main:app",
    host="0.0.0.0",
    port=port,
    reload=False,
    workers=1,
    loop="asyncio",
    http="h11",
    log_level="info",
    use_colors=False,
)
