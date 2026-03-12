#!/bin/bash

echo "====================================================="
echo "        SKN23-4th-2TEAM Unified Start Script         "
echo "====================================================="

echo "[0/6] 🚨 Terminating existing zombie/orphan processes..."
lsof -ti:15432 | xargs kill -9 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:5174 | xargs kill -9 2>/dev/null
pkill -f run_tunnel.py 2>/dev/null
sleep 2

echo "[1/6] 🧹 Clearing Python and Vite caches..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
rm -rf frontend_admin/node_modules/.vite 2>/dev/null
rm -rf frontend_worker/node_modules/.vite 2>/dev/null
sleep 1

echo "[2/6] 🚀 Starting SSH Tunnel (Background)..."
poetry run python run_tunnel.py &
TUNNEL_PID=$!
sleep 4

echo "[3/6] 🚀 Starting Django Backend Hub (Port 8000)..."
(cd backend_hub && poetry run python manage.py runserver 8000) &
DJANGO_PID=$!
sleep 4

echo "[4/6] 🚀 Starting FastAPI Worker API (Port 8001)..."
(cd backend_worker_api && poetry run uvicorn app.main:app --port 8001 --reload) &
FASTAPI_PID=$!
sleep 4

echo "[5/6] 🚀 Starting Admin Dashboard (Vite)..."
(cd frontend_admin && npm run dev) &
ADMIN_PID=$!
sleep 3

echo "[6/6] 🚀 Starting Worker Dashboard (Vite)..."
(cd frontend_worker && npm run dev -- --host) &
WORKER_PID=$!

echo "====================================================="
echo " ✅ All services started successfully!"
echo " - SSH Tunnel: 127.0.0.1:15432"
echo " - Django Hub: http://localhost:8000"
echo " - FastAPI   : http://localhost:8001"
echo " - Admin UI  : (See terminal output for port)"
echo " - Worker UI : (See terminal output for port)"
echo "====================================================="
echo "Press [CTRL+C] to stop all services..."

# Wait for all background processes
trap "echo '🛑 Stopping all services...'; kill $TUNNEL_PID $DJANGO_PID $FASTAPI_PID $ADMIN_PID $WORKER_PID; exit" SIGINT SIGTERM
wait
