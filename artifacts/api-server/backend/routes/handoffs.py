import json
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Handoff
from ..schemas import HandoffCreate, HandoffUpdate, HandoffResponse
from ..auth import verify_token
from ..ids import generate_handoff_id
from ..utils import get_base_url, render_as_prompt

router = APIRouter()


def _build_response(handoff: Handoff, base_url: str = "") -> HandoffResponse:
    payload = handoff.get_payload()
    url = f"{base_url}/p/{handoff.id}/prompt" if base_url else None
    return HandoffResponse(
        handoff_id=handoff.id,
        thread_name=handoff.thread_name,
        written_at=handoff.written_at,
        session_summary=payload.get("session_summary", ""),
        active_work=payload.get("active_work"),
        decisions_made=payload.get("decisions_made"),
        open_questions=payload.get("open_questions"),
        context_to_preserve=payload.get("context_to_preserve"),
        emotional_state=payload.get("emotional_state"),
        do_not_forget=payload.get("do_not_forget"),
        next_session_prompt=handoff.next_session_prompt,
        next_session_prompt_url=url,
    )


@router.post("/handoffs", response_model=HandoffResponse, status_code=201)
async def create_handoff(
    request: Request,
    data: HandoffCreate,
    db: Session = Depends(get_db),
    _token: str = Depends(verify_token),
):
    handoff_id = data.handoff_id or generate_handoff_id()
    written_at = data.written_at or datetime.now(timezone.utc)

    payload = data.model_dump(
        exclude={"handoff_id", "written_at", "next_session_prompt"},
        exclude_none=True,
    )

    handoff = Handoff(
        id=handoff_id,
        thread_name=data.thread_name,
        written_at=written_at,
        payload_json=json.dumps(payload, default=str),
        next_session_prompt=data.next_session_prompt,
    )
    db.add(handoff)
    db.commit()
    db.refresh(handoff)

    return _build_response(handoff, get_base_url(request))


@router.get("/handoffs", response_model=List[HandoffResponse])
async def list_handoffs(
    thread_name: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _token: str = Depends(verify_token),
):
    q = db.query(Handoff)
    if thread_name:
        q = q.filter(Handoff.thread_name == thread_name)
    rows = q.order_by(Handoff.written_at.desc()).offset(offset).limit(limit).all()
    return [_build_response(h) for h in rows]


# IMPORTANT: /latest must be defined BEFORE /{handoff_id}
@router.get("/handoffs/latest", response_model=HandoffResponse)
async def get_latest_handoff(
    request: Request,
    thread_name: str = Query(...),
    db: Session = Depends(get_db),
    _token: str = Depends(verify_token),
):
    handoff = (
        db.query(Handoff)
        .filter(Handoff.thread_name == thread_name)
        .order_by(Handoff.written_at.desc())
        .first()
    )
    if not handoff:
        raise HTTPException(404, f"No handoffs found for thread '{thread_name}'")
    return _build_response(handoff, get_base_url(request))


@router.get("/handoffs/{handoff_id}/as-prompt", response_class=PlainTextResponse)
async def get_handoff_as_prompt(
    request: Request,
    handoff_id: str,
    db: Session = Depends(get_db),
    _token: str = Depends(verify_token),
):
    handoff = db.query(Handoff).filter(Handoff.id == handoff_id).first()
    if not handoff:
        raise HTTPException(404, "Handoff not found")
    resp = _build_response(handoff, get_base_url(request))
    return render_as_prompt(resp)


@router.get("/handoffs/{handoff_id}", response_model=HandoffResponse)
async def get_handoff(
    request: Request,
    handoff_id: str,
    db: Session = Depends(get_db),
    _token: str = Depends(verify_token),
):
    handoff = db.query(Handoff).filter(Handoff.id == handoff_id).first()
    if not handoff:
        raise HTTPException(404, "Handoff not found")
    return _build_response(handoff, get_base_url(request))


@router.put("/handoffs/{handoff_id}", response_model=HandoffResponse)
async def update_handoff(
    request: Request,
    handoff_id: str,
    data: HandoffUpdate,
    db: Session = Depends(get_db),
    _token: str = Depends(verify_token),
):
    handoff = db.query(Handoff).filter(Handoff.id == handoff_id).first()
    if not handoff:
        raise HTTPException(404, "Handoff not found")

    update_data = data.model_dump(exclude_none=True)
    payload = handoff.get_payload()

    if "thread_name" in update_data:
        handoff.thread_name = update_data.pop("thread_name")
    if "next_session_prompt" in update_data:
        handoff.next_session_prompt = update_data.pop("next_session_prompt")

    payload.update({k: v for k, v in update_data.items()})
    handoff.payload_json = json.dumps(payload, default=str)

    db.commit()
    db.refresh(handoff)
    return _build_response(handoff, get_base_url(request))


@router.delete("/handoffs/{handoff_id}")
async def delete_handoff(
    handoff_id: str,
    db: Session = Depends(get_db),
    _token: str = Depends(verify_token),
):
    handoff = db.query(Handoff).filter(Handoff.id == handoff_id).first()
    if not handoff:
        raise HTTPException(404, "Handoff not found")
    db.delete(handoff)
    db.commit()
    return {"deleted": handoff_id}
