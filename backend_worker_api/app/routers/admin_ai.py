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
