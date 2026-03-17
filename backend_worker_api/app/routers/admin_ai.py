from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging

router = APIRouter(prefix='/admin-ai', tags=['admin-ai'])
logger = logging.getLogger("uvicorn.error")

class AnalysisRequest(BaseModel):
    log_ids: List[int]
    query: Optional[str] = "선택된 에러 로그들의 공통적인 원인과 조치 방법을 요약해줘."

class AnalysisResponse(BaseModel):
    summary: str
    recommendations: List[str]
    affected_components: List[str]

@router.post('/analyze', response_model=AnalysisResponse)
async def analyze_logs(req: AnalysisRequest):
    """
    관리자가 선택한 여러 에러 로그를 분석하여 종합 리포트를 생성합니다.
    실제 구현에서는 여기서 DB에서 로그를 조회하고 LLM(LangGraph/LangChain)을 호출합니다.
    """
    if not req.log_ids:
        raise HTTPException(status_code=400, detail="분석할 로그 ID가 없습니다.")

    logger.info(f"Admin AI Analysis requested for logs: {req.log_ids}")

    # Mock implementation for LLM response
    return AnalysisResponse(
        summary=f"{len(req.log_ids)}개의 로그 분석 결과, 주요 원인은 시스템 과부하로 인한 타임아웃으로 보입니다.",
        recommendations=[
            "서버 리소스 모니터링 강화",
            "동시 접속자 제한 설정 검토",
            "에러 발생 지점의 재시도 로직 최적화"
        ],
        affected_components=["API Gateway", "Database Connector"]
    )

class ManagerAskRequest(BaseModel):
    question: str
    language: str = "ko"

@router.get('/briefing')
async def get_briefing(language: str = "ko"):
    """
    관리자용 자동 브리핑을 생성합니다 (라인 가동률, 주요 에러 등).
    """
    from core.manager_core import generate_manager_briefing
    try:
        # manager_core에서 생성한 비동기 함수 호출
        return await generate_manager_briefing(language=language)
    except Exception as e:
        logger.error(f"Error in generate_manager_briefing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/ask')
async def ask_manager(req: ManagerAskRequest):
    """
    관리자의 자연어 질문에 대해 분석하여 답변을 생성합니다.
    """
    from core.manager_core import answer_manager_question
    try:
        return await answer_manager_question(question=req.question, language=req.language)
    except Exception as e:
        logger.error(f"Error in answer_manager_question: {e}")
        raise HTTPException(status_code=500, detail=str(e))

