@echo off
chcp 65001 >nul 2>&1
title SKN23-4th-2TEAM Unified Start
echo =====================================================
echo         SKN23-4th-2TEAM Unified Start Script
echo =====================================================

:: ─── [0/6] 좀비 프로세스 종료 ─────────────────────────────
echo [0/6] Terminating existing zombie/orphan processes...
FOR /F "tokens=5 delims= " %%a IN ('netstat -aon ^| findstr ":15432 " 2^>nul') DO (
    IF NOT "%%a"=="0" taskkill /F /PID %%a >nul 2>&1
)
FOR /F "tokens=5 delims= " %%a IN ('netstat -aon ^| findstr ":8000 " 2^>nul') DO (
    IF NOT "%%a"=="0" taskkill /F /PID %%a >nul 2>&1
)
FOR /F "tokens=5 delims= " %%a IN ('netstat -aon ^| findstr ":8001 " 2^>nul') DO (
    IF NOT "%%a"=="0" taskkill /F /PID %%a >nul 2>&1
)
FOR /F "tokens=5 delims= " %%a IN ('netstat -aon ^| findstr ":5173 " 2^>nul') DO (
    IF NOT "%%a"=="0" taskkill /F /PID %%a >nul 2>&1
)
FOR /F "tokens=5 delims= " %%a IN ('netstat -aon ^| findstr ":5174 " 2^>nul') DO (
    IF NOT "%%a"=="0" taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

:: ─── [0.5/6] Poetry 의존성 동기화 ────────────────────────────
echo [0.5/6] Synchronizing dependencies (Poetry)...
poetry install --no-root
IF ERRORLEVEL 1 (
    echo [ERROR] poetry install failed. Make sure Poetry is installed and pyproject.toml is valid.
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul

:: ─── [1/6] 캐시 정리 ──────────────────────────────────────────
echo [1/6] Clearing Python and Vite caches...
FOR /d /r . %%d IN ("__pycache__") DO (
    IF EXIST "%%d" rd /s /q "%%d" >nul 2>&1
)
IF EXIST "frontend_admin\node_modules\.vite" rd /s /q "frontend_admin\node_modules\.vite" >nul 2>&1
IF EXIST "frontend_worker\node_modules\.vite" rd /s /q "frontend_worker\node_modules\.vite" >nul 2>&1
timeout /t 1 /nobreak >nul

:: ─── [2/6] SSH 터널 시작 ──────────────────────────────────────
echo [2/6] Starting SSH Tunnel (Background)...
start "SSH Tunnel" cmd /c "poetry run python run_tunnel.py"
timeout /t 6 /nobreak >nul

:: ─── [2.5/6] AI 모델 & BM25 캐시 사전 로딩 (동기) ──────────────
echo [2.5/6] Pre-heating AI Models ^& BM25 Cache...
poetry run python -c "import sys; sys.path.insert(0,'backend_ai'); from core.reranker import load_reranker_singleton; from core.retriever import refresh_bm25_index; print('-> Downloading/Loading Reranker Cross-Encoder (if needed)...'); load_reranker_singleton(); print('-> Rebuilding BM25 Sparse Index...'); refresh_bm25_index(); print('-> AI Cache Pre-heat Complete.')"
IF ERRORLEVEL 1 (
    echo [WARN] AI pre-heat step failed - continuing anyway...
)

:: ─── [3/6] Django Backend Hub (Port 8000) ────────────────────
echo [3/6] Starting Django Backend Hub (Port 8000)...
start "Django Backend Hub" cmd /k "cd /d "%~dp0backend_hub" && poetry run python manage.py runserver 8000"
timeout /t 4 /nobreak >nul

:: ─── [4/6] FastAPI Worker API (Port 8001) ────────────────────
echo [4/6] Starting FastAPI Worker API (Port 8001)...
start "FastAPI Worker API" cmd /k "cd /d "%~dp0backend_worker_api" && poetry run uvicorn app.main:app --port 8001 --reload"
timeout /t 4 /nobreak >nul

:: ─── [5/6] Admin Dashboard (Vite) ───────────────────────────
echo [5/6] Starting Admin Dashboard (Vite)...
start "Admin Dashboard" cmd /k "cd /d "%~dp0frontend_admin" && npm run dev"
timeout /t 3 /nobreak >nul

:: ─── [6/6] Worker Dashboard (Vite) ──────────────────────────
echo [6/6] Starting Worker Dashboard (Vite)...
start "Worker Dashboard" cmd /k "cd /d "%~dp0frontend_worker" && npm run dev -- --host"

echo =====================================================
echo  All services started successfully!
echo  - SSH Tunnel: 127.0.0.1:15432
echo  - Django Hub: http://localhost:8000
echo  - FastAPI   : http://localhost:8001
echo  - Admin UI  : (See Admin Dashboard window)
echo  - Worker UI : (See Worker Dashboard window)
echo =====================================================
echo Keep this terminal open. Close the child windows to stop individual services.
pause
