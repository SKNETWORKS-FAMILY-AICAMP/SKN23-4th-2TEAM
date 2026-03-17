from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class Actor(str, Enum):
    USER = 'user'
    LLM = 'llm'
    SYSTEM = 'system'


class ResponseType(str, Enum):
    OVERALL = 'overall'
    CHECKLIST = 'checklist'
    DIAGNOSIS = 'diagnosis'


class Language(str, Enum):
    KO = 'ko'
    EN = 'en'
    UZ = 'uz'


class SessionStatus(str, Enum):
    ONGOING = 'ongoing'
    RESOLVED = 'resolved'
    UNRESOLVED = 'unresolved'
    ABANDONED = 'abandoned'


class AssistantPayload(BaseModel):
    actor: Literal['llm'] = 'llm'
    response_type: ResponseType
    message: str
    checklist: Optional[List[Any]] = None
    has_unchecked_items: Optional[bool] = None


class ConsultationResponse(BaseModel):
    status: Literal['ok', 'error'] = 'ok'
    session_id: int
    step_no: int
    next_response_type: Optional[ResponseType] = None
    assistant: Optional[AssistantPayload] = None
    session_status: SessionStatus
    request_id: str


class StartConsultationRequest(BaseModel):
    request_id: UUID
    language: Language = Language.KO
    device_id: str = Field(..., min_length=1)
    error_code: str = Field(..., min_length=1)


class ConsultationEventRequest(BaseModel):
    request_id: UUID
    actor: Actor
    step_no: int = Field(..., gt=0)
    language: Language = Language.KO
    response_type: Optional[ResponseType] = None
    selected_choice: Optional[Literal['O', 'X']] = None
    message: str = Field(..., min_length=1)
    is_resolved: Optional[bool] = None
    payload: Optional[Dict[str, Any]] = None


class StartConsultationResponse(ConsultationResponse):
    pass


class ConsultationStateResponse(BaseModel):
    session_id: int
    status: SessionStatus
    language: Language
    device_id: str
    line: str
    error_code: Optional[str] = None
    latest_response_type: Optional[ResponseType] = None
    step_no: Optional[int] = None
    updated_at: datetime


class HistoryEventItem(BaseModel):
    event_no: int
    actor: Actor
    response_type: Optional[ResponseType] = None
    selected_choice: Optional[Literal['O', 'X']] = None
    message: str
    created_at: datetime


class HistoryResponse(BaseModel):
    session_id: int
    count: int
    events: List[HistoryEventItem]


class TranslateTextRequest(BaseModel):
    text: str
    target_lang: str
