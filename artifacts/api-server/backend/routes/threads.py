from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..db import get_db
from ..models import Handoff
from ..schemas import ThreadInfo
from ..auth import verify_token

router = APIRouter()


@router.get("/threads", response_model=List[ThreadInfo])
async def list_threads(
    db: Session = Depends(get_db),
    _token: str = Depends(verify_token),
):
    rows = (
        db.query(
            Handoff.thread_name,
            func.count(Handoff.id).label("handoff_count"),
            func.max(Handoff.written_at).label("last_updated"),
        )
        .group_by(Handoff.thread_name)
        .order_by(func.max(Handoff.written_at).desc())
        .all()
    )
    return [
        ThreadInfo(
            thread_name=row.thread_name,
            handoff_count=row.handoff_count,
            last_updated=row.last_updated,
        )
        for row in rows
    ]
