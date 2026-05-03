from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Handoff

router = APIRouter()


@router.get("/p/{handoff_id}/prompt", response_class=PlainTextResponse)
async def get_public_prompt(
    handoff_id: str,
    db: Session = Depends(get_db),
):
    handoff = db.query(Handoff).filter(Handoff.id == handoff_id).first()
    if not handoff:
        raise HTTPException(404, "Handoff not found")
    if not handoff.next_session_prompt:
        raise HTTPException(404, "No next_session_prompt for this handoff")
    return PlainTextResponse(
        content=handoff.next_session_prompt,
        headers={"Cache-Control": "private, no-store"},
    )
