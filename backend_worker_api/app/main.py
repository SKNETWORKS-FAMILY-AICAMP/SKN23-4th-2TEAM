import json
import os
import sys
import traceback
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

# AI 로직 경로 추가
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(BASE_DIR))
AI_CORE_DIR = os.path.join(PROJECT_ROOT, "backend_ai")
if AI_CORE_DIR not in sys.path:
    sys.path.append(AI_CORE_DIR)

# 라우터 임포트 (경로 주의: app.routers 형태여야 함)
try:
    from app.routers.consultations import router as consultation_router
    from app.routers.admin_ai import router as admin_ai_router
except ImportError:
    from routers.consultations import router as consultation_router
    from routers.admin_ai import router as admin_ai_router

logger = logging.getLogger("uvicorn.error")

# 한글 깨짐 방지 및 JSON 응답 클래스
class AsciiJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        return json.dumps(
            content,
            ensure_ascii=False,  # 한글이 유니코드로 변하지 않게 설정
            allow_nan=False,
            indent=None,
            separators=(",", ":"),
        ).encode("utf-8")

app = FastAPI(
    title='WELD-BOT Worker API',
    version='1.0.0',
    debug=True,
    default_response_class=AsciiJSONResponse,
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# [핵심] 라우터 등록 - prefix='/api/v1' 설정
# consultations.py 내부의 prefix='/consultations'와 합쳐져 
# 최종 경로는 /api/v1/consultations/... 가 됩니다.
app.include_router(consultation_router, prefix='/api/v1')
app.include_router(admin_ai_router, prefix='/api/v1')

@app.middleware("http")
async def capture_all_exceptions(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        logger.exception("Middleware caught exception: %s", exc)
        return AsciiJSONResponse(
            status_code=500,
            content={
                "detail": "internal_server_error",
                "error": str(exc),
                "path": request.url.path,
                "type": type(exc).__name__,
                "trace": traceback.format_exc(),
            },
        )

@app.get('/')
def root():
    return {'status': 'ok', 'service': 'WELD-BOT Worker API'}

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation Error at %s: %s", request.url.path, exc.errors())
    return AsciiJSONResponse(
        status_code=422,
        content={"detail": "validation_error", "errors": exc.errors()},
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled Exception: %s", exc)
    return AsciiJSONResponse(
        status_code=500,
        content={
            "detail": "internal_server_error",
            "error": str(exc),
            "path": request.url.path,
        },
    )