@echo off
title SKN23-4th-2TEAM Unified Start
echo =====================================================
echo         SKN23-4th-2TEAM Unified Start Script         
echo =====================================================

echo [0/6] 🚨 Terminating existing zombie/orphan processes...
FOR /F "tokens=5" %%a IN ('netstat -aon ^| findstr :15432') DO taskkill /F /PID %%a >nul 2>&1
FOR /F "tokens=5" %%a IN ('netstat -aon ^| findstr :8000') DO taskkill /F /PID %%a >nul 2>&1
FOR /F "tokens=5" %%a IN ('netstat -aon ^| findstr :8001') DO taskkill /F /PID %%a >nul 2>&1
FOR /F "tokens=5" %%a IN ('netstat -aon ^| findstr :5173') DO taskkill /F /PID %%a >nul 2>&1
FOR /F "tokens=5" %%a IN ('netstat -aon ^| findstr :5174') DO taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak > nul

echo [1/6] 🧹 Clearing Python and Vite caches...
FOR /d /r . %%d IN ("__pycache__") DO @IF EXIST "%%d" rd /s /q "%%d" >nul 2>&1
IF EXIST "frontend_admin\node_modules\.vite" rd /s /q "frontend_admin\node_modules\.vite" >nul 2>&1
IF EXIST "frontend_worker\node_modules\.vite" rd /s /q "frontend_worker\node_modules\.vite" >nul 2>&1
timeout /t 1 /nobreak > nul

echo [2/6] 🚀 Starting SSH Tunnel (New Window)...
start "SSH Tunnel" cmd /c "poetry run python run_tunnel.py"
timeout /t 4 /nobreak > nul

echo [3/6] 🚀 Starting Django Backend Hub (Port 8000)...
cd backend_hub
start "Django Backend Hub" cmd /c "poetry run python manage.py runserver 8000"
cd ..
timeout /t 4 /nobreak > nul

echo [4/6] 🚀 Starting FastAPI Worker API (Port 8001)...
cd backend_worker_api
start "FastAPI Worker API" cmd /k "poetry run uvicorn app.main:app --port 8001 --reload"
cd ..
timeout /t 4 /nobreak > nul

echo [5/6] 🚀 Starting Admin Dashboard...
cd frontend_admin
start "Admin Dashboard" cmd /k "npm run dev"
cd ..
timeout /t 3 /nobreak > nul

echo [6/6] 🚀 Starting Worker Dashboard...
cd frontend_worker
start "Worker Dashboard" cmd /k "npm run dev -- --host"
cd ..

echo =====================================================
echo  ✅ All services started successfully!
echo  - SSH Tunnel: 127.0.0.1:15432
echo  - Django Hub: http://localhost:8000
echo  - FastAPI   : http://localhost:8001
echo  - Admin UI  : (See terminal output for port)
echo  - Worker UI : (See terminal output for port)
echo =====================================================
echo Keep this terminal open. Close the child windows to stop individual services.
pause
