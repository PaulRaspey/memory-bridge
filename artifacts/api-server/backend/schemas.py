from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from enum import Enum


class EnergyLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    DRAINED = "drained"


class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNCERTAIN = "uncertain"


class ActiveWorkItem(BaseModel):
    title: str
    current_state: str
    next_action: str
    blockers: Optional[List[str]] = None


class Decision(BaseModel):
    decision: str
    reasoning: str
    alternatives_considered: Optional[List[str]] = None


class OpenQuestion(BaseModel):
    question: str
    context: str
    tentative_lean: Optional[str] = None


class ContextItem(BaseModel):
    label: str
    value: str
    why_it_matters: str


class EmotionalState(BaseModel):
    energy: EnergyLevel
    confidence: ConfidenceLevel
    frustrations: Optional[List[str]] = None
    wins: Optional[List[str]] = None
    note_to_next_self: Optional[str] = None


class HandoffCreate(BaseModel):
    handoff_id: Optional[str] = None
    thread_name: str
    written_at: Optional[datetime] = None
    session_summary: str
    active_work: Optional[List[ActiveWorkItem]] = None
    decisions_made: Optional[List[Decision]] = None
    open_questions: Optional[List[OpenQuestion]] = None
    context_to_preserve: Optional[List[ContextItem]] = None
    emotional_state: Optional[EmotionalState] = None
    do_not_forget: Optional[List[str]] = None
    next_session_prompt: Optional[str] = None


class HandoffUpdate(BaseModel):
    thread_name: Optional[str] = None
    session_summary: Optional[str] = None
    active_work: Optional[List[ActiveWorkItem]] = None
    decisions_made: Optional[List[Decision]] = None
    open_questions: Optional[List[OpenQuestion]] = None
    context_to_preserve: Optional[List[ContextItem]] = None
    emotional_state: Optional[EmotionalState] = None
    do_not_forget: Optional[List[str]] = None
    next_session_prompt: Optional[str] = None


class HandoffResponse(BaseModel):
    handoff_id: str
    thread_name: str
    written_at: datetime
    session_summary: str
    active_work: Optional[List[ActiveWorkItem]] = None
    decisions_made: Optional[List[Decision]] = None
    open_questions: Optional[List[OpenQuestion]] = None
    context_to_preserve: Optional[List[ContextItem]] = None
    emotional_state: Optional[EmotionalState] = None
    do_not_forget: Optional[List[str]] = None
    next_session_prompt: Optional[str] = None
    next_session_prompt_url: Optional[str] = None

    model_config = {"from_attributes": True}


class ThreadInfo(BaseModel):
    thread_name: str
    handoff_count: int
    last_updated: datetime
