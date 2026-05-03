import json
from sqlalchemy import Column, String, DateTime, Text
from .db import Base


class Handoff(Base):
    __tablename__ = "handoffs"

    id = Column(String(50), primary_key=True)
    thread_name = Column(String(255), nullable=False, index=True)
    written_at = Column(DateTime(timezone=True), nullable=False, index=True)
    payload_json = Column(Text, nullable=False)
    next_session_prompt = Column(Text, nullable=True)

    def get_payload(self) -> dict:
        return json.loads(self.payload_json)

    def set_payload(self, payload: dict):
        self.payload_json = json.dumps(payload, default=str)
