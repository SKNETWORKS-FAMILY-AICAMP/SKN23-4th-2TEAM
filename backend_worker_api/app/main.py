import json
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

from app.routers.consultations import router as consultation_router

logger = logging.getLogger("uvicorn.error")


class AsciiJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        return json.dumps(
            content,
            ensure_ascii=True,
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(consultation_router, prefix='/api/v1')


@app.middleware("http")
async def capture_all_exceptions(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:  # pragma: no cover
        logger.exception("Unhandled middleware exception: %s", exc)
        return AsciiJSONResponse(
            status_code=500,
            content={
                "detail": "internal_server_error",
                "error": str(exc),
                "path": str(request.url.path),
                "type": type(exc).__name__,
                "trace": traceback.format_exc(),
            },
        )


@app.get('/')
def root():
    return {'status': 'ok', 'service': 'frontend_worker api'}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return AsciiJSONResponse(
        status_code=500,
        content={
            "detail": "internal_server_error",
            "error": str(exc),
            "path": str(request.url.path),
            "type": type(exc).__name__,
            "trace": traceback.format_exc(),
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Request validation error at %s: %s", request.url.path, exc.errors())
    return AsciiJSONResponse(
        status_code=422,
        content={"detail": "validation_error", "errors": exc.errors()},
    )
